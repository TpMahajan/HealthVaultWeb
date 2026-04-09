import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="w-full py-10 mt-auto border-t border-gray-100/60 dark:border-white/5 bg-transparent">
            <div className="flex items-center justify-center gap-2">
                <span className="text-[12px] font-medium text-gray-500 font-inter">
                    Powered by
                </span>
                <div className="flex items-center gap-1 group cursor-pointer">
                    <span className="text-[12px] font-bold text-slate-800 dark:text-gray-200 font-inter">
                        Ai Ally
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-red-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
            </div>
        </footer>
    );
};

export default Footer;
