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
