import React from "react";

/**
 * Reusable Glassmorphism Card
 * Features extremely frosted glass blur, slight border, and hover lift effects securely.
 */
export const GlassCard = ({ children, className = "", ...props }) => {
    return (
        <div
            className={`bg-white/[0.06] backdrop-blur-[24px] border border-white/10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:border-[#14B8A6]/30 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ${className}`}
            {...props}
        >
            {/* Soft Glow backing under the card - applied optionally by wrapper if depth is needed */}
            <div className="relative z-10">{children}</div>
        </div>
    );
};

/**
 * Primary "Hero" Button
 * Solid teal background with aggressive shadow glows on hover and slight lift.
 */
export const PrimaryButton = ({ children, className = "", ...props }) => {
    return (
        <button
            className={`group flex items-center justify-center gap-2 rounded-2xl bg-[#0EA5A4] text-white font-[800] shadow-[0_8px_20px_rgba(14,165,164,0.25)] hover:shadow-[0_12px_30px_rgba(14,165,164,0.4)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#0EA5A4] focus:ring-offset-2 focus:ring-offset-white active:scale-95 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

/**
 * Secondary Outline Button
 * Translucent glass button that fills with light slightly on hover.
 */
export const SecondaryButton = ({ children, className = "", ...props }) => {
    return (
        <button
            className={`group flex items-center justify-center gap-2 rounded-2xl bg-white/50 backdrop-blur-md border border-[#E2E8F0] text-[#0F172A] font-[800] transition-all duration-300 hover:bg-white hover:border-[#CBD5E1] hover:shadow-[0_8px_20px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#E2E8F0] focus:ring-offset-2 focus:ring-offset-white ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

/**
 * Thin Glass Badge Pill
 * Used for trust badges, status indicators, and micro-labels.
 */
export const Badge = ({ children, icon, className = "", ...props }) => {
    return (
        <div
            className={`flex items-center gap-2 py-2 px-4 rounded-full bg-white/[0.03] backdrop-blur-md border border-white/5 text-sm text-[#E2E8F0] font-medium transition-colors hover:border-[#14B8A6]/30 hover:bg-white/[0.05] cursor-default ${className}`}
            {...props}
        >
            {icon && (
                <span className="text-[#14B8A6] drop-shadow-[0_0_5px_rgba(20,184,166,0.5)]">
                    {icon}
                </span>
            )}
            {children}
        </div>
    );
};
