import React from "react";

const logos = [
  "../assets/images/Slider/logo-transparent.png",
  "../assets/images/Slider/logo.webp",
  "../assets/images/Slider/Thyrocare_new_Logo2022.png",
  "../assets/images/Slider/pulse-logo-342x138.webp",
  "../assets/images/Slider/Manipal_Hospitals.png",
];

const LogoMarquee = () => {
  return (
    <section className="relative w-full overflow-hidden pt-2 pb-6">
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-infinite {
          animation: marquee-scroll 35s linear infinite;
        }
        .animate-marquee-infinite:hover {
          animation-play-state: paused;
        }
        .logo-mask {
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }
      `}</style>

      {/* Optional eyebrow text to fit the premium vibe */}
      <div className="flex flex-col items-center justify-center mb-10">
        <div className="flex items-center gap-3">
          <span className="w-8 h-px bg-blue-500/30" />
          <span 
            className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Trusted by industry leaders
          </span>
          <span className="w-8 h-px bg-blue-500/30" />
        </div>
      </div>

      <div className="logo-mask relative flex w-full overflow-hidden max-w-7xl mx-auto">
        <div className="flex w-max animate-marquee-infinite">
          {/* We render 4 identical sets to seamlessly cover even ultra-wide displays.
              Translating by -50% perfectly shifts 2 complete sets to the left before snapping back. */}
          {[1, 2, 3, 4].map((set) => (
            <div key={set} className="flex items-center justify-around w-max gap-16 px-8">
              {logos.map((logo, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-center w-40 h-20 group cursor-pointer"
                >
                  <img
                    src={logo}
                    alt={`Partner Logo ${index + 1}`}
                    className="max-h-12 w-auto object-contain brightness-0 invert opacity-40 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LogoMarquee;
