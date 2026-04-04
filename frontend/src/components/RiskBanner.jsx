import { motion } from "framer-motion"
import { EMERGENCY_CONFIG } from "./IncidentCard"

export default function RiskBanner({ incident }) {
  const scheme = {
    CRITICAL: { threatColor: "text-error", shadow: "shadow-error/40", border: "border-error/20" },
    HIGH: { threatColor: "text-orange-500", shadow: "shadow-orange-500/40", border: "border-orange-500/20" },
    MEDIUM: { threatColor: "text-primary", shadow: "shadow-primary/40", border: "border-primary/20" },
    LOW: { threatColor: "text-green-500", shadow: "shadow-green-500/40", border: "border-green-500/20" },
  }
  
  const s = scheme[incident.threat_tag] || scheme.LOW
  const eConfig = EMERGENCY_CONFIG[incident.emergency_type] || EMERGENCY_CONFIG.CRIME

  return (
    <motion.section
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-panel rounded-xl overflow-hidden relative border`}
      style={{ backgroundColor: eConfig.bg, borderColor: `${eConfig.border}60` }}
    >
      <div 
        className={`absolute inset-0 bg-gradient-to-r pointer-events-none`}
        style={{ backgroundImage: `linear-gradient(to right, ${eConfig.color}20, transparent)` }}
      ></div>
      <div className="p-8 flex items-center justify-between relative z-10">
        <div className="space-y-1">
          <div className={`flex items-center gap-2 animate-pulse`} style={{ color: eConfig.color }}>
            <span className="material-symbols-outlined text-sm">{s.icon || "warning"}</span>
            <span className="text-[10px] font-headline font-bold tracking-[0.3rem] uppercase">Threat Detected</span>
          </div>
          <h2 className={`text-5xl font-headline font-black tracking-tighter`} style={{ color: eConfig.color }}>
            {eConfig.icon} {incident.emergency_type} DETECTED
          </h2>
          <p className="text-outline text-xs mt-2 max-w-[280px]">
             {eConfig.action} immediately.
          </p>
          <button 
             className={`mt-4 px-6 py-2 border font-headline font-bold text-[10px] tracking-widest rounded uppercase transition-all`}
             style={{ backgroundColor: `${eConfig.color}30`, borderColor: `${eConfig.color}80`, color: eConfig.color }}
             onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = eConfig.color; e.currentTarget.style.color = '#fff' }}
             onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${eConfig.color}30`; e.currentTarget.style.color = eConfig.color }}
          >
            {eConfig.action.toUpperCase()}
          </button>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-[10px] font-headline text-outline uppercase tracking-widest mb-1">Threat Score</span>
          <div className={`text-7xl font-headline font-black ${s.threatColor} drop-shadow-[0_0_20px_var(--tw-shadow-color)] ${s.shadow} leading-none`}>
            {incident.threat_level}<span className="text-2xl text-outline/40">/10</span>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
