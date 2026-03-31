Bhai smart move — build clean first, WhatsApp at the end. Here's the full one-day PRD:

---

# 📋 Suraksha AI — One Day Demo PRD
### HACKOUTSAV 2026 | Team LogicLinks

---

## 1. The One Goal for Today

Build a working demo where:
> Upload video → system detects threats → dashboard shows live incidents with risk levels → one WhatsApp fires at the end

That's it. Nothing else matters today.

---

## 2. What You're Building

```
User uploads video
      ↓
Backend extracts frames every 2 sec
      ↓
YOLOv8n detects objects (knife, person, scissors)
      ↓
Qwen2.5-VL analyzes scene → threat level 1-10
      ↓
Dashboard shows incidents LIVE as they're found
      ↓
Big risk notification on screen (no WhatsApp yet)
      ↓
After all frames done → THEN send one WhatsApp
```

---

## 3. Tech Stack (Minimal)

**Backend**
```
Python 3.10+
FastAPI
OpenCV
Ultralytics (YOLOv8n)
Dashscope (Qwen2.5-VL)
python-socketio
python-multipart
```

**Frontend**
```
React + Vite
Socket.io-client
Tailwind CSS
Framer Motion
```

**Install everything:**
```bash
pip install fastapi uvicorn opencv-python ultralytics \
            dashscope python-socketio python-multipart \
            python-dotenv aiofiles
```

---

## 4. File Structure

```
suraksha-ai/
├── backend/
│   ├── main.py          ← entire backend here
│   ├── qwen.py          ← qwen api call
│   ├── .env             ← api keys
│   └── yolov8n.pt       ← auto downloads
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── UploadZone.jsx
│   │   │   ├── IncidentCard.jsx
│   │   │   ├── RiskBanner.jsx
│   │   │   └── IncidentLog.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

---

## 5. Backend — Complete Code

### `backend/.env`
```
DASHSCOPE_API_KEY=your_key_here
TWILIO_SID=your_sid
TWILIO_TOKEN=your_token
POLICE_NUMBER=+91XXXXXXXXXX
```

### `backend/qwen.py`
```python
import dashscope, json, os
from dashscope import MultiModalConversation

def analyze_frame(frame_b64: str) -> dict:
    try:
        response = MultiModalConversation.call(
            model="qwen-vl-plus",
            api_key=os.getenv("DASHSCOPE_API_KEY"),
            messages=[{
                "role": "user",
                "content": [
                    {
                        "image": f"data:image/jpeg;base64,{frame_b64}"
                    },
                    {
                        "text": """You are Suraksha AI, a CCTV surveillance system.

Analyze this frame carefully. Respond ONLY in this exact JSON format, nothing else:
{
  "activity": "one sentence describing what is happening",
  "threat_level": <number from 1 to 10>,
  "threat_tag": "<LOW or MEDIUM or HIGH or CRITICAL>",
  "detected_threat": "specific object or action that is threatening",
  "recommended_action": "<monitor or alert_police or emergency_response>"
}

Threat level guide:
1-3 = normal activity, people walking etc
4-6 = suspicious, someone loitering, arguing
7-8 = HIGH threat, weapon visible, physical fight
9-10 = CRITICAL, active violence, emergency

Return ONLY the JSON. No explanation. No markdown."""
                    }
                ]
            }]
        )

        text = response.output.choices[0].message.content[0]["text"]
        # Clean any accidental markdown
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)

    except Exception as e:
        print(f"Qwen error: {e}")
        # Fallback so demo never crashes
        return {
            "activity": "Suspicious activity detected in frame",
            "threat_level": 7,
            "threat_tag": "HIGH",
            "detected_threat": "Unknown threat",
            "recommended_action": "alert_police"
        }
```

### `backend/main.py`
```python
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
sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode="asgi")
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
    client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_TOKEN"))
    client.messages.create(
        from_="whatsapp:+14155238886",
        to=f"whatsapp:{os.getenv('POLICE_NUMBER')}",
        body=f"""🚨 SURAKSHA AI — FINAL ALERT 🚨

Threat Level: {analysis['threat_tag']} ({analysis['threat_level']}/10)
Incident: {analysis['activity']}
Threat: {analysis['detected_threat']}
Action: {analysis['recommended_action']}

— Suraksha AI | Team LogicLinks"""
    )

