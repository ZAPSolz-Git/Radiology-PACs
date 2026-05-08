import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Menu, X, ChevronDown, LayoutDashboard, ArrowUpRight } from "lucide-react";
import mainLogo from "../assets/images/ArmorrayLogo.jpeg";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    // Inject premium fonts once
    if (!document.getElementById("armorray-fonts")) {
      const link = document.createElement("link");
      link.id = "armorray-fonts";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    {
      name: "Solutions",
      dropdown: [
        { name: "Radiology Center", path: "#" },
        { name: "Hospital", path: "#" },
        { name: "Clinic", path: "#" },
        { name: "Diagnostic Lab", path: "#" },
        { name: "Telemedicine", path: "#" },
        { name: "Pharmacy", path: "#" },
        { name: "Home Care", path: "#" },
      ],
    },
    {
      name: "PACS",
      dropdown: [
        { name: "My Clinic Hybrid PACS", path: "/radiology-pacs" },
        { name: "Features", path: "/cloud-pacs" },
        { name: "Read Anywhere", path: "/web-viewer" },
        { name: "Sharing", path: "/ai-integration" },
        { name: "Archiving", path: "/ris-integration" },
        { name: "Security & Safety", path: "/ris-integration" },
        { name: "Hardware", path: "/ris-integration" },
        { name: "RIS", path: "/ris-integration" },
        { name: "HIS-PACS Integration", path: "/ris-integration" },
      ],
    },
    { name: "Teleradiology", path: "/teleradiology" },
    { name: "Blog", path: "/blog" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <>
      <style>{`
        .nav-link-line::after {
          content: '';
          display: block;
          width: 0;
          height: 1px;
          background: #3b82f6;
          transition: width 0.3s ease;
          margin-top: 1px;
        }
        .nav-link-line:hover::after { width: 100%; }
        .dropdown-item {
          position: relative;
          transition: all 0.2s;
        }
        .dropdown-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 14px;
          background: #3b82f6;
          border-radius: 0 2px 2px 0;
          transition: width 0.2s ease;
        }
        .dropdown-item:hover::before { width: 2px; }
        .dropdown-item:hover { padding-left: 14px; }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dropdown-enter { animation: slideDown 0.2s ease forwards; }
      `}</style>

      <nav
        className="fixed top-0 left-0 w-full z-50 transition-all duration-500"
        style={{
          background: isScrolled
            ? "rgba(2, 8, 23, 0.85)"
            : "transparent",
          backdropFilter: isScrolled ? "blur(20px)" : "none",
          borderBottom: isScrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
          padding: isScrolled ? "14px 0" : "22px 0",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div
              className="relative overflow-hidden rounded-lg"
              style={{ width: 36, height: 36 }}
            >
              <img
                src={mainLogo}
                alt="Armorray"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 rounded-lg ring-1 ring-white/10" />
            </div>
            <span
              className="text-white text-[22px] font-bold tracking-tight"
              style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}
            >
              Armor<span style={{ color: "#3b82f6" }}>ray</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <ul className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <li
                key={link.name}
                className="relative"
                onMouseEnter={() => link.dropdown && setActiveDropdown(link.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {link.path ? (
                  <Link
                    to={link.path}
                    className="nav-link-line text-white/70 hover:text-white text-[13px] font-medium transition-colors"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.01em" }}
                  >
                    {link.name}
                  </Link>
                ) : (
                  <button
                    className="flex items-center gap-1 text-white/70 hover:text-white text-[13px] font-medium transition-colors"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="nav-link-line">{link.name}</span>
                    <ChevronDown
                      className="w-3.5 h-3.5 transition-transform duration-300"
                      style={{
                        transform: activeDropdown === link.name ? "rotate(180deg)" : "rotate(0deg)",
                        color: activeDropdown === link.name ? "#3b82f6" : "inherit",
                      }}
                    />
                  </button>
                )}

                {/* Dropdown */}
                {link.dropdown && activeDropdown === link.name && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-5 dropdown-enter">
                    <div
                      className="rounded-2xl overflow-hidden py-3"
                      style={{
                        background: "rgba(5, 10, 25, 0.96)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backdropFilter: "blur(24px)",
                        width: link.name === "PACS" ? 260 : 220,
                        boxShadow: "0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
                      }}
                    >
                      {/* Dropdown header */}
                      <div
                        className="px-5 pb-2 mb-1"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <span
                          className="text-[10px] font-medium text-blue-400 uppercase tracking-[0.1em]"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {link.name}
                        </span>
                      </div>
                      {(link.dropdown as { name: string; path: string }[]).map((item) => (
                        <Link
                          key={item.name}
                          to={item.path}
                          className="dropdown-item flex items-center justify-between mx-2 px-3 py-2 rounded-lg text-[13px] text-white/60 hover:text-white transition-colors"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          <span>{item.name}</span>
                          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-400 flex-shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-4">
            {isAuthenticated && user ? (
              <Link
                to={`/dashboard/${user.role}`}
                className="flex items-center gap-2 text-white text-[13px] font-semibold px-5 py-2.5 rounded-full transition-all hover:-translate-y-px"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  background: "#1d4ed8",
                  boxShadow: "0 0 0 1px rgba(59,130,246,0.3), 0 8px 20px rgba(29,78,216,0.3)",
                }}
              >
                <LayoutDashboard size={15} />
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-[13px] font-semibold px-5 py-2.5 rounded-full transition-all hover:-translate-y-px"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  border: isScrolled ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(59,130,246,0.12)";
                  e.currentTarget.style.borderColor = "rgba(59,130,246,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = isScrolled
                    ? "rgba(59,130,246,0.5)"
                    : "rgba(255,255,255,0.2)";
                }}
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-white/80 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className="fixed inset-0 top-0 lg:hidden transition-all duration-500"
          style={{
            background: "#020817",
            opacity: isMenuOpen ? 1 : 0,
            visibility: isMenuOpen ? "visible" : "hidden",
            transform: isMenuOpen ? "translateX(0)" : "translateX(100%)",
            zIndex: 40,
          }}
        >
          {/* Mobile top bar */}
          <div className="flex items-center justify-between px-6 pt-6 pb-8">
            <Link
              to="/"
              className="flex items-center gap-3"
              onClick={() => setIsMenuOpen(false)}
            >
              <img src={mainLogo} alt="Armorray" className="h-8 w-auto rounded-lg" />
              <span
                className="text-white text-xl font-bold"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Armor<span style={{ color: "#3b82f6" }}>ray</span>
              </span>
            </Link>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 rounded-xl text-white/60 hover:text-white"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <X size={20} />
            </button>
          </div>

          <div
            className="px-6 overflow-y-auto"
            style={{ height: "calc(100vh - 100px)" }}
          >
            {/* Thin divider */}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: 28 }} />

            <ul className="flex flex-col gap-1">
              {navLinks.map((link, idx) => (
                <li key={link.name}>
                  {link.path ? (
                    <Link
                      to={link.path}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-between py-4 text-white/70 hover:text-white transition-colors"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 20,
                        fontWeight: 500,
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <span>{link.name}</span>
                      <span
                        className="text-white/20"
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </Link>
                  ) : (
                    <div>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)}
                        className="w-full flex items-center justify-between py-4 text-white/70 hover:text-white transition-colors"
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 20,
                          fontWeight: 500,
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <span>{link.name}</span>
                        <ChevronDown
                          className="w-4 h-4 transition-transform"
                          style={{
                            transform: activeDropdown === link.name ? "rotate(180deg)" : "rotate(0deg)",
                            color: "#3b82f6",
                          }}
                        />
                      </button>
                      {link.dropdown && activeDropdown === link.name && (
                        <ul className="pl-4 pb-4 flex flex-col gap-2 mt-2">
                          {(link.dropdown as { name: string; path: string }[]).map((item) => (
                            <li key={item.name}>
                              <Link
                                to={item.path}
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-2 py-1.5 text-white/50 hover:text-blue-400 transition-colors text-[15px]"
                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                              >
                                <span
                                  className="w-1 h-1 rounded-full bg-blue-500/50 flex-shrink-0"
                                />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-10 pb-10">
              {isAuthenticated && user ? (
                <Link
                  to={`/dashboard/${user.role}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-bold"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    background: "#1d4ed8",
                    boxShadow: "0 8px 24px rgba(29,78,216,0.35)",
                  }}
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center w-full py-4 rounded-2xl text-white font-bold"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  Sign In to Portal
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;