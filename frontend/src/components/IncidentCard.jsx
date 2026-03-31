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