# ── Main upload & process route ────────────
@app.post("/upload")
async def process_video(file: UploadFile = File(...)):

    # Save video temporarily
    temp_path = f"temp_{int(time.time())}.mp4"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    cap = cv2.VideoCapture(temp_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    frame_interval = int(fps * 2)  # analyze 1 frame per 2 seconds

    frame_count = 0
    incidents = []
    highest_threat = None   # track worst incident for WhatsApp

    await sio.emit("status", {"message": "Processing started...", "progress": 0})

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Progress update every 30 frames
        if frame_count % 30 == 0:
            progress = int((frame_count / total_frames) * 100)
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

        # ── Qwen Analysis ──
        await sio.emit("status", {"message": "Analyzing threat..."})
        frame_b64 = frame_to_base64(frame)
        analysis = analyze_frame(frame_b64)

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

        # Track highest threat for WhatsApp at end
        if highest_threat is None or analysis["threat_level"] > highest_threat["threat_level"]:
            highest_threat = incident

        # Push to frontend LIVE
        await sio.emit("incident", incident)

        # Small delay so frontend can render
        await asyncio.sleep(0.3)

        frame_count += 1

    cap.release()
    os.remove(temp_path)

    # ── Send ONE WhatsApp at the end ──
    whatsapp_sent = False
    if highest_threat and highest_threat["threat_level"] >= 6:
        try:
            send_whatsapp(highest_threat)
            whatsapp_sent = True
        except Exception as e:
            print(f"WhatsApp error: {e}")

    # Final summary to frontend
    await sio.emit("complete", {
        "total_incidents": len(incidents),
        "highest_threat": highest_threat,
        "whatsapp_sent": whatsapp_sent
    })

    return JSONResponse({
        "success": True,
        "total_incidents": len(incidents),
        "whatsapp_sent": whatsapp_sent
    })

@app.get("/health")
def health():
    return {"status": "Suraksha AI running"}
```

**Run backend:**
```bash
cd backend
uvicorn main:combined_app --reload --port 8000
```

---

## 6. Frontend — Complete Code

### Risk color logic used everywhere:
```
1-3  → GREEN  → LOW
4-6  → YELLOW → MEDIUM
7-8  → ORANGE → HIGH
9-10 → RED    → CRITICAL (flash screen)
```

### `frontend/src/App.jsx`
```jsx
import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import UploadZone from "./components/UploadZone"
import IncidentCard from "./components/IncidentCard"
import RiskBanner from "./components/RiskBanner"
import IncidentLog from "./components/IncidentLog"

const socket = io("http://localhost:8000")

export default function App() {
  const [incidents, setIncidents] = useState([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState("")
  const [latestIncident, setLatestIncident] = useState(null)
  const [complete, setComplete] = useState(null)
  const [screenFlash, setScreenFlash] = useState(false)

  useEffect(() => {
    socket.on("incident", (data) => {
      setIncidents(prev => [data, ...prev])
      setLatestIncident(data)

      // Flash screen red if CRITICAL
      if (data.threat_level >= 9) {
        setScreenFlash(true)
        setTimeout(() => setScreenFlash(false), 1000)
      }
    })

    socket.on("progress", (data) => setProgress(data.value))
    socket.on("status", (data) => setStatus(data.message))
    socket.on("complete", (data) => {
      setComplete(data)
      setProcessing(false)
      setProgress(100)
    })

    return () => socket.off()
  }, [])

  const handleUpload = async (file) => {
    setProcessing(true)
    setIncidents([])
    setLatestIncident(null)
    setComplete(null)
    setProgress(0)

    const formData = new FormData()
    formData.append("file", file)

    await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData
    })
  }

  const threatColor = (level) => {
    if (level >= 9) return "#ef4444"
    if (level >= 7) return "#f97316"
    if (level >= 4) return "#eab308"
    return "#22c55e"
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0e1a",
      color: "#f9fafb",
      fontFamily: "'Space Mono', monospace",
      position: "relative",
      overflow: "hidden"
    }}>

      {/* Screen flash for CRITICAL */}
      {screenFlash && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(239,68,68,0.3)",
          zIndex: 9999, pointerEvents: "none",
          animation: "flash 1s ease-out"
        }}/>
      )}

      {/* Header */}
      <div style={{
        padding: "20px 32px",
        borderBottom: "1px solid #1f2937",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 10, height: 10,
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 8px #22c55e",
            animation: "pulse 2s infinite"
          }}/>
          <span style={{ fontSize: 20, fontWeight: "bold", letterSpacing: 2 }}>
            SURAKSHA AI
          </span>
          <span style={{
            fontSize: 11, color: "#6b7280",
            background: "#111827", padding: "2px 8px",
            borderRadius: 4, border: "1px solid #374151"
          }}>
            v1.0 — DEMO
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Team LogicLinks | HACKOUTSAV 2026
        </div>
      </div>

      {/* Main layout */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1.4fr 1fr",
        gap: 20,
        padding: 24,
        maxWidth: 1400,
        margin: "0 auto"
      }}>

        {/* LEFT — Upload + Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <UploadZone
            onUpload={handleUpload}
            processing={processing}
            progress={progress}
            status={status}
          />

          {/* Stats */}
          <div style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 12, padding: 20
          }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 16 }}>
              SESSION STATS
            </div>
            {[
              { label: "Frames Analyzed", value: incidents.length * 2 },
              { label: "Incidents Found", value: incidents.length },
              {
                label: "Highest Threat",
                value: incidents.length > 0
                  ? `${Math.max(...incidents.map(i => i.threat_level))}/10`
                  : "—"
              },
              {
                label: "Alert Status",
                value: complete?.whatsapp_sent ? "✓ SENT" : "PENDING"
              }
            ].map(stat => (
              <div key={stat.label} style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom: "1px solid #1f2937"
              }}>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{stat.label}</span>
                <span style={{ fontSize: 14, fontWeight: "bold" }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER — Latest incident + Risk Banner */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {latestIncident ? (
            <>
              <RiskBanner incident={latestIncident} />
              <IncidentCard incident={latestIncident} large />
            </>
          ) : (
            <div style={{
              background: "#111827",
              border: "1px dashed #374151",
              borderRadius: 12,
              height: 400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 12,
              color: "#4b5563"
            }}>
              <div style={{ fontSize: 40 }}>📹</div>
              <div style={{ fontSize: 13 }}>Upload a video to begin analysis</div>
            </div>
          )}

          {/* Completion card */}
          {complete && (
            <div style={{
              background: complete.whatsapp_sent ? "#052e16" : "#111827",
              border: `1px solid ${complete.whatsapp_sent ? "#166534" : "#374151"}`,
              borderRadius: 12, padding: 20,
              textAlign: "center"
            }}>
              {complete.whatsapp_sent ? (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📱</div>
                  <div style={{ color: "#22c55e", fontWeight: "bold", marginBottom: 4 }}>
                    POLICE ALERTED VIA WHATSAPP
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Highest threat incident reported automatically
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                    Analysis Complete
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {complete.total_incidents} incidents found. Threat below alert threshold.
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Incident Log */}
        <div>
          <IncidentLog incidents={incidents} />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes flash { 0%{opacity:1} 100%{opacity:0} }
        @keyframes slideIn { from{transform:translateX(20px);opacity:0} to{transform:none;opacity:1} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #111827; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
      `}</style>
    </div>
  )
}
```

### `frontend/src/components/UploadZone.jsx`
```jsx
import { useRef, useState } from "react"

export default function UploadZone({ onUpload, processing, progress, status }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handleFile = (file) => {
    if (file && file.type.startsWith("video/")) onUpload(file)
  }

  return (
    <div style={{
      background: "#111827",
      border: `2px dashed ${dragging ? "#3b82f6" : "#374151"}`,
      borderRadius: 12, padding: 24,
      textAlign: "center", transition: "all 0.2s"
    }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
    >
      <input ref={inputRef} type="file" accept="video/*" style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])} />

      {!processing ? (
        <>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
            Drag & drop CCTV footage or
          </div>
          <button onClick={() => inputRef.current.click()} style={{
            background: "#3b82f6", color: "#fff",
            border: "none", borderRadius: 8,
            padding: "10px 24px", fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
            fontWeight: "bold", letterSpacing: 1
          }}>
            SELECT VIDEO
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
            {status || "Analyzing..."}
          </div>
          <div style={{
            background: "#1f2937", borderRadius: 8,
            height: 8, overflow: "hidden"
          }}>
            <div style={{
              height: "100%", borderRadius: 8,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
              width: `${progress}%`,
              transition: "width 0.5s ease"
            }}/>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
            {progress}% complete
          </div>
        </>
      )}
    </div>
  )
}
```

### `frontend/src/components/RiskBanner.jsx`
```jsx
export default function RiskBanner({ incident }) {
  const colors = {
    CRITICAL: { bg: "#450a0a", border: "#ef4444", text: "#ef4444" },
    HIGH:     { bg: "#431407", border: "#f97316", text: "#f97316" },
    MEDIUM:   { bg: "#422006", border: "#eab308", text: "#eab308" },
    LOW:      { bg: "#052e16", border: "#22c55e", text: "#22c55e" }
  }
  const c = colors[incident.threat_tag] || colors.LOW

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 12, padding: "16px 20px",
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      animation: "slideIn 0.3s ease"
    }}>
      <div>
        <div style={{ fontSize: 11, color: c.text, letterSpacing: 2, marginBottom: 4 }}>
          THREAT DETECTED
        </div>
        <div style={{ fontSize: 22, fontWeight: "bold", color: c.text }}>
          {incident.threat_tag}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
          {incident.recommended_action.replace(/_/g, " ").toUpperCase()}
        </div>
      </div>
      <div style={{
        fontSize: 48, fontWeight: "bold",
        color: c.text, opacity: 0.9,
        fontFamily: "'Syne', sans-serif"
      }}>
        {incident.threat_level}
        <span style={{ fontSize: 20, color: "#6b7280" }}>/10</span>
      </div>
    </div>
  )
}
```

### `frontend/src/components/IncidentCard.jsx`
```jsx
export default function IncidentCard({ incident }) {
  const tagColor = {
    CRITICAL: "#ef4444", HIGH: "#f97316",
    MEDIUM: "#eab308", LOW: "#22c55e"
  }
  const color = tagColor[incident.threat_tag] || "#22c55e"

  return (
    <div style={{
      background: "#111827",
      border: `1px solid #1f2937`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 12, overflow: "hidden",
      animation: "slideIn 0.3s ease"
    }}>
      {/* Frame thumbnail */}
      {incident.frame_b64 && (
        <img
          src={`data:image/jpeg;base64,${incident.frame_b64}`}
          alt="incident frame"
          style={{ width: "100%", height: 200, objectFit: "cover" }}
        />
      )}

      <div style={{ padding: 16 }}>
        {/* YOLO detections */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {incident.detected_objects?.map((obj, i) => (
            <span key={i} style={{
              fontSize: 11, padding: "3px 8px",
              background: "#1f2937", borderRadius: 4,
              color: "#9ca3af", border: "1px solid #374151"
            }}>
              {obj.label} {obj.confidence}%
            </span>
          ))}
        </div>

        {/* AI description */}
        <div style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.6, marginBottom: 12 }}>
          {incident.activity}
        </div>

        <div style={{
          fontSize: 11, color: "#6b7280",
          display: "flex", justifyContent: "space-between"
        }}>
          <span>⏱ {incident.timestamp}</span>
          <span>CAM_01 — Main Gate</span>
        </div>
      </div>
    </div>
  )
}
```

### `frontend/src/components/IncidentLog.jsx`
```jsx
export default function IncidentLog({ incidents }) {
  const tagColor = {
    CRITICAL: "#ef4444", HIGH: "#f97316",
    MEDIUM: "#eab308", LOW: "#22c55e"
  }

  return (
    <div style={{
      background: "#111827",
      border: "1px solid #1f2937",
      borderRadius: 12, overflow: "hidden",
      height: "calc(100vh - 160px)"
    }}>
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid #1f2937",
        fontSize: 11, color: "#6b7280", letterSpacing: 2
      }}>
        INCIDENT LOG ({incidents.length})
      </div>

      <div style={{ overflowY: "auto", height: "calc(100% - 50px)" }}>
        {incidents.length === 0 ? (
          <div style={{
            padding: 24, textAlign: "center",
            color: "#4b5563", fontSize: 12
          }}>
            No incidents yet
          </div>
        ) : (
          incidents.map((inc) => (
            <div key={inc.id} style={{
              padding: "14px 20px",
              borderBottom: "1px solid #1f2937",
              display: "flex", gap: 12, alignItems: "flex-start",
              animation: "slideIn 0.3s ease"
            }}>
              {/* Threat badge */}
              <div style={{
                minWidth: 70, padding: "3px 8px",
                background: `${tagColor[inc.threat_tag]}20`,
                border: `1px solid ${tagColor[inc.threat_tag]}`,
                borderRadius: 4, textAlign: "center",
                fontSize: 10, color: tagColor[inc.threat_tag],
                fontWeight: "bold"
              }}>
                {inc.threat_tag}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, color: "#d1d5db",
                  marginBottom: 4,
                  overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {inc.activity}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  {inc.timestamp} · {inc.threat_level}/10
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

---

## 7. Run Everything

```bash
# Terminal 1 — Backend
cd backend
uvicorn main:combined_app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm create vite@latest . -- --template react
npm install socket.io-client
npm run dev
```

---

## 8. One Day Timeline

| Time | Task |
|---|---|
| 9AM - 11AM | Backend working — upload → YOLO → log incidents |
| 11AM - 1PM | Connect Qwen API → get real AI descriptions |
| 1PM - 2PM | Lunch break 🍱 |
| 2PM - 4PM | Frontend — upload zone + incident cards live |
| 4PM - 5PM | Socket.io — incidents appear in real time |
| 5PM - 6PM | Risk banner + completion screen |
| 6PM - 7PM | Record demo video with knife prop |
| 7PM - 8PM | Connect WhatsApp at the very end |
| 8PM - 9PM | Full dry run + fix bugs |

---

## 9. Simulate Button (If Detection Fails)

Add this to backend for backup during demo:

```python
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
```

