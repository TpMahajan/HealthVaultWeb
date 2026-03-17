import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    QrCode, Shield, Brain, ArrowRight, Stethoscope,
    Lock, Activity, Zap, CheckCircle2
} from "lucide-react";
import GlassLayout from "./GlassLayout";
import { PrimaryButton, SecondaryButton } from "./ui/Glass";
import { motion, useInView } from "framer-motion";

// Reusable animated section hook
const useReveal = (margin = "-15%") => {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin });
    return { ref, inView };
};

// Zigzag Feature Row Component
const FeatureRow = ({ title, subtitle, description, bullets, image, imageAlt, imageLeft, index }) => {
    const { ref, inView } = useReveal();

    const textVariants = {
        hidden: { opacity: 0, x: imageLeft ? 60 : -60 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } }
    };

    const imageVariants = {
        hidden: { opacity: 0, x: imageLeft ? -60 : 60 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 } }
    };

    const bulletVariants = {
        hidden: { opacity: 0, y: 16 },
        visible: (i) => ({
            opacity: 1, y: 0,
            transition: { duration: 0.5, ease: "easeOut", delay: 0.3 + i * 0.1 }
        })
    };

    const imageBlock = (
        <motion.div
            variants={imageVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="relative flex items-center justify-center"
        >
            {/* Soft glow behind image */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0EA5A4]/10 to-[#22D3EE]/10 rounded-[28px] blur-[40px] scale-110 pointer-events-none" />

            <div className="relative group w-full max-w-[520px] rounded-[24px] overflow-hidden shadow-[0_30px_80px_rgba(15,23,42,0.10)] border border-white/60 bg-white transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_100px_rgba(15,23,42,0.14)]">
                <img
                    src={image}
                    alt={imageAlt}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                {/* Subtle overlay shine */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
            </div>
        </motion.div>
    );

    const textBlock = (
        <motion.div
            variants={textVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="flex flex-col gap-6"
        >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0EA5A4]/10 border border-[#0EA5A4]/15 w-fit">
                <span className="text-[12px] font-[800] uppercase tracking-[0.15em] text-[#0EA5A4]">Feature 0{index + 1}</span>
            </div>

            <div>
                <h2 className="text-[#0F172A] text-4xl md:text-[44px] font-[900] leading-[1.05] tracking-[-0.04em] mb-4">
                    {title}<br />
                    <span className="bg-gradient-to-r from-[#0EA5A4] to-[#22D3EE] bg-clip-text text-transparent">
                        {subtitle}
                    </span>
                </h2>
                <p className="text-[#475569] text-[17px] leading-[1.8] font-medium max-w-[480px]">
                    {description}
                </p>
            </div>

            <ul className="flex flex-col gap-3 mt-2">
                {bullets.map((b, i) => (
                    <motion.li
                        key={i}
                        custom={i}
                        variants={bulletVariants}
                        initial="hidden"
                        animate={inView ? "visible" : "hidden"}
                        className="flex items-center gap-3"
                    >
                        <div className="w-6 h-6 rounded-full bg-[#0EA5A4]/10 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-[#0EA5A4]" strokeWidth={2.5} />
                        </div>
                        <span className="text-[15px] font-[600] text-[#334155]">{b}</span>
                    </motion.li>
                ))}
            </ul>
        </motion.div>
    );

    return (
        <div ref={ref} className="w-full max-w-[1200px] mx-auto px-6">
            <div className={`grid lg:grid-cols-2 gap-16 lg:gap-24 items-center ${!imageLeft ? 'direction-ltr' : ''}`}>
                {imageLeft ? imageBlock : textBlock}
                {imageLeft ? textBlock : imageBlock}
            </div>
        </div>
    );
};

const FeaturesPage = () => {
    const navigate = useNavigate();
    const heroRef = useRef(null);
    const heroInView = useInView(heroRef, { once: true });
    const ctaRef = useRef(null);
    const ctaInView = useInView(ctaRef, { once: true, margin: "-10%" });

    const features = [
        {
            title: "Real-time AI",
            subtitle: "Health Intelligence",
            description: "Our AI engine continuously monitors patient vitals, flags anomalies, and provides actionable clinical insights — all in under 50ms. Empower doctors with real-time intelligence that amplifies care, not replaces it.",
            image: "/feature_ai_dashboard.png",
            imageAlt: "AI Medical Dashboard",
            imageLeft: true,
            bullets: [
                "Live vital signs monitoring & anomaly detection",
                "AI-powered clinical decision support",
                "Real-time ECG & biomarker analysis",
                "Instant alerts for critical conditions"
            ]
        },
        {
            title: "Instant Patient",
            subtitle: "QR Verification",
            description: "Eliminate paperwork entirely. Doctors scan a patient's encrypted QR code to instantly verify identity and request secured record access. Consent is cryptographic, time-bound, and auditable.",
            image: "/feature_qr_scan.png",
            imageAlt: "QR Code Patient Scanning",
            imageLeft: false,
            bullets: [
                "Sub-second patient identity verification",
                "Cryptographic access request & approval",
                "Time-limited session tokens",
                "Full audit trail for every access event"
            ]
        },
        {
            title: "AES-256 Medical",
            subtitle: "Data Vault",
            description: "Every record stored in Medical Vault is encrypted end-to-end using military-grade AES-256 protocols. Zero-knowledge architecture ensures even we cannot access your private medical data.",
            image: "/feature_secure_vault.png",
            imageAlt: "Secure Medical Data Vault",
            imageLeft: true,
            bullets: [
                "AES-256 end-to-end encryption at rest & transit",
                "Zero-knowledge vault architecture",
                "HIPAA & GDPR compliant by design",
                "Redundant decentralized cloud storage"
            ]
        }
    ];

    return (
        <GlassLayout>
            {/* Soft hero background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[700px] h-[700px] bg-[#0EA5A4]/8 rounded-full blur-[140px]" />
                <div className="absolute bottom-[20%] left-[-10%] w-[600px] h-[600px] bg-[#22D3EE]/6 rounded-full blur-[120px]" />
                {/* Medical grid */}
                <div
                    className="absolute inset-0 opacity-[0.025]"
                    style={{
                        backgroundImage: `linear-gradient(to right, #0EA5A4 1px, transparent 1px), linear-gradient(to bottom, #0EA5A4 1px, transparent 1px)`,
                        backgroundSize: '48px 48px'
                    }}
                />
            </div>

            <div className="relative z-10 flex flex-col items-center pt-24 pb-32">

                {/* ── HERO HEADER ── */}
                <motion.div
                    ref={heroRef}
                    initial={{ opacity: 0, y: 40 }}
                    animate={heroInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="text-center mb-28 px-6 max-w-[760px] mx-auto"
                >
                    <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/80 border border-[#E2E8F0] w-fit mb-8 shadow-sm backdrop-blur-md mx-auto">
                        <Stethoscope className="w-4 h-4 text-[#0EA5A4]" strokeWidth={2.5} />
                        <span className="text-[13px] font-[700] tracking-tight text-[#0EA5A4]">Platform Features</span>
                    </div>

                    <h1 className="text-[#0F172A] text-5xl md:text-[62px] font-[900] leading-[1.04] tracking-[-0.04em] mb-6">
                        Everything your clinic<br />
                        <span className="bg-gradient-to-r from-[#0EA5A4] to-[#22D3EE] bg-clip-text text-transparent">
                            needs to thrive
                        </span>
                    </h1>
                    <p className="text-[#475569] text-xl font-medium leading-[1.75] max-w-[600px] mx-auto">
                        Medical Vault gives doctors and patients a unified, secure, AI-powered system — built for the modern era of healthcare.
                    </p>
                </motion.div>

                {/* ── VERTICAL CONNECTOR LINE ── */}
                <div className="relative w-full flex flex-col gap-[120px]">
                    {/* Subtle vertical guide line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-transparent via-[#E2E8F0]/60 to-transparent -translate-x-1/2 hidden lg:block pointer-events-none" />

                    {features.map((feat, idx) => (
                        <FeatureRow
                            key={idx}
                            index={idx}
                            {...feat}
                        />
                    ))}
                </div>

                {/* ── BOTTOM CTA ── */}
                <motion.div
                    ref={ctaRef}
                    initial={{ opacity: 0, y: 40 }}
                    animate={ctaInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="mt-24 w-full max-w-[860px] mx-auto px-6"
                >
                    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0EA5A4] to-[#0891B2] p-12 text-center shadow-[0_30px_80px_rgba(14,165,164,0.25)]">
                        {/* Soft glow ring */}
                        <div className="absolute top-[-60px] right-[-60px] w-64 h-64 bg-white/10 rounded-full blur-[60px] pointer-events-none" />
                        <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 bg-white/10 rounded-full blur-[50px] pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center gap-6">
                            <h2 className="text-white text-4xl font-[900] tracking-tight leading-tight">
                                Ready to transform<br />your practice?
                            </h2>
                            <p className="text-white/80 text-lg max-w-[440px] leading-relaxed">
                                Join hundreds of doctors and thousands of patients already using Medical Vault.
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center mt-2">
                                <button
                                    onClick={() => navigate("/signup")}
                                    className="h-[54px] px-10 text-[16px] font-[800] rounded-2xl bg-white text-[#0EA5A4] flex items-center gap-3 group shadow-[0_8px_25px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.18)] hover:-translate-y-1 transition-all duration-300"
                                >
                                    Get Started Free
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button
                                    onClick={() => navigate("/login")}
                                    className="h-[54px] px-10 text-[16px] font-[800] rounded-2xl bg-white/15 text-white border border-white/30 hover:bg-white/25 hover:-translate-y-1 transition-all duration-300"
                                >
                                    Doctor Login
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

            </div>
        </GlassLayout>
    );
};

export default FeaturesPage;
