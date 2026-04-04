import { useRef, useState } from "react"
import { motion } from "framer-motion"

export default function UploadZone({ onUpload, processing, progress, status }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handleFile = (file) => {
    if (file && file.type.startsWith("video/")) onUpload(file)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-panel rounded-xl p-8 border-dashed border-2 flex flex-col items-center text-center group transition-all relative ${dragging ? 'border-primary/80' : 'border-primary/20 hover:border-primary/50'}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
    >
      <input ref={inputRef} type="file" accept="video/*" style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])} />

      {!processing ? (
        <>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 transition-transform group-hover:-translate-y-1">
            <span className="material-symbols-outlined text-primary text-3xl">videocam</span>
          </div>
          <h3 className="font-headline font-bold text-lg mb-2 text-on-surface">Feed Ingestion</h3>
          <p className="text-outline text-xs mb-8">Drag and drop CCTV footage for real-time AI analysis.</p>
          <button 
            onClick={() => inputRef.current.click()} 
            className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-headline font-bold text-xs tracking-widest rounded-lg shadow-[0_0_20px_rgba(0,212,255,0.2)] hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition-all uppercase"
          >
            SELECT VIDEO
          </button>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
            <span className="material-symbols-outlined text-primary text-3xl">memory</span>
          </div>
          <div className="font-headline text-xs text-primary font-bold mb-4 tracking-widest uppercase">
            {status || "ANALYZING FOOTAGE..."}
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative mb-2">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary-container"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
          <div className="font-mono text-[10px] text-outline tracking-wider">
            {progress}% COMPLETE
          </div>
        </>
      )}
    </motion.section>
  )
}
