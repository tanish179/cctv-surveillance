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
