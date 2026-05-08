import React, { useEffect, useRef } from "react";
import heroVideo from "../assets/videos/hero-video.mp4";
import LogoMarquee from "./LogoMarquee";
import {
  FileText,
  Smartphone,
  Database,
  Users,
  Bell,
  Headphones,
  RefreshCw,
  PlusCircle,
  ArrowRight,
  ArrowUpRight,
  MoveDown,
} from "lucide-react";

function Homepage() {
  const features = [
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Rich Text Reporting",
      desc: "Integrated rich text reporting from any location with electronic signature.",
      img: "/assets/images/Test_Results.png",
      num: "01",
    },
    {
      icon: <Smartphone className="w-5 h-5" />,
      title: "View on Any Device",
      desc: "Full diagnostic quality on PC, Mac, iPad, iPhone and Android.",
      img: "/assets/images/Laptop.png",
      num: "02",
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: "Vendor Neutral Archive",
      desc: "Hybrid PACS acts like a vendor neutral archive for all your medical data.",
      img: "/assets/images/Database.png",
      num: "03",
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Unlimited Users",
      desc: "Unlimited concurrent users. Adding or removing users is seamless.",
      img: "/assets/images/Users.png",
      num: "04",
    },
    {
      icon: <Bell className="w-5 h-5" />,
      title: "Alerting & Notifications",
      desc: "Automatic SMS or email alerts and notifications for critical findings.",
      img: "/assets/images/Notification.png",
      num: "05",
    },
    {
      icon: <Headphones className="w-5 h-5" />,
      title: "24×7 Support",
      desc: "Free 24/7 support available via email, phone and chat for all customers.",
      img: "/assets/images/Request_Service.png",
      num: "06",
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: "Free Updates",
      desc: "All customers receive free updates to the latest commercially available versions.",
      img: "/assets/images/Update_File.png",
      num: "07",
    },
    {
      icon: <PlusCircle className="w-5 h-5" />,
      title: "And Many More",
      desc: "Explore all features of hybrid PACS and its detailed capabilities.",
      img: "/assets/images/Search_More.png",
      num: "08",
    },
  ];

  const stats = [
    { val: "37M+", label: "Lives Impacted", sub: "Globally" },
    { val: "105+", label: "Countries", sub: "Active deployments" },
    { val: "1B+", label: "Data Points", sub: "Processed annually" },
    { val: "99.9%", label: "Uptime SLA", sub: "Enterprise-grade" },
  ];

  return (
    <div
      className="w-full text-white selection:bg-blue-500/30"
      style={{ background: "#020817", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(6px); }
        }
        @keyframes lineScan {
          0%   { transform: scaleX(0); transform-origin: left; }
          50%  { transform: scaleX(1); transform-origin: left; }
          51%  { transform: scaleX(1); transform-origin: right; }
          100% { transform: scaleX(0); transform-origin: right; }
        }
        .hero-title { animation: fadeUp 1s ease 0.3s both; }
        .hero-sub   { animation: fadeUp 1s ease 0.55s both; }
        .hero-cta   { animation: fadeUp 1s ease 0.75s both; }
        .hero-stats { animation: fadeUp 1s ease 0.9s both; }
        .scroll-bounce { animation: scrollBounce 2s ease-in-out infinite; }
        .feature-card { transition: all 0.3s ease; }
        .feature-card:hover { background: rgba(255,255,255,0.04); }
        .feature-card:hover .feature-num { color: #3b82f6; }
        .feature-card:hover .feature-icon-wrap { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.3); }
        .feature-card:hover .feature-arrow { opacity: 1; transform: translate(0,0); }
        .feature-arrow { opacity: 0; transform: translate(-4px, 4px); transition: all 0.25s ease; }
        .grid-line-h { background: linear-gradient(to right, transparent, rgba(255,255,255,0.04), transparent); }
        .grid-line-v { background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.04), transparent); }
        .stat-card:hover .stat-val { color: #60a5fa; }
        .stat-card { transition: all 0.2s; }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════ HERO */}
      <section
        className="relative min-h-screen flex flex-col overflow-hidden"
        style={{ paddingTop: 90 }}
      >
        {/* Video BG */}
        <div className="absolute inset-0 z-0">
          <video
            src={heroVideo}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            style={{ opacity: 0.18 }}
          />
          {/* Gradient overlays */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(29,78,216,0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(2,8,23,0.3) 0%, transparent 40%, rgba(2,8,23,0.9) 85%, #020817 100%)",
            }}
          />
        </div>

        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-7xl mx-auto px-6 md:px-12 w-full">
          <div className="max-w-4xl pt-20 pb-12">

            {/* Eyebrow label */}
            <div
              className="hero-title inline-flex items-center gap-2 mb-8"
              style={{ opacity: 0 }}
            >
              <span
                className="text-[10px] uppercase tracking-[0.18em] text-blue-400 font-medium"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Revolutionizing Radiology
              </span>
              <span
                className="w-8 h-px"
                style={{ background: "rgba(59,130,246,0.5)" }}
              />
              <span
                className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
              />
            </div>

            {/* Main headline */}
            <h1
              className="hero-title leading-none mb-8 tracking-tight"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(52px, 8vw, 108px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "white",
                opacity: 0,
              }}
            >
              Data,{" "}
              <span
                className="relative inline-block"
                style={{
                  color: "#60a5fa",
                  WebkitTextStroke: "0px",
                }}
              >
                detail
              </span>
              ,
              <br />
              and{" "}
              <span
                style={{
                  WebkitTextStroke: "1px rgba(255,255,255,0.3)",
                  color: "transparent",
                }}
              >
                Diagnosis
              </span>
              .
            </h1>

            {/* Sub */}
            <p
              className="hero-sub text-lg leading-relaxed mb-10 max-w-xl"
              style={{
                color: "rgba(255,255,255,0.5)",
                fontWeight: 300,
                opacity: 0,
                letterSpacing: "0.01em",
              }}
            >
              Experience the trinity of precision with our Hybrid PACS — impacting
              millions of lives across 100+ countries with state-of-the-art
              diagnostic imaging solutions.
            </p>

            {/* CTAs */}
            <div className="hero-cta flex flex-wrap items-center gap-4" style={{ opacity: 0 }}>
              <a
                href="/contact"
                className="group inline-flex items-center gap-2 text-white text-[14px] font-semibold px-8 py-3.5 rounded-full transition-all hover:-translate-y-px"
                style={{
                  background: "#1d4ed8",
                  boxShadow: "0 0 0 1px rgba(59,130,246,0.4), 0 12px 28px rgba(29,78,216,0.35)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Contact Us
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </a>
              <a
                href="/radiology-pacs"
                className="inline-flex items-center gap-2 text-white/70 hover:text-white text-[14px] font-medium transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Explore PACS
                <ArrowUpRight size={14} className="text-blue-400" />
              </a>
            </div>
          </div>

          {/* Stats row */}
          <div
            className="hero-stats grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-white/5 pt-10 pb-16 max-w-3xl"
            style={{ opacity: 0 }}
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="stat-card pr-8"
                style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div
                  className="stat-val text-3xl font-bold text-white mb-1 transition-colors"
                  style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.03em" }}
                >
                  {s.val}
                </div>
                <div
                  className="text-[11px] text-white/40 uppercase tracking-[0.1em]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <MoveDown
            size={14}
            className="scroll-bounce text-white/25"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ MARQUEE */}
      <div
        className="relative py-10"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <LogoMarquee />
      </div>

      {/* ═══════════════════════════════════════════════════════════ FEATURES */}
      <section
        className="py-32 px-6 md:px-12 relative overflow-hidden"
        style={{ background: "#020817" }}
      >
        {/* Background accent */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "20%",
            right: "-200px",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(29,78,216,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10">

          {/* Section header */}
          <div className="flex items-start justify-between gap-8 mb-20">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="text-[10px] text-blue-400 uppercase tracking-[0.18em]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  02 — Capabilities
                </span>
                <span
                  className="flex-1 h-px max-w-12"
                  style={{ background: "rgba(59,130,246,0.3)" }}
                />
              </div>
              <h2
                className="text-white leading-none"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "clamp(36px, 5vw, 64px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                Every detail.
                <br />
                <span style={{ color: "#3b82f6" }}>Matters.</span>
              </h2>
            </div>
            <div className="hidden md:flex flex-col items-end justify-end gap-2 pb-3">
              <p
                className="text-white/40 text-[14px] text-right max-w-xs leading-relaxed"
                style={{ fontWeight: 300 }}
              >
                Built for radiologists, hospitals, and diagnostic centers
                that demand zero compromise.
              </p>
            </div>
          </div>

          {/* Feature grid */}
          <div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-0"
            style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}
          >
            {features.map((f, i) => (
              <div
                key={i}
                className="feature-card relative p-8 cursor-default"
                style={{
                  borderRight: (i + 1) % 4 !== 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                {/* Number */}
                <div
                  className="feature-num text-[11px] mb-6 transition-colors"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "rgba(255,255,255,0.15)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {f.num}
                </div>

                {/* Icon */}
                <div
                  className="feature-icon-wrap w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <img
                    src={f.img}
                    alt={f.title}
                    className="w-5 h-5 object-contain brightness-0 invert opacity-60"
                  />
                </div>

                {/* Title */}
                <h3
                  className="text-white font-semibold mb-3 leading-tight"
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 16,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {f.title}
                </h3>

                {/* Description */}
                <p
                  className="text-[13px] leading-relaxed mb-4"
                  style={{ color: "rgba(255,255,255,0.35)", fontWeight: 300 }}
                >
                  {f.desc}
                </p>

                {/* Arrow */}
                <ArrowUpRight
                  className="feature-arrow w-4 h-4 text-blue-400"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ BOTTOM GRADIENT */}
      <div
        className="h-24"
        style={{
          background: "linear-gradient(to bottom, #020817, #030e1f)",
        }}
      />
    </div>
  );
}

export default Homepage;