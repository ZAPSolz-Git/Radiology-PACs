import { Link } from "react-router-dom";
import { Clock, Home } from "lucide-react";

const NotFound = () => {
  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ background: "#020817", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @keyframes subtleUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.15; }
        }
        @keyframes tickPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        .anim-up-1 { animation: subtleUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .anim-up-2 { animation: subtleUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both; }
        .anim-up-3 { animation: subtleUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both; }
        .glow-text {
          text-shadow: 0 0 60px rgba(59, 130, 246, 0.15);
        }
        .clock-pulse { animation: tickPulse 2.4s ease-in-out infinite; }
      `}</style>

      {/* Decorative Grid and Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[150px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(29,78,216,1) 0%, transparent 60%)",
            animation: "pulseGlow 6s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, #020817 0%, transparent 20%, transparent 80%, #020817 100%)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl pt-10">
        {/* Eyebrow Label */}
        <div className="anim-up-1 flex items-center gap-3 mb-6">
          <span className="w-10 h-px" style={{ background: "rgba(59,130,246,0.4)" }} />
          <span
            className="text-[11px] uppercase tracking-[0.2em] text-blue-400 font-bold"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Under Construction
          </span>
          <span className="w-10 h-px" style={{ background: "rgba(59,130,246,0.4)" }} />
        </div>

        {/* Big "Coming Soon" headline */}
        <div className="anim-up-2 relative mb-6">
          <h1
            className="glow-text leading-none select-none"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(52px, 11vw, 140px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "transparent",
              WebkitTextStroke: "1.5px rgba(255,255,255,0.15)",
            }}
          >
            Coming Soon
          </h1>
          <div className="clock-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500/20">
            <Clock size={80} />
          </div>
        </div>

        {/* Description */}
        <div className="anim-up-3 space-y-6 flex flex-col items-center">
          <h2
            className="text-white text-3xl md:text-5xl font-bold mb-2 leading-tight"
            style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.03em" }}
          >
            We're working on it.
          </h2>
          <p
            className="text-[16px] leading-relaxed max-w-md md:max-w-xl mb-10"
            style={{ color: "rgba(255,255,255,0.4)", fontWeight: 300 }}
          >
            This page is currently under development. Our team is building something
            great — check back soon for updates to the Armorray platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              to="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full text-[14px] font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: "#1d4ed8",
                boxShadow: "0 0 0 1px rgba(59,130,246,0.3), 0 16px 32px rgba(29,78,216,0.3)",
              }}
            >
              <Home size={16} />
              Return Home
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom subtle element */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-25 pointer-events-none text-center w-full">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "white" }}>
          Armorray System Architecture
        </span>
      </div>
    </div>
  );
};

export default NotFound;
