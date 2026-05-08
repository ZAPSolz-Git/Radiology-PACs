import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 flex items-center justify-center transition-all duration-500"
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "rgba(2,8,23,0.9)",
        border: "1px solid rgba(59,130,246,0.25)",
        backdropFilter: "blur(16px)",
        color: "rgba(255,255,255,0.7)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.9)",
        pointerEvents: visible ? "auto" : "none",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#1d4ed8";
        e.currentTarget.style.borderColor = "#3b82f6";
        e.currentTarget.style.color = "white";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(29,78,216,0.4)";
        e.currentTarget.style.transform = "translateY(-2px) scale(1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(2,8,23,0.9)";
        e.currentTarget.style.borderColor = "rgba(59,130,246,0.25)";
        e.currentTarget.style.color = "rgba(255,255,255,0.7)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
        e.currentTarget.style.transform = "translateY(0) scale(1)";
      }}
    >
      <ArrowUp size={16} />
    </button>
  );
};

export default ScrollToTopButton;