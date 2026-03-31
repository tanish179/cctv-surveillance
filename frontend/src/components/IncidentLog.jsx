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
