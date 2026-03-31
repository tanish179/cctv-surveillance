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
