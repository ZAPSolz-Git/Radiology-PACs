import React from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";

const Blogs = () => {
  const blogPosts = [
    {
      id: 1,
      title: "Advanced Medical Imaging Solutions",
      excerpt:
        "Explore how modern imaging platforms are transforming diagnostics with faster reporting, cross-device accessibility, and enhanced patient outcomes.",
      image: "../assets/images/Sample-Images/image-5.jpg",
      date: "Oct 24, 2025",
      category: "Innovation",
      readTime: "6 min read",
      num: "01",
    },
    {
      id: 2,
      title: "Secure & Vendor-Neutral Archives",
      excerpt:
        "Learn how hybrid PACS systems ensure long-term storage, security, and seamless access across different vendors and healthcare networks.",
      image: "../assets/images/Sample-Images/image-6.jpg",
      date: "Nov 12, 2025",
      category: "Security",
      readTime: "4 min read",
      num: "02",
    },
  ];

  return (
    <div
      className="w-full text-white"
      style={{ background: "#020817", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        .blog-img { transition: transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .blog-card:hover .blog-img { transform: scale(1.04); }
        .blog-title-link { transition: color 0.2s; }
        .blog-title-link:hover { color: #60a5fa; }
        .read-more-line::after {
          content: '';
          display: block;
          width: 0;
          height: 1px;
          background: #3b82f6;
          transition: width 0.3s ease;
          margin-top: 2px;
        }
        .read-more-btn:hover .read-more-line::after { width: 100%; }
        .read-more-btn:hover .arrow-icon { transform: translate(3px, -3px); }
        .arrow-icon { transition: transform 0.25s ease; }
      `}</style>

      {/* ── Hero Banner */}
      <section
        className="relative w-full overflow-hidden"
        style={{ height: "clamp(280px, 35vw, 420px)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('../assets/images/5820.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            filter: "grayscale(1)",
            opacity: 0.15,
          }}
        />
        {/* Gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(2,8,23,0.4) 0%, rgba(2,8,23,0.5) 60%, #020817 100%)",
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        <div className="relative h-full flex flex-col items-start justify-end px-6 md:px-12 pb-14 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-[10px] text-blue-400 uppercase tracking-[0.18em]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              03 — Articles
            </span>
            <span
              className="w-10 h-px"
              style={{ background: "rgba(59,130,246,0.4)" }}
            />
          </div>
          <h1
            className="leading-none"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(42px, 7vw, 88px)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              color: "white",
            }}
          >
            Insights &amp;{" "}
            <span style={{ color: "#3b82f6" }}>Updates</span>
          </h1>
        </div>
      </section>

      {/* ── Blog Posts */}
      <section
        className="py-24 px-6 md:px-12 relative overflow-hidden"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Accent glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            left: "20%",
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(29,78,216,0.05) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col gap-0">
          {blogPosts.map((post, index) => (
            <article
              key={post.id}
              className="blog-card grid lg:grid-cols-12 gap-8 lg:gap-16 items-center py-16"
              style={{
                borderBottom: index < blogPosts.length - 1
                  ? "1px solid rgba(255,255,255,0.05)"
                  : "none",
              }}
            >
              {/* Image */}
              <div
                className={`relative rounded-2xl overflow-hidden lg:col-span-5 ${index % 2 === 1 ? "lg:order-2" : "lg:order-1"}`}
                style={{
                  aspectRatio: "16/10",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {/* Category pill */}
                <div
                  className="absolute top-5 left-5 z-20"
                  style={{
                    background: "rgba(29,78,216,0.9)",
                    backdropFilter: "blur(10px)",
                    padding: "4px 12px",
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#93c5fd",
                  }}
                >
                  {post.category}
                </div>

                {/* Post number */}
                <div
                  className="absolute bottom-5 right-5 z-20"
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 64,
                    fontWeight: 800,
                    color: "rgba(255,255,255,0.06)",
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    userSelect: "none",
                  }}
                >
                  {post.num}
                </div>

                <img
                  src={post.image}
                  alt={post.title}
                  className="blog-img w-full h-full object-cover"
                  style={{ transform: "scale(1)" }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to top, rgba(2,8,23,0.4) 0%, transparent 50%)",
                  }}
                />
              </div>

              {/* Text */}
              <div
                className={`lg:col-span-7 flex flex-col gap-6 ${index % 2 === 1 ? "lg:order-1" : "lg:order-2"}`}
              >
                {/* Meta */}
                <div
                  className="flex items-center gap-4"
                  style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {post.date}
                  </span>
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.2)" }}
                  />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {post.readTime}
                  </span>
                </div>

                {/* Title */}
                <h2
                  className="blog-title-link leading-tight"
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "clamp(26px, 3vw, 42px)",
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p
                  className="text-[16px] leading-relaxed max-w-lg"
                  style={{ color: "rgba(255,255,255,0.45)", fontWeight: 300 }}
                >
                  {post.excerpt}
                </p>

                {/* Read more */}
                <button className="read-more-btn w-fit flex items-center gap-2 group pt-2">
                  <span
                    className="read-more-line"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "white",
                    }}
                  >
                    Read Article
                  </span>
                  <ArrowUpRight
                    size={16}
                    className="arrow-icon text-blue-400"
                  />
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* View all link */}
        <div className="max-w-7xl mx-auto mt-12 flex justify-center">
          <a
            href="/blog"
            className="inline-flex items-center gap-2 text-white/40 hover:text-white text-[13px] font-medium transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            View all articles
            <ArrowRight size={14} />
          </a>
        </div>
      </section>

      <div
        className="h-24"
        style={{ background: "linear-gradient(to bottom, #020817, #030e1f)" }}
      />
    </div>
  );
};

export default Blogs;