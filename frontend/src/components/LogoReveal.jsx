import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

export default function LogoReveal({ onComplete }) {
  const [phase, setPhase] = useState(0) // 0=logo, 1=text, 2=tagline, 3=exit

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => onComplete(), 3400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <AnimatePresence>
      {phase < 3 && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#050810",
            overflow: "hidden",
          }}
        >
          {/* Ambient glow behind logo */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0.6 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{
              position: "absolute",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,212,255,0.15) 0%, rgba(59,130,246,0.08) 40%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          {/* Grid lines */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 60%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 60%)",
          }} />

          {/* Horizontal scan line */}
          <motion.div
            initial={{ top: "-2px" }}
            animate={{ top: "100%" }}
            transition={{ duration: 2, ease: "linear", repeat: Infinity }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)",
              zIndex: 2,
            }}
          />

          {/* Logo image */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotateY: 90 }}
            animate={{
              scale: phase >= 1 ? 1 : 0.3,
              opacity: phase >= 0 ? 1 : 0,
              rotateY: 0,
            }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              position: "relative",
              zIndex: 3,
              marginBottom: 24,
            }}
          >
            <motion.img
              src="/logo.png"
              alt="Suraksha AI"
              animate={{
                filter: [
                  "drop-shadow(0 0 0px rgba(0,212,255,0))",
                  "drop-shadow(0 0 30px rgba(0,212,255,0.6))",
                  "drop-shadow(0 0 15px rgba(0,212,255,0.3))",
                ],
              }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              style={{
                width: 120,
                height: 120,
                objectFit: "contain",
              }}
            />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: phase >= 1 ? 1 : 0,
              y: phase >= 1 ? 0 : 20,
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "relative",
              zIndex: 3,
              textAlign: "center",
            }}
          >
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: 6,
              background: "linear-gradient(135deg, #00d4ff, #3b82f6, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.1,
            }}>
              SURAKSHA
            </div>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 12,
              color: "rgba(148, 163, 184, 0.6)",
              marginTop: 4,
            }}>
              ARTIFICIAL INTELLIGENCE
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: phase >= 2 ? 1 : 0,
              y: phase >= 2 ? 0 : 10,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              position: "relative",
              zIndex: 3,
              marginTop: 28,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{
              width: 40, height: 1,
              background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.5))",
            }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: 3,
              color: "rgba(0,212,255,0.5)",
              textTransform: "uppercase",
            }}>
              Intelligent Surveillance System
            </span>
            <div style={{
              width: 40, height: 1,
              background: "linear-gradient(90deg, rgba(0,212,255,0.5), transparent)",
            }} />
          </motion.div>

          {/* Bottom loading bar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: phase >= 1 ? 1 : 0 }}
            transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, transparent, #00d4ff, #3b82f6, #8b5cf6, transparent)",
              transformOrigin: "left",
              zIndex: 3,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
