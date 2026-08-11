import { Link } from "react-router-dom";
import {
  FaInstagram,
  FaFacebookF,
  FaLinkedinIn,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";
import { Mail, ArrowUpRight } from "lucide-react";
import mainLogo from "../assets/images/ArmorrayLogo.jpeg";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    services: [
      "MRI Scans",
      "CT Scans",
      "PET-CT Scans",
      "Master Health Checkup",
      "Health Checkup",
      "Compare Lab Packages",
      "India's Top Labs",
      "Best Packages",
    ],
    company: [
      "About Us",
      "Terms & Conditions",
      "Privacy Policy",
      "Refund & Cancellation",
    ],
    socials: [
      { Icon: FaInstagram, label: "Instagram" },
      { Icon: FaFacebookF, label: "Facebook" },
      { Icon: FaLinkedinIn, label: "LinkedIn" },
      { Icon: FaTwitter, label: "Twitter" },
      { Icon: FaYoutube, label: "YouTube" },
    ],
  };

  const paymentIcons = [
    { src: "/assets/images/Footer/icons8-google-pay-96.png", alt: "Google Pay" },
    { src: "/assets/images/Footer/Paytm_logo.png", alt: "Paytm" },
    { src: "/assets/images/Footer/Rupay-Logo.png", alt: "Rupay" },
    { src: "/assets/images/Footer/64px-PhonePe_Logo.png", alt: "PhonePe" },
  ];

  return (
    <footer
      className="text-white relative overflow-hidden"
      style={{
        background: "#020817",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        .footer-link {
          transition: all 0.2s;
          color: rgba(255,255,255,0.35);
          position: relative;
        }
        .footer-link:hover { color: rgba(255,255,255,0.8); padding-left: 6px; }
        .social-btn {
          transition: all 0.2s;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .social-btn:hover { background: #1d4ed8; border-color: #1d4ed8; transform: translateY(-2px); }
      `}</style>

      {/* Big brand statement */}
      <div
        className="max-w-7xl mx-auto px-6 md:px-12 pt-24 pb-16"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-[10px] text-blue-400 uppercase tracking-[0.18em]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Armorray
              </span>
              <span
                className="w-8 h-px"
                style={{ background: "rgba(59,130,246,0.4)" }}
              />
            </div>
            <h2
              className="leading-none"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(40px, 6vw, 80px)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "white",
                maxWidth: 700,
              }}
            >
              Precision imaging.
              <br />
              <span style={{ color: "rgba(255,255,255,0.25)" }}>
                Globally trusted.
              </span>
            </h2>
          </div>
          <div className="flex-shrink-0">
            <a
              href="/contact"
              className="inline-flex items-center gap-2 text-white text-[14px] font-semibold px-8 py-4 rounded-full transition-all hover:-translate-y-px"
              style={{
                background: "#1d4ed8",
                boxShadow: "0 0 0 1px rgba(59,130,246,0.3), 0 12px 28px rgba(29,78,216,0.3)",
              }}
            >
              Get in Touch
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3 w-max group">
              <img
                src={mainLogo}
                alt="Armorray"
                className="h-9 w-auto rounded-lg"
              />
              <span
                className="text-white text-xl font-bold"
                style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}
              >
                Armor<span style={{ color: "#3b82f6" }}>ray</span>
              </span>
            </Link>
            <p
              className="text-[13px] leading-relaxed max-w-xs"
              style={{ color: "rgba(255,255,255,0.35)", fontWeight: 300 }}
            >
              Next-generation radiology solutions providing cinematic precision
              and diagnostic excellence across the globe.
            </p>
            <div className="flex gap-3">
              {footerLinks.socials.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  className="social-btn w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white"
                  aria-label={label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3
              className="text-white font-semibold mb-6 uppercase tracking-[0.1em] text-[11px]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Services
            </h3>
            <ul className="space-y-3">
              {footerLinks.services.map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="footer-link text-[13px] flex items-center gap-1"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3
              className="text-white font-semibold mb-6 uppercase tracking-[0.1em] text-[11px]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Company
            </h3>
            <ul className="space-y-3 mb-10">
              {footerLinks.company.map((item) => (
                <li key={item}>
                  <a href="#" className="footer-link text-[13px]">
                    {item}
                  </a>
                </li>
              ))}
            </ul>

            <h3
              className="text-white font-semibold mb-4 uppercase tracking-[0.1em] text-[11px]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Payments
            </h3>
            <div className="flex flex-wrap gap-2">
              {paymentIcons.map((icon, idx) => (
                <div
                  key={idx}
                  className="h-7 w-12 rounded-md flex items-center justify-center p-1.5 grayscale opacity-30 hover:grayscale-0 hover:opacity-70 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <img
                    src={icon.src}
                    alt={icon.alt}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3
              className="text-white font-semibold mb-6 uppercase tracking-[0.1em] text-[11px]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Contact
            </h3>
            <div className="flex items-start gap-4 mb-8">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(29,78,216,0.1)",
                  border: "1px solid rgba(59,130,246,0.2)",
                  color: "#60a5fa",
                }}
              >
                <Mail size={16} />
              </div>
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.1em] mb-1"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  Email
                </p>
                <a
                  href="mailto:info@armorray.com"
                  className="text-[13px] text-white/70 hover:text-blue-400 transition-colors"
                >
                  info@armorray.com
                </a>
              </div>
            </div>
            <div
              className="rounded-xl p-5"
              style={{
                background: "rgba(29,78,216,0.06)",
                border: "1px solid rgba(59,130,246,0.12)",
              }}
            >
              <p
                className="text-[12px] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.35)", fontWeight: 300 }}
              >
                Stay updated with our latest medical imaging breakthroughs
                and product releases.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <p
          className="text-[11px]"
          style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          © {currentYear} Armorray. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <span
            className="text-[10px] uppercase tracking-[0.1em]"
            style={{
              color: "rgba(255,255,255,0.15)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Powered by ZAPWMS
          </span>
          <img
            src={mainLogo}
            alt="Armorray"
            className="h-5 opacity-20 hover:opacity-50 transition-opacity rounded"
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;