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

SUSPICIOUS_CLASSES = ["knife", "scissors", "person", "bottle", "bat",
                      "car", "truck", "motorcycle", "bicycle"]
CONFIDENCE_THRESHOLD = 0.35

# ── Helpers ────────────────────────────────
def frame_to_base64(frame) -> str:
    _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return base64.b64encode(buffer).decode("utf-8")



def classify_emergency(detected_objects):
    """Classify the type of emergency based on detections."""
    labels = [d["label"] for d in detected_objects]
    
    if any(l in ["knife", "scissors"] for l in labels) or "person" in labels:
        return "CRIME"
    
    return None

# ── WhatsApp alert messages per type ───────
WHATSAPP_TEMPLATES = {
    "CRIME": {
        "icon": "🚨",
        "title": "CRIME ALERT",
        "number_env": "POLICE_NUMBER"
    }
}

def send_whatsapp(analysis: dict):
    from twilio.rest import Client
    from datetime import datetime
    
    emergency_type = analysis.get("emergency_type", "CRIME")
    template = WHATSAPP_TEMPLATES.get(emergency_type, WHATSAPP_TEMPLATES["CRIME"])
    
    client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_TOKEN"))
    timestamp = datetime.now().strftime("%d/%m/%Y • %I:%M:%S %p")
    
    # Get the correct number for this emergency type
    to_number = os.getenv(template["number_env"]) or os.getenv("POLICE_NUMBER")
    
    action_text = analysis.get('recommended_action', 'emergency_response').replace('_', ' ').upper()
    
    client.messages.create(
        from_="whatsapp:+14155238886",
        to=f"whatsapp:{to_number}",
        body=f"""{template['icon']} *SURAKSHA AI — {template['title']}* {template['icon']}

🔴 *Threat Level:* {analysis['threat_tag']} ({analysis['threat_level']}/10)
📋 *Incident:* {analysis['activity']}
⚠️ *Threat:* {analysis['detected_threat']}
⚡ *Action:* {action_text}

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

            detected_objects = []
            emergency_type = None

            # ── STEP 1: YOLO Detection ──
            results = model(
                frame,
                imgsz=320,
                conf=CONFIDENCE_THRESHOLD,
                verbose=False,
                device="cpu"
            )

            for r in results:
                for box in r.boxes:
                    label = model.names[int(box.cls)]
                    conf = float(box.conf)
                    if label in SUSPICIOUS_CLASSES and conf > CONFIDENCE_THRESHOLD:
                        detected_objects.append({
                            "label": label,
                            "confidence": round(conf * 100, 1)
                        })
                        print(f"🎯 Suspect Object Detected! Type: {label.upper()} | Confidence: {round(conf * 100, 1)}%")

            # ── STEP 2: Classify emergency type ──
            emergency_type = classify_emergency(detected_objects)

            # Skip if no emergency detected
            if not emergency_type or not detected_objects:
                frame_count += 1
                continue

            # ── STEP 4: Qwen Analysis with type-specific prompt ──
            await sio.emit("status", {"message": f"Analyzing {emergency_type.lower()} threat (frame {frame_count})..."})
            frame_b64 = frame_to_base64(frame)

            # Run the blocking API call in a thread
            loop = asyncio.get_event_loop()
            analysis = await loop.run_in_executor(None, analyze_frame, frame_b64, emergency_type)

            # ── STEP 5: Build incident object with emergency_type ──
            incident = {
                "id": len(incidents) + 1,
                "timestamp": time.strftime("%H:%M:%S"),
                "emergency_type": emergency_type,
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
            type_icons = {"CRIME": "🚨"}
            print(f"✅ Incident #{incident['id']}: {type_icons.get(emergency_type, '⚠️')} {emergency_type} | {incident['threat_tag']} — {incident['activity']}")

            # ── EARLY WARNING: Alert after first 5 frames confirm threat ──
            if not whatsapp_sent:
                high_threat_count = sum(1 for inc in incidents if inc["threat_level"] >= 6)

                should_alert = False

                if analysis["threat_level"] >= 9:
                    should_alert = True
                    print(f"⚡ CRITICAL {emergency_type} detected — sending alert immediately!")
                elif len(incidents) >= 5 and high_threat_count >= 3:
                    should_alert = True
                    print(f"⚡ {high_threat_count}/{len(incidents)} frames show high threat — confirmed!")

                if should_alert:
                    try:
                        send_whatsapp(highest_threat)
                        whatsapp_sent = True
                        alert_type = highest_threat.get("emergency_type", "CRIME")
                        print(f"📱 WhatsApp SENT! {alert_type}: {highest_threat['threat_tag']} ({highest_threat['threat_level']}/10)")
                        await sio.emit("status", {"message": f"🚨 {alert_type} ALERT SENT VIA WHATSAPP!"})
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
        "emergency_type": "CRIME",
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
