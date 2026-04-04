import { useState, useEffect, useCallback } from "react"
import { io } from "socket.io-client"
import { motion, AnimatePresence } from "framer-motion"
import UploadZone from "./components/UploadZone"
import IncidentCard from "./components/IncidentCard"
import RiskBanner from "./components/RiskBanner"
import IncidentLog from "./components/IncidentLog"
import LogoReveal from "./components/LogoReveal"

const socket = io("http://localhost:8000")

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export default function App() {
  const [incidents, setIncidents] = useState([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState("")
  const [latestIncident, setLatestIncident] = useState(null)
  const [complete, setComplete] = useState(null)
  const [screenFlash, setScreenFlash] = useState(false)
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    socket.on("incident", (data) => {
      setIncidents(prev => [data, ...prev])
      setLatestIncident(data)
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

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false)
  }, [])

  const statItems = [
    { label: "Frames Analyzed", value: incidents.length * 2, icon: "analytics" },
    { label: "Incidents Found", value: incidents.length, icon: "warning" },
    { label: "Highest Threat", value: incidents.length > 0 ? `${Math.max(...incidents.map(i => i.threat_level))}/10` : "—", icon: "security" },
    { label: "Alert Status", value: complete?.whatsapp_sent ? "SENT" : "PENDING", icon: "cell_tower", highlight: complete?.whatsapp_sent },
  ]

  return (
    <>
      <AnimatePresence>
        {showSplash && <LogoReveal onComplete={handleSplashComplete} />}
      </AnimatePresence>

      <div className="min-h-screen bg-surface flex flex-col font-body text-on-surface overflow-x-hidden selection:bg-primary/30 selection:text-primary scroll-smooth">
        {/* Ambient background from CSS */}
        <div className="ambient-bg" />
        <div className="grid-bg" />
        
        <AnimatePresence>
          {screenFlash && (
            <motion.div
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="fixed inset-0 z-50 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(239,68,68,0.25) 0%, transparent 70%)" }}
            />
          )}
        </AnimatePresence>

        {/* HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: showSplash ? 0 : 1, y: showSplash ? -20 : 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="h-20 border-b border-outline-variant/20 bg-surface/80 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-8"
        >
          <div className="flex items-center gap-6">
            <motion.img
              src="/logo.png"
              alt="Suraksha AI"
              className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]"
              whileHover={{ scale: 1.1, rotate: 5 }}
            />
            <div>
              <h1 className="text-2xl font-headline font-black tracking-widest bg-gradient-to-r from-white to-primary bg-clip-text text-transparent uppercase leading-none">
                SURAKSHA AI
              </h1>
              <p className="text-[9px] font-headline font-bold text-primary tracking-[0.3em] uppercase mt-1">
                INTELLIGENT SURVEILLANCE NODE #01
              </p>
            </div>
            
            <div className={`ml-8 flex items-center gap-3 px-4 py-1 rounded-full border bg-opacity-10 backdrop-blur-sm ${processing ? 'bg-primary/10 border-primary/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <span className={`w-2 h-2 rounded-full ${processing ? 'bg-primary shadow-[0_0_10px_var(--tw-shadow-color)] shadow-primary' : 'bg-green-500 shadow-[0_0_10px_var(--tw-shadow-color)] shadow-green-500'} animate-pulse`}></span>
              <span className={`text-[10px] font-headline font-bold tracking-widest uppercase ${processing ? 'text-primary' : 'text-green-500'}`}>
                {processing ? "PROCESSING STREAM" : "SYSTEM ONLINE"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-outline font-headline text-[10px] tracking-widest uppercase font-bold">
             <span className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-sm">database</span>
                 Central Database Connected
             </span>
             <span className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-sm">memory</span>
                 YOLOv8 + Qwen3
             </span>
             <div className="w-px h-6 bg-outline-variant/30"></div>
             <span className="text-primary italic border border-primary/20 px-3 py-1 rounded bg-primary/5">HACKOUTSAV 2026 // Team LogicLinks</span>
          </div>
        </motion.header>

        {/* MAIN DESKGRID */}
        <motion.main
          variants={stagger}
          initial="hidden"
          animate={showSplash ? "hidden" : "show"}
          className="flex-1 p-8 grid grid-cols-12 gap-8 relative z-10 w-full max-w-[1920px] mx-auto"
        >
          {/* LEFT SIDEBAR */}
          <motion.aside variants={fadeUp} className="col-span-12 lg:col-span-3 space-y-6">
            <UploadZone onUpload={handleUpload} processing={processing} progress={progress} status={status} />
            
            {/* System Metrics Panel */}
            <section className="glass-panel rounded-xl p-6">
               <h3 className="font-headline font-bold text-sm tracking-widest uppercase text-on-surface mb-6 border-b border-outline-variant/20 pb-4">Live Analytics</h3>
               <div className="grid grid-cols-2 gap-4 mb-6">
                 {statItems.map((stat, i) => (
                    <div key={i} className="bg-surface-container-high/50 p-4 rounded-lg border border-outline-variant/10 text-center flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-outline mb-2">{stat.icon}</span>
                        <div className={`text-2xl font-headline font-black mb-1 ${stat.highlight ? 'text-green-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-primary'}`}>{stat.value}</div>
                        <div className="text-[9px] text-outline font-headline font-bold uppercase tracking-widest">{stat.label}</div>
                    </div>
                 ))}
               </div>

               <div className="bg-surface-container-high/30 rounded-lg p-4 border border-outline-variant/10 mb-6 font-mono text-[11px] tracking-widest uppercase">
                 <div className="text-outline border-b border-outline-variant/20 pb-2 mb-3">Anomaly Breakdown</div>
                 <div className="space-y-3">
                   <div className="flex justify-between items-center"><span className="text-error">🚨 Crime</span><span className="text-on-surface font-bold">{incidents.filter(i => i.emergency_type === 'CRIME').length}</span></div>
                 </div>
               </div>
               
               <div className="space-y-4">
                 {[
                  { label: "Object Detection Engine", detail: "YOLOv8n", status: "active", ping: "24ms" },
                  { label: "Threat Verification", detail: "Qwen3-VL", status: "active", ping: "1.2s" },
                  { label: "WhatsApp Alert System", detail: "Twilio", status: complete?.whatsapp_sent ? "sent" : "standby", ping: "—" },
                 ].map(sys => (
                    <div key={sys.label} className="p-3 border border-outline-variant/20 rounded bg-surface/40 flex items-center justify-between">
                       <div>
                           <div className="text-[10px] font-headline font-bold text-on-surface uppercase tracking-wider mb-1">{sys.label}</div>
                           <div className="text-[9px] text-outline uppercase tracking-widest">{sys.detail}</div>
                       </div>
                       <div className="flex flex-col items-end">
                           <div className={`w-2 h-2 rounded-full mb-1 ${sys.status === 'active' ? 'bg-green-500 shadow-[0_0_5px_#10b981]' : sys.status === 'sent' ? 'bg-primary shadow-[0_0_5px_#00d4ff]' : 'bg-outline'}`}></div>
                           <div className="text-[9px] font-mono text-outline-variant">{sys.ping}</div>
                       </div>
                    </div>
                 ))}
               </div>
            </section>
          </motion.aside>

          {/* CENTER MONITOR */}
          <motion.section variants={fadeUp} className="col-span-12 lg:col-span-6 flex flex-col gap-6">
            <AnimatePresence mode="wait">
              {latestIncident ? (
                <motion.div key="incident" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0}}>
                  <RiskBanner incident={latestIncident} />
                  <div className="mt-6">
                    <IncidentCard incident={latestIncident} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  className="glass-panel flex-1 rounded-xl flex flex-col items-center justify-center min-h-[600px] border-b-4 border-primary/30 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-3xl"></div>
                   <div className="w-24 h-24 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center animate-[spin_20s_linear_infinite] mb-8 relative">
                       <div className="absolute inset-2 border border-primary/10 rounded-full animate-[spin_10s_linear_reverse_infinite]"></div>
                       <span className="material-symbols-outlined text-primary/50 text-4xl animate-none">radar</span>
                   </div>
                   <h2 className="text-2xl font-headline font-bold text-on-surface tracking-widest uppercase mb-2">Awaiting Visual Input</h2>
                   <p className="text-xs text-outline tracking-wider max-w-sm text-center mb-8">System is standing by. Drag footage into the ingestion zone to initiate multi-model analysis sequence.</p>
                   <div className="px-4 py-2 bg-surface-container/50 border border-outline-variant/10 rounded font-mono text-[10px] text-outline-variant uppercase tracking-widest">
                       SECURE TERMINAL // SURAKSHA AI v1.0
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <AnimatePresence>
              {complete && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`glass-panel p-6 border-l-4 rounded-xl flex items-center justify-between ${complete.whatsapp_sent ? 'border-green-500 bg-green-500/5' : 'border-primary bg-primary/5'}`}
                >
                  <div className="flex items-center gap-6">
                    <span className={`material-symbols-outlined text-4xl ${complete.whatsapp_sent ? 'text-green-500' : 'text-primary'}`}>
                      {complete.whatsapp_sent ? 'phonelink_ring' : 'analytics'}
                    </span>
                    <div>
                      <h3 className={`font-headline font-black text-lg uppercase tracking-widest ${complete.whatsapp_sent ? 'text-green-500' : 'text-primary'}`}>
                        {complete.whatsapp_sent 
                          ? complete.highest_threat?.emergency_type === 'CRIME' ? '🚨 Police Alerted' 
                          : 'Authorities Alerted'
                          : "Analysis Complete"}
                      </h3>
                      <p className="text-xs text-outline mt-1 font-medium">{complete.total_incidents} anomalies indexed. {complete.whatsapp_sent ? "Threat threshold exceeded. Automated alert sent via Twilio." : "Threat index below critical threshold. Escalation not required."}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-headline text-outline uppercase tracking-widest block mb-1">Status Code</span>
                    <span className={`text-xl font-mono font-bold ${complete.whatsapp_sent ? 'text-green-500' : 'text-primary'}`}>
                      {complete.whatsapp_sent ? "CRIT_RSP_001" : "SYS_CLR_X09"}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.section>

          {/* RIGHT SIDEBAR */}
          <motion.aside variants={fadeUp} className="col-span-12 lg:col-span-3">
            <IncidentLog incidents={incidents} />
          </motion.aside>

        </motion.main>
      </div>
    </>
  )
}
