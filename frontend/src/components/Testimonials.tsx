import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const testimonialsData = [
  {
    id: 1,
    name: "Dr. Aris Thorne",
    role: "Chief Radiologist",
    org: "Neuro Center",
    message:
      "The cinematic precision of the viewing platform has revolutionized our diagnostic workflow. It's not just a tool — it's a leap forward in medical visualization.",
    initial: "AT",
  },
  {
    id: 2,
    name: "Sarah Jenkins",
    role: "Director of Operations",
    org: "MedLink Hospital",
    message:
      "Efficiency and clarity at every step. The hybrid PACS integration has saved us countless hours while improving patient outcomes through faster turnaround times.",
    initial: "SJ",
  },
  {
    id: 3,
    name: "Michael Lee",
    role: "Lead Technician",
    org: "Diagnostic Lab Solutions",
    message:
      "A seamless experience across all devices. The ability to access high-quality scans from anywhere has fundamentally changed how we collaborate.",
    initial: "ML",
  },
];

const Testimonials = () => {
  const [current, setCurrent] = useState(0);
  const length = testimonialsData.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [length, current]);

  const nextSlide = () =>
    setCurrent((prev) => (prev === length - 1 ? 0 : prev + 1));

  const prevSlide = () =>
    setCurrent((prev) => (prev === 0 ? length - 1 : prev - 1));

  const getVisibleTestimonials = () => [
    testimonialsData[current],
    testimonialsData[(current + 1) % length],
    testimonialsData[(current + 2) % length],
  ];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: "#030e1f", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @keyframes tFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .t-card { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        .t-card-center {
          background: rgba(29,78,216,0.08) !important;
          border-color: rgba(59,130,246,0.2) !important;
          transform: translateY(-4px);
        }
        .nav-arrow {
          transition: all 0.2s;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
        }
        .nav-arrow:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
          transform: scale(1.08);
        }
      `}</style>

      {/* Video BG */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ opacity: 0.12, transform: "scale(1.05)" }}
        >
          <source
            src="https://res.cloudinary.com/dozdgvgbt/video/upload/q_auto/f_auto/v1780641514/Brain_Scan_Medical_Image_3840x2160_ie7yzj.mp4"
            type="video/mp4"
          />
        </video>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, #030e1f 0%, rgba(3,14,31,0.6) 40%, rgba(3,14,31,0.6) 60%, #030e1f 100%)",
          }}
        />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-28">

        {/* Section header */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="text-[10px] text-blue-400 uppercase tracking-[0.18em]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              04 — Testimonials
            </span>
            <span
              className="w-10 h-px"
              style={{ background: "rgba(59,130,246,0.4)" }}
            />
          </div>
          <div className="flex items-end justify-between gap-8">
            <h2
              className="leading-none"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(36px, 5vw, 68px)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "white",
              }}
            >
              Trusted by
              <br />
              <span style={{ color: "#3b82f6" }}>world-class</span>
              <br />
              professionals.
            </h2>
            {/* Nav arrows */}
            <div className="hidden md:flex items-center gap-3 pb-3">
              <button
                onClick={prevSlide}
                className="nav-arrow w-12 h-12 rounded-full flex items-center justify-center text-white/70 hover:text-white"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextSlide}
                className="nav-arrow w-12 h-12 rounded-full flex items-center justify-center text-white/70 hover:text-white"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {getVisibleTestimonials().map((testimonial, index) => (
            <div
              key={`${testimonial.id}-${index}`}
              className={`t-card relative rounded-2xl p-8 flex flex-col ${index === 1 ? "t-card-center" : ""}`}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                opacity: index === 1 ? 1 : 0.65,
              }}
            >
              {/* Quote mark */}
              <div
                className="mb-6"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 64,
                  lineHeight: 0.6,
                  fontWeight: 800,
                  color: "rgba(59,130,246,0.25)",
                  userSelect: "none",
                }}
              >
                "
              </div>

              {/* Message */}
              <p
                className="text-[15px] leading-relaxed flex-1 mb-8"
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontWeight: 300,
                  fontStyle: "normal",
                }}
              >
                {testimonial.message}
              </p>

              {/* Author */}
              <div
                className="flex items-center gap-4 pt-6"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-bold text-blue-300 flex-shrink-0"
                  style={{
                    background: "rgba(29,78,216,0.2)",
                    border: "1px solid rgba(59,130,246,0.25)",
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  {testimonial.initial}
                </div>
                <div>
                  <div
                    className="font-semibold text-white text-[14px]"
                    style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.01em" }}
                  >
                    {testimonial.name}
                  </div>
                  <div
                    className="text-[11px] mt-0.5"
                    style={{
                      color: "rgba(255,255,255,0.35)",
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {testimonial.role} · {testimonial.org}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dots + mobile nav */}
        <div className="flex items-center justify-between">
          {/* Dots */}
          <div className="flex items-center gap-2">
            {testimonialsData.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: current === i ? 28 : 6,
                  height: 6,
                  background: current === i ? "#3b82f6" : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={prevSlide}
              className="nav-arrow w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextSlide}
              className="nav-arrow w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;