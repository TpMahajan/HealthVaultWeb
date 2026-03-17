import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PrimaryButton, SecondaryButton } from "./ui/Glass";
import { Stethoscope, User, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

const GlassLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    const [scrolled, setScrolled] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="relative min-h-screen w-full flex-col overflow-hidden text-brand-title font-outfit" style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)' }}>

            {/* A) Top Navbar - Glassmorphism Light + Scroll Responsive */}
            <nav className={`fixed top-0 left-0 z-50 w-full h-[72px] transition-all duration-500 ease-out border-b ${scrolled ? 'bg-white/90 backdrop-blur-[24px] border-[#E2E8F0] shadow-[0_8px_30px_rgba(15,23,42,0.06)]' : 'bg-white/60 backdrop-blur-[10px] border-transparent shadow-none'}`}>
                <div className="w-full h-full px-6 flex items-center justify-between">

                    {/* ── LOGO – top-left ── */}
                    <div
                        className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
                        onClick={() => navigate("/")}
                    >
                        <div className="w-[42px] h-[42px] rounded-[14px] bg-gradient-to-br from-[#0EA5A4] to-[#22D3EE] flex items-center justify-center shadow-[0_6px_18px_rgba(14,165,164,0.30)] group-hover:scale-105 group-hover:shadow-[0_8px_24px_rgba(14,165,164,0.40)] transition-all duration-300">
                            <Stethoscope className="text-white w-[22px] h-[22px]" strokeWidth={2.5} />
                        </div>
                        <span className="text-[#0F172A] text-[19px] font-[900] tracking-[-0.03em] hidden sm:block select-none">
                            Medical <span className="text-[#0EA5A4]">Vault</span>
                        </span>
                    </div>

                    {/* ── RIGHT ACTIONS ── */}
                    <div className="flex items-center gap-4">
                        {!isAuthenticated ? (
                            <div className="flex items-center gap-6">
                                <motion.button
                                    onClick={() => navigate(location.pathname === "/products" ? "/cart" : "/login")}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="group relative flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white/40 border border-[#E2E8F0] hover:border-blue-500/40 hover:bg-blue-50/20 transition-all duration-300 shadow-sm overflow-hidden"
                                >
                                    {/* Sublte background glow on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                                    <div className="relative flex items-center gap-2.5">
                                        <div className="relative flex items-center justify-center">
                                            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping group-hover:animate-none opacity-40" />
                                            {location.pathname === "/products" ? (
                                                <ShoppingCart className="h-4 w-4 text-blue-500" strokeWidth={2.5} />
                                            ) : (
                                                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                                            )}
                                        </div>
                                        <span className="text-[14px] font-[800] text-slate-600 group-hover:text-blue-600 transition-colors tracking-tight">
                                            {location.pathname === "/products" ? "Your Cart" : "Sign In"}
                                        </span>
                                    </div>
                                </motion.button>
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate("/dashboard")}
                                className="h-[42px] px-7 text-[14px] font-[800] bg-gradient-to-r from-[#0EA5A4] to-[#0D9493] text-white rounded-[13px] shadow-[0_4px_15px_rgba(14,165,164,0.25)] hover:shadow-[0_8px_25px_rgba(14,165,164,0.35)] hover:-translate-y-0.5 transition-all active:scale-95"
                            >
                                Dashboard
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <main className="relative flex-grow flex flex-col z-10 pt-2 md:pt-4 px-6 md:px-12 pb-24">
                {/* Consistent max-width container wrapping the children */}
                <div className="max-w-[1280px] mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default GlassLayout;
