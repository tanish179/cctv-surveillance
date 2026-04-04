import { motion, AnimatePresence } from "framer-motion"
import { EMERGENCY_CONFIG } from "./IncidentCard"

export default function IncidentLog({ incidents }) {
  const scheme = {
    CRITICAL: { color: "text-error", bg: "bg-error/10", border: "border-error" },
    HIGH: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500" },
    MEDIUM: { color: "text-primary", bg: "bg-primary/10", border: "border-primary" },
    LOW: { color: "text-outline", bg: "bg-surface-container-high/40", border: "border-outline-variant" },
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel rounded-xl flex flex-col h-[calc(100vh-10rem)] sticky top-28 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-high/40">
        <h3 className="font-headline font-bold text-sm tracking-widest uppercase text-on-surface">Live Incident Log</h3>
        <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-bold">
          {incidents.length} TOTAL
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 relative">
        {incidents.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-center text-outline opacity-60">
             <span className="material-symbols-outlined text-4xl mb-4">analytics</span>
             <p className="font-headline tracking-widest text-xs uppercase">No incidents recorded</p>
           </div>
        ) : (
          <AnimatePresence initial={false}>
            {incidents.map((inc, index) => {
              const s = scheme[inc.threat_tag] || scheme.LOW
              const eConfig = EMERGENCY_CONFIG[inc.emergency_type] || EMERGENCY_CONFIG.CRIME
              
              return (
                <motion.div
                  key={inc.id || index}
                  initial={{ opacity: 0, x: 20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className={`p-4 rounded-lg bg-surface-container-high/20 border-l-4 transition-all cursor-pointer group`}
                  style={{ borderLeftColor: eConfig.color }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span 
                      className={`text-[9px] font-headline font-black uppercase tracking-widest`}
                      style={{ color: eConfig.color }}
                    >
                      {eConfig.icon} {inc.threat_tag}
                    </span>
                    <span className="text-[9px] text-outline font-mono">{inc.timestamp}</span>
                  </div>
                  <p className="text-xs text-on-surface font-medium line-clamp-2 leading-relaxed">
                    {inc.activity}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-outline-variant font-mono">ID: #{inc.id || Math.floor(Math.random()*10000)}</span>
                    <span className={`text-xs font-bold ${s.color}`}>
                      {inc.threat_level}/10
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 bg-surface-container-highest/20 mt-auto">
        <button className="w-full py-2 bg-primary/10 border border-primary/20 text-primary font-headline text-[10px] font-bold tracking-widest uppercase hover:bg-primary/20 transition-all rounded">
            EXPORT DAILY LOG
        </button>
      </div>
    </motion.section>
  )
}
