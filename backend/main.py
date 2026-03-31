from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import socketio, asyncio, cv2
import numpy as np, base64, time, os, shutil
from ultralytics import YOLO
from dotenv import load_dotenv
from qwen import analyze_frame

load_dotenv()

# ── App setup ──────────────────────────────
app = FastAPI()
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode="asgi",
    ping_timeout=120,
    ping_interval=25
)
combined_app = socketio.ASGIApp(sio, app)

app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

model = YOLO("yolov8n.pt")

SUSPICIOUS_CLASSES = ["knife", "scissors", "person", "bottle", "bat"]
CONFIDENCE_THRESHOLD = 0.35

# ── Helpers ────────────────────────────────
def frame_to_base64(frame) -> str:
    _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return base64.b64encode(buffer).decode("utf-8")

def send_whatsapp(analysis: dict):
    from twilio.rest import Client
    from datetime import datetime
    client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_TOKEN"))
    timestamp = datetime.now().strftime("%d/%m/%Y • %I:%M:%S %p")
    client.messages.create(
        from_="whatsapp:+14155238886",
        to=f"whatsapp:{os.getenv('POLICE_NUMBER')}",
        body=f"""🚨 *SURAKSHA AI — EMERGENCY ALERT* 🚨

🔴 *Threat Level:* {analysis['threat_tag']} ({analysis['threat_level']}/10)
📋 *Incident:* {analysis['activity']}
🔪 *Threat:* {analysis['detected_threat']}
⚡ *Action:* {analysis['recommended_action'].replace('_', ' ').upper()}

🕐 *Time:* {timestamp}
📍 *Location:* ____________________
📸 *Camera:* CAM_01 — Main Gate

— Suraksha AI | Team LogicLinks
_Automated alert • Do not reply_"""
    )

# ── Background video processing ───────────
async def _process_video_task(temp_path: str):
    """Runs in background so the HTTP request returns immediately."""
    try:
        cap = cv2.VideoCapture(temp_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        frame_interval = int(fps * 2)  # analyze 1 frame per 2 seconds

        frame_count = 0
        incidents = []
        highest_threat = None
        whatsapp_sent = False  # only send ONE alert

        await sio.emit("status", {"message": "Processing started...", "progress": 0})
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Progress update every 30 frames
            if frame_count % 30 == 0:
                progress = int((frame_count / total_frames) * 100) if total_frames else 0
                await sio.emit("progress", {"value": progress})

            # Skip frames — only analyze every 2 seconds
            if frame_count % frame_interval != 0:
                frame_count += 1
                continue

            # ── YOLO Detection ──
            results = model(
                frame,
                imgsz=320,
                conf=CONFIDENCE_THRESHOLD,
                verbose=False,
                device="cpu"
            )

            detected_objects = []
            person_detected = False

            for r in results:
                for box in r.boxes:
                    label = model.names[int(box.cls)]
                    conf = float(box.conf)
                    if label in SUSPICIOUS_CLASSES and conf > CONFIDENCE_THRESHOLD:
                        detected_objects.append({
                            "label": label,
                            "confidence": round(conf * 100, 1)
                        })
                    if label == "person":
                        person_detected = True

            # Only send to Qwen if something suspicious found
            if not detected_objects:
                frame_count += 1
                continue

            # ── Qwen Analysis via OpenRouter ──
            await sio.emit("status", {"message": f"Analyzing threat (frame {frame_count})..."})
            frame_b64 = frame_to_base64(frame)

            # Run the blocking API call in a thread so we don't block the event loop
            loop = asyncio.get_event_loop()
            analysis = await loop.run_in_executor(None, analyze_frame, frame_b64)

            # Build incident object
            incident = {
                "id": len(incidents) + 1,
                "timestamp": time.strftime("%H:%M:%S"),
                "frame_b64": frame_b64,
                "detected_objects": detected_objects,
                "activity": analysis["activity"],
                "threat_level": analysis["threat_level"],
                "threat_tag": analysis["threat_tag"],
                "detected_threat": analysis["detected_threat"],
                "recommended_action": analysis["recommended_action"]
            }

            incidents.append(incident)

            # Track highest threat
            if highest_threat is None or analysis["threat_level"] > highest_threat["threat_level"]:
                highest_threat = incident

            # Push to frontend LIVE
            await sio.emit("incident", incident)
            print(f"✅ Incident #{incident['id']}: {incident['threat_tag']} — {incident['activity']}")

            # ── INSTANT WhatsApp alert if threat >= 6 ──
            if not whatsapp_sent and analysis["threat_level"] >= 6:
                try:
                    send_whatsapp(incident)
                    whatsapp_sent = True
                    print(f"📱 WhatsApp SENT immediately! Threat: {analysis['threat_tag']} ({analysis['threat_level']}/10)")
                    await sio.emit("status", {"message": "🚨 POLICE ALERTED VIA WHATSAPP!"})
                except Exception as e:
                    print(f"WhatsApp error: {e}")

            # Small delay so frontend can render
            await asyncio.sleep(0.3)

            frame_count += 1

        cap.release()

        # Clean up temp file
        try:
            os.remove(temp_path)
        except:
            pass

        # Final summary to frontend
        await sio.emit("complete", {
            "total_incidents": len(incidents),
            "highest_threat": highest_threat,
            "whatsapp_sent": whatsapp_sent
        })
        print(f"🏁 Processing complete — {len(incidents)} incidents found")

    except Exception as e:
        print(f"❌ Processing error: {e}")
        await sio.emit("complete", {
            "total_incidents": 0,
            "highest_threat": None,
            "whatsapp_sent": False,
            "error": str(e)
        })

# ── Main upload route (returns immediately) ──
@app.post("/upload")
async def process_video(file: UploadFile = File(...)):
    # Save video temporarily
    temp_path = f"temp_{int(time.time())}.mp4"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Fire off the processing in the background
    asyncio.create_task(_process_video_task(temp_path))

    return JSONResponse({"success": True, "message": "Processing started in background"})

@app.post("/simulate")
async def simulate_threat():
    fake = {
        "id": 999,
        "timestamp": time.strftime("%H:%M:%S"),
        "frame_b64": "",
        "detected_objects": [{"label": "knife", "confidence": 87.3}],
        "activity": "Person holding sharp object threatening another individual near entrance gate",
        "threat_level": 9,
        "threat_tag": "CRITICAL",
        "detected_threat": "Knife / sharp weapon",
        "recommended_action": "emergency_response"
    }
    await sio.emit("incident", fake)
    return {"ok": True}

@app.get("/health")
def health():
    return {"status": "Suraksha AI running"}
