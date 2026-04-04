import { motion } from "framer-motion"

const EMERGENCY_CONFIG = {
  CRIME:    { color: "#ef4444", bg: "#450a0a", border: "#ef4444", icon: "🚨", label: "Crime",    action: "Alert Police" }
}

export { EMERGENCY_CONFIG }

export default function IncidentCard({ incident }) {
  const scheme = {
    CRITICAL: "error",
    HIGH: "orange-500",
    MEDIUM: "primary",
    LOW: "green-500",
  }
  const color = scheme[incident.threat_tag] || "green-500"
  const eConfig = EMERGENCY_CONFIG[incident.emergency_type] || EMERGENCY_CONFIG.CRIME

  return (
    <motion.section
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-panel rounded-xl overflow-hidden flex flex-col border-t-4 border-${color}`}
      style={{ borderLeftWidth: "4px", borderLeftColor: eConfig.color }}
    >
      {/* Emergency Type Badge */}
      <div 
        className="flex items-center gap-2 px-4 py-2"
        style={{ backgroundColor: eConfig.bg, borderBottom: `1px solid ${eConfig.border}30` }}
      >
        <span className="text-lg">{eConfig.icon}</span>
        <span 
          className="text-[11px] font-headline font-black uppercase tracking-[0.2em]"
          style={{ color: eConfig.color }}
        >
          {eConfig.label} Detected
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: eConfig.color, boxShadow: `0 0 8px ${eConfig.color}` }}
          ></span>
          <span 
            className="text-[9px] font-headline font-bold uppercase tracking-widest"
            style={{ color: eConfig.color }}
          >
            {eConfig.action}
          </span>
        </div>
      </div>

      <div className="relative group aspect-video">
        {incident.frame_b64 ? (
          <img 
            className="w-full h-full object-cover" 
            src={`data:image/jpeg;base64,${incident.frame_b64}`} 
            alt="incident frame" 
          />
        ) : (
          <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-outline">
            NO FEED
          </div>
        )}
        <div className="absolute inset-0 scanline pointer-events-none opacity-30"></div>
        <div className="absolute top-6 left-6 flex flex-col gap-3">
          <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded border border-white/10 flex items-center gap-2">
            <span className={`w-2 h-2 bg-${color} rounded-full animate-ping`}></span>
            <span className="text-[10px] font-headline font-bold text-on-surface uppercase tracking-widest">LIVE_FEED CAM-01</span>
          </div>
          <div className={`px-3 py-1 bg-${color}/80 backdrop-blur-md rounded border border-${color}/20`}>
            <span className={`text-[10px] font-headline font-bold text-white uppercase tracking-widest drop-shadow-md`}>Threat: {incident.threat_level}/10</span>
          </div>
        </div>
        
        <div className="absolute bottom-6 left-6 flex gap-2 flex-wrap">
          {incident.detected_objects?.map((obj, i) => (
            <div key={i} className={`px-3 py-1 bg-primary/20 backdrop-blur-md border border-primary/30 rounded`}>
              <span className={`text-[10px] text-primary font-bold uppercase`}>{obj.label} {obj.confidence}%</span>
            </div>
          ))}
        </div>
        
        <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-primary/40 m-6 rounded-tr-xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-primary/40 m-6 rounded-bl-xl pointer-events-none"></div>
      </div>
      
      <div className="p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline font-bold text-xl">Event Log Analysis</h3>
          <span className="text-[10px] font-headline text-outline uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">schedule</span>
            {incident.timestamp}
          </span>
        </div>
        <p className="text-on-surface-variant text-sm leading-relaxed mb-6 italic">
          "{incident.activity}"
        </p>
        <div className="flex items-center gap-4">
          <button className="flex-1 py-3 bg-surface-container-highest border border-outline-variant hover:border-primary/40 text-on-surface transition-all rounded-lg font-headline text-[10px] font-bold tracking-widest uppercase hover:bg-primary/5">
            Tag False Positive
          </button>
          <button className="flex-1 py-3 bg-surface-container-highest border border-outline-variant hover:border-primary/40 text-on-surface transition-all rounded-lg font-headline text-[10px] font-bold tracking-widest uppercase hover:bg-primary/5">
            Archive Clip
          </button>
        </div>
      </div>
    </motion.section>
  )
}
