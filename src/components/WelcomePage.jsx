import React, { useCallback, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  QrCode, Shield, Clock, ArrowRight, UserCheck, Stethoscope,
  ChevronRight, ChevronLeft, Upload, ScanLine, CheckCircle2, Lock,
  Folder, Calendar, AlertTriangle, Wand2, Heart, MessageSquare,
  Activity, Database, Users
} from "lucide-react";
import GlassLayout from "./GlassLayout";
import { GlassCard, PrimaryButton, SecondaryButton, Badge } from "./ui/Glass";
import { ScrollReveal } from "./ui/ScrollReveal";
import dnaBg from "../assets/dna-bg.svg";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { fetchTrackedAdUrl, fetchWebLandingAds } from "../superadmin/api";
import { usePublicConfigRealtime } from "../hooks/usePublicConfigRealtime";

const WelcomePage = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const coreRef = useRef(null);
  const isMountedRef = useRef(true);
  const statsInView = useInView(statsRef, { once: true, margin: "-20%" });
  const coreInView = useInView(coreRef, { once: true, margin: "-10%" });

  // ── Scroll progress bar ──
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // ── Parallax for hero background orbs — removed, was conflicting with animate prop

  // Ultra-refined animation presets
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for more premium motion
        delay
      }
    })
  };

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const cardReveal = {
    hidden: { opacity: 0, scale: 0.96, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const sectionHeaderStagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } }
  };

  const sectionHeaderChild = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      // Approximate width of card (380px) + gap (24px)
      scrollRef.current.scrollBy({ left: -404, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 404, behavior: "smooth" });
    }
  };

  // KPI Card State Management
  const [activeKpiIndex, setActiveKpiIndex] = useState(0);
  const [landingAds, setLandingAds] = useState([]);

  const adThemePresets = [
    {
      ring1: "from-[#0D9488] to-[#22D3EE]",
      ring2: "from-[#0D9488]/15 to-[#22D3EE]/10",
      dotColor: "bg-[#0EA5A4]",
      gradient: "from-[#0D9488] to-[#22D3EE]",
    },
    {
      ring1: "from-[#0EA5A4] to-[#0891B2]",
      ring2: "from-[#0EA5A4]/15 to-[#0891B2]/10",
      dotColor: "bg-[#0EA5A4]",
      gradient: "from-[#0EA5A4] to-[#0891B2]",
    },
    {
      ring1: "from-[#0F172A] to-[#0EA5A4]",
      ring2: "from-[#0F172A]/10 to-[#0EA5A4]/12",
      dotColor: "bg-[#22D3EE]",
      gradient: "from-[#0F172A] to-[#0EA5A4]",
    },
    {
      ring1: "from-[#0369A1] to-[#0EA5A4]",
      ring2: "from-[#0369A1]/12 to-[#0EA5A4]/10",
      dotColor: "bg-[#38BDF8]",
      gradient: "from-[#0369A1] to-[#0EA5A4]",
    },
  ];

  const showcaseSlides = landingAds
    .filter((ad) => ad?.isActive !== false)
    .map((ad, index, source) => {
      const theme = adThemePresets[index % adThemePresets.length];
      const placement = String(ad?.placement || "WEB_LANDING")
        .replace(/_/g, " ")
        .toUpperCase();

      return {
        id: ad?._id || `ad-${index}`,
        badge: placement,
        title: String(ad?.title || "Medical Vault Advertisement"),
        subtitle: "",
        desc: ad?.redirectUrl
          ? "Tap to open partner offer"
          : "Sponsored update from Medical Vault",
        metric: `${index + 1}/${source.length}`,
        metricLabel: "Ad Slot",
        imageUrl: String(ad?.imageUrl || ""),
        redirectUrl: String(ad?.redirectUrl || ""),
        iconEl: <Shield className="w-7 h-7 text-white" strokeWidth={2} />,
        ...theme,
      };
    });


  // Auto-rotate showcase every 4 seconds — resets when user manually changes slide
  useEffect(() => {
    if (showcaseSlides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveKpiIndex((prev) => (prev + 1) % showcaseSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [showcaseSlides.length]);

  const loadLandingAds = useCallback(async () => {
    try {
      const ads = await fetchWebLandingAds();
      if (!isMountedRef.current) return;
      setLandingAds(Array.isArray(ads) ? ads : []);
    } catch {
      if (!isMountedRef.current) return;
      setLandingAds([]);
    }
  }, []);

  useEffect(() => {
    loadLandingAds();
  }, [loadLandingAds]);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  usePublicConfigRealtime({
    platform: "WEB",
    surface: "WEB_LANDING",
    onEvent: (event) => {
      if (event.type === "ads.updated" || event.type === "ui-config.updated") {
        loadLandingAds();
      }
    },
  });

  useEffect(() => {
    if (showcaseSlides.length === 0) {
      if (activeKpiIndex !== 0) setActiveKpiIndex(0);
      return;
    }

    if (activeKpiIndex >= showcaseSlides.length) {
      setActiveKpiIndex(0);
    }
  }, [activeKpiIndex, showcaseSlides.length]);

  const handleKpiNext = () => {
    if (showcaseSlides.length === 0) return;
    setActiveKpiIndex((prev) => (prev + 1) % showcaseSlides.length);
  };

  const handleKpiPrev = () => {
    if (showcaseSlides.length === 0) return;
    setActiveKpiIndex((prev) => (prev - 1 + showcaseSlides.length) % showcaseSlides.length);
  };

  const handleKpiDotClick = (index) => {
    if (activeKpiIndex === index) return;
    setActiveKpiIndex(index);
  };

  const getTrackingPayload = () => {
    let userId = "";
    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        userId = String(parsed?.id || parsed?._id || "").trim();
      }
    } catch {
      userId = "";
    }
    const userType = String(localStorage.getItem("role") || "anonymous");
    return { userId, userType };
  };

  const handleAdRedirect = async (slide) => {
    const fallbackUrl = String(slide?.redirectUrl || "").trim();
    if (!fallbackUrl) return;

    let targetUrl = fallbackUrl;
    const adId = String(slide?.id || "").trim();
    if (adId && adId !== "empty") {
      const tracking = getTrackingPayload();
      const trackedUrl = await fetchTrackedAdUrl({
        adId,
        platform: "web",
        surface: "WEB_LANDING",
        userId: tracking.userId,
        userType: tracking.userType,
        sourceApp: "healthvault_web",
      });
      if (trackedUrl) targetUrl = trackedUrl;
    }

    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const activeSlide = showcaseSlides[activeKpiIndex] || {
    id: "empty",
    badge: "WEB LANDING",
    title: "No Active Advertisements",
    subtitle: "",
    desc: "Create active WEB_LANDING advertisements from SuperAdmin.",
    metric: "0/0",
    metricLabel: "Ad Slot",
    imageUrl: "",
    redirectUrl: "",
    ring1: "from-[#0D9488] to-[#22D3EE]",
    ring2: "from-[#0D9488]/15 to-[#22D3EE]/10",
    dotColor: "bg-[#0EA5A4]",
    gradient: "from-[#0D9488] to-[#22D3EE]",
    iconEl: <Shield className="w-7 h-7 text-white" strokeWidth={2} />,
  };
  const hasLandingAds = showcaseSlides.length > 0;

  return (
    <GlassLayout>
      {/* ── Scroll Progress Bar ── */}
      <motion.div
        style={{ scaleX, transformOrigin: "left" }}
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#0EA5A4] to-[#22D3EE] z-[999] pointer-events-none"
      />

      {/* --- EXCLUSIVE HERO BACKGROUND EXTRAS (PREMIUM LIGHTING) --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">

        {/* Base Gradient & Animated Glows */}
        <motion.div
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 z-[-1]"
          style={{
            background: `
              radial-gradient(circle at 20% 30%, rgba(13,148,136,0.15), transparent 40%),
              radial-gradient(circle at 80% 40%, rgba(14,165,233,0.12), transparent 50%),
              linear-gradient(135deg, #F8FAFC 0%, #E6FFFA 100%)
            `,
            backgroundSize: "150% 150%",
            filter: "blur(0px)"
          }}
        />

        {/* Subtle Medical Grid Pattern */}
        <div
          className="absolute inset-0 z-[-1] opacity-[0.03] pointer-events-none mix-blend-multiply"
          style={{
            backgroundImage: `
              linear-gradient(to right, #0EA5A4 1px, transparent 1px),
              linear-gradient(to bottom, #0EA5A4 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Abstract DNA Overlay (Geometric Wireframe) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.04 }}
          transition={{ duration: 2 }}
          className="absolute top-[-40px] right-[-140px] w-full h-[1500px] mix-blend-multiply"
          style={{
            backgroundImage: `url(${dnaBg})`,
            backgroundSize: '110% auto',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right -40px',
            filter: 'blur(1.5px)'
          }}
        />

        {/* Subtle Floating Particles / Blurred Medical Orbs */}
        {/* Only use framer-motion animate — no conflicting style transforms */}
        <motion.div
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[25%] left-[8%] w-32 h-32 bg-gradient-to-br from-[#0EA5A4]/20 to-transparent rounded-full blur-[24px]"
        />
        <motion.div
          animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[45%] right-[32%] w-24 h-24 bg-gradient-to-br from-[#22D3EE]/20 to-transparent rounded-full blur-[18px]"
        />
      </div>

      {/* --- HERO SECTION --- */}
      <div
        className={`w-full grid ${hasLandingAds ? "lg:grid-cols-[1.1fr_0.9fr]" : "lg:grid-cols-1"} gap-12 lg:gap-16 items-center pt-[120px] pb-[120px] mb-8 relative z-10 px-4 max-w-[1280px] mx-auto`}
        ref={heroRef}
      >
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-8 text-left relative z-10 pr-4">

          <motion.div
            initial="hidden" animate="visible" custom={0}
            variants={fadeUp}
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/80 border border-[#E2E8F0] w-max mb-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-center p-1.5 rounded-full bg-[#0EA5A4]/10">
              <Stethoscope className="w-4 h-4 text-[#0EA5A4]" strokeWidth={2.5} />
            </div>
            <span className="text-[13.5px] font-[700] tracking-tight text-[#0EA5A4]">AI-Powered Healthcare</span>
          </motion.div>

          <motion.h1
            initial="hidden" animate="visible" custom={0.1}
            variants={fadeUp}
            className="text-[#0F172A] text-5xl md:text-6xl lg:text-[72px] font-[900] leading-[1.05] tracking-[-0.04em] mb-2"
          >
            Welcome to<br />
            <span className="bg-gradient-to-r from-[#0EA5A4] to-[#22D3EE] bg-clip-text text-transparent tracking-[-0.02em]">
              Medical Vault
            </span>
          </motion.h1>

          <motion.p
            initial="hidden" animate="visible" custom={0.2}
            variants={fadeUp}
            className="text-[#475569] text-lg md:text-[20px] font-medium leading-[1.7] max-w-[600px] lg:max-w-[85%]"
          >
            Medical Vault connects doctors and patients through a secure, intelligent platform powered by real-time AI and advanced data protection.
          </motion.p>

          <motion.div
            initial="hidden" animate="visible" custom={0.3}
            variants={fadeUp}
            className="flex items-center gap-4 mt-8 flex-wrap"
          >
            {/* Pulsing glow ring behind primary button */}
            <div className="relative group">
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.15, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-2xl bg-[#0EA5A4] blur-[18px] pointer-events-none"
              />
              <motion.button
                onClick={() => navigate("/signup")}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="relative overflow-hidden h-[58px] px-12 text-[16px] font-[800] rounded-2xl bg-gradient-to-r from-[#0EA5A4] to-[#0891B2] text-white flex items-center gap-3 shadow-[0_12px_32px_rgba(14,165,164,0.35)] focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/50 focus:ring-offset-2"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none" />
                <span className="relative z-10 tracking-tight">Get Started</span>
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10"
                >
                  <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                </motion.span>
              </motion.button>
            </div>

            {/* Our Product secondary button */}
            <motion.button
              onClick={() => navigate("/products")}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="h-[58px] px-10 text-[15px] font-[700] rounded-2xl bg-white/80 border border-[#CBD5E1] text-[#0F172A] flex items-center gap-2.5 backdrop-blur-sm hover:border-[#0EA5A4] hover:text-[#0EA5A4] transition-colors duration-200 shadow-[0_4px_16px_rgba(15,23,42,0.06)] focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/40 focus:ring-offset-2"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Our Product
            </motion.button>

          </motion.div>

        </div>

        {/* RIGHT COLUMN - ANIMATED SHOWCASE CARD */}
        {hasLandingAds ? (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative z-10 w-full flex justify-center lg:justify-end"
          >
          {/* Use framer-motion for float — avoids CSS transform conflict with motion.div parent */}
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="w-full max-w-[420px]"
          >
            {/* Outer glow that changes with slide */}
            <motion.div
              key={activeKpiIndex + "-glow"}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`absolute inset-[-20px] rounded-[44px] bg-gradient-to-br ${activeSlide.ring2} blur-[40px] pointer-events-none`}
            />

            <div className="relative bg-white rounded-[28px] shadow-[0_30px_80px_rgba(15,23,42,0.12)] border border-white/80 overflow-hidden">

              {/* Top gradient bar that changes per slide */}
              <motion.div
                key={activeKpiIndex + "-bar"}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`h-1 w-full bg-gradient-to-r ${activeSlide.ring1} origin-left`}
              />

              <div className="p-7 flex flex-col gap-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Live indicator */}
                    <div className="relative flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${activeSlide.dotColor} relative`}>
                        <span className={`absolute inset-0 rounded-full ${activeSlide.dotColor} animate-ping opacity-60`} />
                      </span>
                      <span className="text-[12px] font-[700] text-[#64748B] uppercase tracking-[0.1em]">Live</span>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0]">
                    <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${activeSlide.ring1}`} />
                    <span className="text-[11px] font-[800] text-[#0F172A] uppercase tracking-[0.1em]">{activeSlide.badge}</span>
                  </div>
                </div>

                {/* Animated Content Area */}
                <div className="relative h-[200px] overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeKpiIndex}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0"
                    >
                      {activeSlide.imageUrl ? (
                        <img
                          src={activeSlide.imageUrl}
                          alt={activeSlide.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className={`h-full w-full bg-gradient-to-br ${activeSlide.gradient} flex items-center justify-center`}
                        >
                          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
                            {activeSlide.iconEl}
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/5" />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <p className="text-[11px] font-[700] uppercase tracking-[0.12em] text-white/85">
                          {activeSlide.metricLabel} {activeSlide.metric}
                        </p>
                        <h3 className="mt-1 text-[18px] font-[900] leading-tight text-white">
                          {activeSlide.title}
                        </h3>
                        <p className="mt-1 text-[12px] font-medium text-white/85">
                          {activeSlide.desc}
                        </p>
                        {activeSlide.redirectUrl ? (
                          <button
                            type="button"
                            onClick={() => handleAdRedirect(activeSlide)}
                            className="mt-2 inline-flex items-center gap-1 text-[12px] font-[700] text-cyan-100 hover:text-white"
                          >
                            Open offer <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Progress Dots + Nav */}
                <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                  <div className="flex gap-2 items-center">
                    {showcaseSlides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveKpiIndex(i)}
                        className={`rounded-full transition-all duration-300 ${i === activeKpiIndex
                          ? `w-6 h-2 bg-gradient-to-r ${activeSlide.ring1}`
                          : 'w-2 h-2 bg-[#E2E8F0] hover:bg-[#CBD5E1]'
                          }`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleKpiPrev}
                      className="w-9 h-9 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={handleKpiNext}
                      className={`w-9 h-9 rounded-full bg-gradient-to-r ${activeSlide.ring1} flex items-center justify-center text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
                    >
                      <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </motion.div>
        ) : null}
      </div>



      {/* ══════════════════════════════════════════════ */}
      {/* FEATURES SHOWCASE SECTION - Zigzag with Images */}
      {/* ══════════════════════════════════════════════ */}
      <div className="w-full relative mt-8 mb-16">

        {/* Section Header — staggered children */}
        <motion.div
          variants={sectionHeaderStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-20 px-6 max-w-[700px] mx-auto"
        >
          <motion.div variants={sectionHeaderChild} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0EA5A4]/10 border border-[#0EA5A4]/15 w-fit mb-6 mx-auto">
            <Activity className="w-3.5 h-3.5 text-[#0EA5A4]" />
            <span className="text-[12px] font-[800] uppercase tracking-[0.15em] text-[#0EA5A4]">Why Medical Vault</span>
          </motion.div>
          <motion.h2 variants={sectionHeaderChild} className="text-[#0F172A] text-4xl md:text-[52px] font-[900] leading-[1.05] tracking-[-0.04em] mb-5">
            A platform built for<br />
            <span className="bg-gradient-to-r from-[#0EA5A4] to-[#22D3EE] bg-clip-text text-transparent">modern healthcare</span>
          </motion.h2>
          <motion.p variants={sectionHeaderChild} className="text-[#475569] text-lg leading-[1.75] font-medium">
            Everything doctors and patients need — in one secure, intelligent ecosystem.
          </motion.p>
        </motion.div>

        {/* Connector line — draws in as section enters view */}
        <motion.div
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-1/2 top-[200px] bottom-[120px] w-[1.5px] bg-gradient-to-b from-transparent via-[#0EA5A4]/25 to-transparent -translate-x-1/2 hidden lg:block pointer-events-none origin-top"
        />

        {/* Feature Rows */}
        <div className="flex flex-col gap-[100px] max-w-[1200px] mx-auto px-6">

          {/* ─ Feature 1: IMAGE LEFT ─ */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center"
          >
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0EA5A4]/10 to-[#22D3EE]/8 rounded-[30px] blur-[50px] scale-105 pointer-events-none" />
              <div className="relative group rounded-[24px] overflow-hidden shadow-[0_25px_70px_rgba(15,23,42,0.10)] border border-[#E2E8F0]/80 bg-white hover:-translate-y-2 hover:shadow-[0_35px_90px_rgba(15,23,42,0.14)] transition-all duration-500">
                <img src="/feature_chatbot_support.png" alt="AI Chatbot Support" className="w-full h-auto object-cover group-hover:scale-[1.03] transition-transform duration-700" />
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="flex flex-col gap-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0EA5A4]/10 border border-[#0EA5A4]/15 w-fit">
                <span className="text-[12px] font-[800] uppercase tracking-[0.15em] text-[#0EA5A4]">Feature 01</span>
              </div>
              <div>
                <h3 className="text-[#0F172A] text-[38px] font-[900] leading-[1.08] tracking-[-0.04em] mb-4">
                  End-to-End<br />
                  <span className="bg-gradient-to-r from-[#0EA5A4] to-[#22D3EE] bg-clip-text text-transparent">Clinical Telemetry</span>
                </h3>
                <p className="text-[#475569] text-[17px] leading-[1.8] font-medium max-w-[460px]">
                  Medical Vault doesn't just store files; it captures a living health record. Stream vitals directly to your physician's dashboard with sub-second latency for remote critical care.
                </p>
              </div>
              <ul className="flex flex-col gap-3 mt-2">
                {["Real-time vitals streaming (Pulse, SpO2, BP)", "Encrypted HD Video Telemedicine consultations", "AI-driven anomaly detection and alerts", "Automated clinical note generation"].map((b, i) => (
                  <motion.li key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.1, duration: 0.45, ease: "easeOut" }} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#0EA5A4]/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0EA5A4]" strokeWidth={2.5} />
                    </div>
                    <span className="text-[15px] font-[600] text-[#334155]">{b}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          {/* ─ Feature 2: TEXT LEFT ─ */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center"
          >
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="flex flex-col gap-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0EA5A4]/10 border border-[#0EA5A4]/15 w-fit">
                <span className="text-[12px] font-[800] uppercase tracking-[0.15em] text-[#0EA5A4]">Feature 02</span>
              </div>
              <div>
                <h3 className="text-[#0F172A] text-[38px] font-[900] leading-[1.08] tracking-[-0.04em] mb-4">
                  Instant Patient<br />
                  <span className="bg-gradient-to-r from-[#0EA5A4] to-[#22D3EE] bg-clip-text text-transparent">QR Verification</span>
                </h3>
                <p className="text-[#475569] text-[17px] leading-[1.8] font-medium max-w-[460px]">
                  Eliminate paperwork. Doctors scan a patient's encrypted QR to instantly verify identity and request secured record access. Consent is cryptographic, time-bound, and auditable.
                </p>
              </div>
              <ul className="flex flex-col gap-3 mt-2">
                {["Sub-second patient identity verification", "Cryptographic access request & approval", "Time-limited session tokens", "Full audit trail for every access event"].map((b, i) => (
                  <motion.li key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.1, duration: 0.45, ease: "easeOut" }} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#0EA5A4]/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0EA5A4]" strokeWidth={2.5} />
                    </div>
                    <span className="text-[15px] font-[600] text-[#334155]">{b}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Visual Medical QR Profile (Actual Data Model) */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-bl from-[#22D3EE]/10 to-[#0EA5A4]/8 rounded-[30px] blur-[50px] scale-105 pointer-events-none" />
              <div className="relative group p-8 rounded-[40px] border border-[#E2E8F0]/80 bg-white shadow-2xl flex flex-col items-center gap-6">
                <div className="w-48 h-48 p-4 rounded-3xl bg-slate-50 border border-slate-100 relative group-hover:scale-105 transition-transform duration-500">
                  <QrCode className="w-full h-full text-[#0EA5A4]" strokeWidth={1.5} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center">
                      <Shield className="w-6 h-6 text-[#0EA5A4]" />
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[#0F172A] font-[900] text-lg">PATIENT SECURE ID</div>
                  <div className="text-[#64748B] text-xs font-bold tracking-widest uppercase mt-1">E2E ENCRYPTED VIA AES-256</div>
                </div>
                <div className="w-full flex gap-3">
                  <div className="flex-1 py-2 px-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] text-center">
                    <span className="block text-[9px] font-black text-[#94A3B8] uppercase">Last Sync</span>
                    <span className="text-[12px] font-bold text-[#475569]">Now</span>
                  </div>
                  <div className="flex-1 py-2 px-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] text-center">
                    <span className="block text-[9px] font-black text-[#94A3B8] uppercase">Status</span>
                    <span className="text-[12px] font-bold text-[#0EA5A4]">Verified</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ─ Feature 3: IMAGE LEFT ─ */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center"
          >
            {/* Visual Health Timeline (Actual Data Representation) */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0EA5A4]/10 to-[#22D3EE]/8 rounded-[30px] blur-[50px] scale-105 pointer-events-none" />
              <div className="relative group p-6 rounded-[28px] border border-white/80 bg-white/40 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-[800] text-[#0F172A] uppercase tracking-wider">Health Journey</h4>
                  <span className="px-2 py-1 rounded-md bg-teal-50 text-[10px] font-bold text-teal-600">LIVE SYNC</span>
                </div>
                <div className="space-y-4">
                  {[
                    { date: "Oct 12", event: "Cardiology Visit", dr: "Dr. Sarah Chen", status: "Completed", icon: <Stethoscope />, color: "text-teal-500" },
                    { date: "Nov 05", event: "Lab Results: Lipid Panel", dr: "Quest Diagnostics", status: "New", icon: <Activity />, color: "text-blue-500" },
                    { date: "Dec 01", event: "Annual Physical", dr: "Dr. James Wilson", status: "Upcoming", icon: <UserCheck />, color: "text-purple-500" }
                  ].map((item, id) => (
                    <div key={id} className="flex gap-4 relative">
                      {id !== 2 && <div className="absolute left-[17px] top-9 bottom-[-16px] w-px bg-slate-200" />}
                      <div className={`w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 z-10 ${item.color}`}>
                        {React.cloneElement(item.icon, { className: "w-4 h-4" })}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[11px] font-bold text-slate-400">{item.date}</span>
                          <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">{item.status}</span>
                        </div>
                        <div className="text-[14px] font-bold text-[#0F172A] leading-tight">{item.event}</div>
                        <div className="text-[12px] text-slate-500 font-medium">{item.dr}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="flex flex-col gap-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0EA5A4]/10 border border-[#0EA5A4]/15 w-fit">
                <span className="text-[12px] font-[800] uppercase tracking-[0.15em] text-[#0EA5A4]">Feature 03</span>
              </div>
              <div>
                <h3 className="text-[#0F172A] text-[38px] font-[900] leading-[1.08] tracking-[-0.04em] mb-4">
                  Universal Health<br />
                  <span className="bg-gradient-to-r from-[#0EA5A4] to-[#22D3EE] bg-clip-text text-transparent">Timeline™</span>
                </h3>
                <p className="text-[#475569] text-[17px] leading-[1.8] font-medium max-w-[460px]">
                  All your medical history, prescriptions, and imaging reports unified into a single, searchable timeline. Access your data anytime, anywhere with institutional-grade security.
                </p>
              </div>
              <ul className="flex flex-col gap-3 mt-2">
                {["Unified longitudinal patient records", "Instant prescription & lab history access", "DICOM viewing for medical imaging", "Smart reminders for follow-up care"].map((b, i) => (
                  <motion.li key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.1, duration: 0.45, ease: "easeOut" }} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#0EA5A4]/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0EA5A4]" strokeWidth={2.5} />
                    </div>
                    <span className="text-[15px] font-[600] text-[#334155]">{b}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          {/* ─ Feature 4: EMERGENCY SOS (Actual Feature) ─ */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center"
          >
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="flex flex-col gap-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/15 w-fit">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[12px] font-[800] uppercase tracking-[0.15em] text-red-500">Emergency SOS</span>
              </div>
              <div>
                <h3 className="text-[#0F172A] text-[38px] font-[900] leading-[1.08] tracking-[-0.04em] mb-4">
                  Life-Saving<br />
                  <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Found Person Support</span>
                </h3>
                <p className="text-[#475569] text-[17px] leading-[1.8] font-medium max-w-[460px]">
                  In critical moments, every second counts. Our proprietary SOS system allows anyone to scan your QR code and instantly alert your emergency contacts with your precise location.
                </p>
              </div>
              <ul className="flex flex-col gap-3 mt-2">
                {["One-scan emergency contact notification", "Global real-time GPS location sharing", "Critical medical data access (Blood type, Allergies)", "Zero-setup requirements for responders"].map((b, i) => (
                  <motion.li key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.1, duration: 0.45, ease: "easeOut" }} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-500" strokeWidth={2.5} />
                    </div>
                    <span className="text-[15px] font-[600] text-[#334155]">{b}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Image/Illustration Placeholder */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-bl from-red-500/10 to-orange-500/8 rounded-[30px] blur-[50px] scale-105 pointer-events-none" />
              <GlassCard className="p-8 border-red-500/20 bg-white/40">
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.4)] animate-pulse">
                    <AlertTriangle className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-[800] text-[#0F172A]">Emergency Alert Triggered</h4>
                    <p className="text-sm text-[#64748B] font-medium">Family members have been notified via SMS and Email with your current location.</p>
                  </div>
                  <div className="w-full h-px bg-[#E2E8F0]" />
                  <div className="flex gap-4 w-full">
                    <div className="flex-1 p-3 rounded-xl bg-red-50 border border-red-100">
                      <span className="block text-[10px] text-red-500 font-bold uppercase mb-1">Blood Type</span>
                      <span className="text-lg font-black text-[#0F172A]">O Negative</span>
                    </div>
                    <div className="flex-1 p-3 rounded-xl bg-red-50 border border-red-100">
                      <span className="block text-[10px] text-red-500 font-bold uppercase mb-1">Status</span>
                      <span className="text-lg font-black text-[#0F172A]">Alerted</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>


          {/* ─ Feature 5: iOS & APPLE HEALTH (Actual Feature) ─ */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center"
          >
            {/* Illustration */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="relative order-2 lg:order-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0EA5A4]/10 to-[#22D3EE]/8 rounded-[30px] blur-[50px] scale-105 pointer-events-none" />
              <div className="relative p-10 bg-white/60 backdrop-blur-xl border border-white/80 rounded-[40px] shadow-[0_40px_100px_rgba(15,23,42,0.08)] flex flex-col items-center">
                {/* iPhone Mockup (Simplified) */}
                <div className="w-[180px] h-[360px] bg-[#0F172A] rounded-[38px] border-[6px] border-[#1E293B] relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70px] h-[18px] bg-[#1E293B] rounded-b-[12px] z-20" />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0EA5A4] to-[#22D3EE] p-4 flex flex-col items-center justify-center gap-4">
                    <Shield className="w-12 h-12 text-white opacity-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-center space-y-1">
                      <div className="text-white text-[10px] font-bold tracking-widest uppercase">Healthy Today</div>
                      <div className="text-white text-xl font-black">72 BPM</div>
                    </div>
                  </div>
                </div>
                {/* Floating Badges */}
                <motion.div animate={{ y: [-10, 10, -10] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[10%] right-[-10%] p-4 bg-white rounded-2xl shadow-xl border border-teal-50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center scale-75">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-[#0F172A]">Apple Health</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="flex flex-col gap-6 order-1 lg:order-2"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0EA5A4]/10 border border-[#0EA5A4]/15 w-fit">
                <span className="text-[12px] font-[800] uppercase tracking-[0.15em] text-[#0EA5A4]">Feature 05</span>
              </div>
              <div>
                <h3 className="text-[#0F172A] text-[38px] font-[900] leading-[1.08] tracking-[-0.04em] mb-4">
                  Full iPhone &<br />
                  <span className="bg-gradient-to-r from-[#0EA5A4] to-[#22D3EE] bg-clip-text text-transparent">iOS Support</span>
                </h3>
                <p className="text-[#475569] text-[17px] leading-[1.8] font-medium max-w-[460px]">
                  Seamlessly sync your vitals. Our native iOS application integrates directly with Apple HealthKit, allowing you to share real-time health metrics with your doctor automatically.
                </p>
              </div>
              <ul className="flex flex-col gap-3 mt-2">
                {["Native iOS & iPadOS high-performance apps", "Real-time Apple HealthKit synchronization", "Biometric (Face ID / Touch ID) security", "Interactive Widgets for quick vitals monitoring"].map((b, i) => (
                  <motion.li key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.1, duration: 0.45, ease: "easeOut" }} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#0EA5A4]/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0EA5A4]" strokeWidth={2.5} />
                    </div>
                    <span className="text-[15px] font-[600] text-[#334155]">{b}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* CTA SECTION - Colorful Compact Card         */}
      {/* ══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[860px] mx-auto px-6 mt-10 mb-20"
      >
        {/* Black + light blue glow behind card */}
        <div className="absolute -inset-2 rounded-[40px] blur-[40px] opacity-50 pointer-events-none"
          style={{ background: "linear-gradient(135deg, #0EA5A4, #38BDF8, #0F172A, #7DD3FC)" }} />

        {/* Card */}
        <div className="relative overflow-hidden rounded-[32px] shadow-[0_20px_60px_rgba(14,165,164,0.20)]"
          style={{ background: "linear-gradient(135deg, #0F172A 0%, #0D2137 40%, #0C2A4A 70%, #0F2D54 100%)" }}>

          {/* Animated light-blue orbs */}
          <motion.div animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-30px] left-[-20px] w-[180px] h-[180px] bg-[#38BDF8]/25 rounded-full blur-[50px] pointer-events-none" />
          <motion.div animate={{ x: [0, -15, 0], y: [0, 15, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute bottom-[-30px] right-[-20px] w-[160px] h-[160px] bg-[#7DD3FC]/20 rounded-full blur-[45px] pointer-events-none" />
          <motion.div animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="absolute top-[30%] right-[18%] w-[100px] h-[100px] bg-[#0EA5A4]/30 rounded-full blur-[35px] pointer-events-none" />

          {/* Shine overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 pointer-events-none rounded-[32px]" />

          {/* Content — compact */}
          <div className="relative z-10 flex flex-col items-center text-center gap-5 px-8 py-12 max-w-[640px] mx-auto">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 border border-white/30 backdrop-blur-sm"
            >
              <motion.span
                animate={{ scale: [1, 1.6, 1], opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-white block"
              />
              <span className="text-[11px] font-[800] uppercase tracking-[0.14em] text-white/95">Join Medical Vault Today</span>
            </motion.div>

            {/* Heading — compact */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="text-white text-[32px] md:text-[44px] font-[900] leading-[1.1] tracking-[-0.04em]"
            >
              Ready to transform <span className="text-white/85">your practice?</span>
            </motion.h2>

            {/* Subtext — compact */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="text-white/80 text-[15px] leading-[1.7] font-medium max-w-[440px]"
            >
              Join hundreds of doctors and thousands of patients already on Medical Vault.
            </motion.p>

            {/* Buttons — compact */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center justify-center gap-3 mt-1"
            >
              {/* Get Started Free — white */}
              <div className="relative group">
                <motion.button
                  onClick={() => navigate("/signup")}
                  whileHover={{ scale: 1.06, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="relative overflow-hidden h-[46px] px-8 text-[14px] font-[800] rounded-xl bg-white text-[#0EA5A4] flex items-center gap-2 shadow-[0_6px_24px_rgba(0,0,0,0.18)] hover:shadow-[0_10px_32px_rgba(0,0,0,0.22)] transition-shadow"
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-600 bg-gradient-to-r from-transparent via-[#0EA5A4]/10 to-transparent skew-x-12 pointer-events-none" />
                  <span className="relative z-10">Get Started Free</span>
                  <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.4, repeat: Infinity }} className="relative z-10">
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </motion.span>
                </motion.button>
              </div>

              {/* Doctor Login — glass */}
              <motion.button
                onClick={() => navigate("/login")}
                whileHover={{ scale: 1.05, y: -2, backgroundColor: "rgba(255,255,255,0.22)" }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="h-[46px] px-8 text-[14px] font-[700] rounded-xl bg-white/15 border-2 border-white/30 text-white flex items-center gap-2 backdrop-blur-sm transition-colors duration-200"
              >
                <Stethoscope className="w-4 h-4" strokeWidth={2} />
                Doctor Login
              </motion.button>

              {/* Our Products — outlined white */}
              <motion.button
                onClick={() => navigate("/products")}
                whileHover={{ scale: 1.05, y: -2, backgroundColor: "rgba(255,255,255,0.12)" }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="h-[46px] px-8 text-[14px] font-[700] rounded-xl bg-transparent border-2 border-white/30 text-white/90 flex items-center gap-2 backdrop-blur-sm transition-colors duration-200"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                Our Products
              </motion.button>
            </motion.div>

          </div>
        </div>
      </motion.div>

      {/* Helper class for hiding scrollbar */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}} />
    </GlassLayout>
  );
};

export default WelcomePage;
