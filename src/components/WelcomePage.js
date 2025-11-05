import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "./Footer";

const WelcomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const quotes = useMemo(() => [
    "Your health is your wealth.",
    "Secure. Simple. Smart.",
    "Care that keeps you informed.",
    "Your records, your control.",
    "Privacy-first medical management."
  ], []);
  // Build extended slides for seamless loop: [last, ...quotes, first]
  const extendedQuotes = useMemo(() => {
    if (quotes.length === 0) return [];
    return [quotes[quotes.length - 1], ...quotes, quotes[0]];
  }, [quotes]);

  const [currentIndex, setCurrentIndex] = useState(1); // start at first real slide
  const [withTransition, setWithTransition] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setWithTransition(true);
      setCurrentIndex((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // After jumping to clones, immediately snap to the real slide without transition
  useEffect(() => {
    if (extendedQuotes.length <= 1) return;
    if (currentIndex === extendedQuotes.length - 1) {
      // moved onto last clone; snap to first real slide
      const snap = () => {
        setWithTransition(false);
        setCurrentIndex(1);
      };
      // allow current transition to finish, then snap
      const timeout = setTimeout(snap, 20);
      return () => clearTimeout(timeout);
    }
    if (currentIndex === 0) {
      // moved onto first clone; snap to last real slide
      const snap = () => {
        setWithTransition(false);
        setCurrentIndex(extendedQuotes.length - 2);
      };
      const timeout = setTimeout(snap, 20);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, extendedQuotes.length]);

  // Re-enable transition after snapping
  useEffect(() => {
    if (!withTransition) {
      const id = setTimeout(() => setWithTransition(true), 20);
      return () => clearTimeout(id);
    }
  }, [withTransition]);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden" style={{ backgroundImage: "url('/BGMast.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <div className="flex h-full grow flex-col">
        {/* Header */}
        <header className="flex items-center justify-between whitespace-nowrap px-4 md:px-10 py-4">
          <div className="flex items-center gap-4 text-\[\#263238\]">
            <div className="h-6 w-6">
              <img src="/app_icon.png" alt="Medical Vault" className="h-full w-full object-contain" />
            </div>
            <h2 className="text-\[\#263238\] text-xl font-bold leading-tight tracking-\[-0.015em\]">Medical Vault</h2>
          </div>
        </header>

        {/* Main */}
        <main className="flex-grow flex items-center">
          <div className="w-full">
            <div className="flex flex-col gap-10 px-4 py-10 md:flex-row md:items-center md:gap-16 md:px-10 lg:px-20 xl:px-40">
              {/* Left content */}
              <div className="flex flex-col gap-6 w-full md:w-1/2">
                <div className="flex flex-col gap-3 text-left">
                  <h1 className="text-\[\#263238\] text-4xl font-black leading-tight tracking-\[-0.033em\] md:text-5xl">
                    Welcome to Medical Vault
                  </h1>
                  <p className="text-\[\#263238\] text-base font-normal leading-normal md:text-lg">
                    Secure platform for doctors to manage patient health records safely.
                  </p>
                </div>

                {isAuthenticated ? (
                  <div className="flex flex-col items-start gap-4">
                    <p className="text-lg text-\[\#263238\]">
                      Welcome back, <span className="font-semibold text-\[\#00796B\]">{user?.name}</span>!
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() => navigate("/dashboard")}
                        className="flex min-w-\[84px\] items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-\[\#00796B\] text-white text-base font-bold leading-normal tracking-\[0.015em\] hover:bg-\[\#00796B\]/90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-\[\#00796B\]"
                      >
                        Go to Dashboard
                      </button>
                      <button
                        onClick={() => navigate("/scan")}
                        className="flex min-w-\[84px\] items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-white text-\[\#00796B\] border-2 border-\[\#00796B\] text-base font-bold leading-normal tracking-\[0.015em\] hover:bg-\[\#00796B\]/10"
                      >
                        Scan QR Code
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-4">
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() => navigate("/login")}
                        className="flex min-w-\[84px\] items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-pink-600 text-white text-base font-bold leading-normal tracking-\[0.015em\] hover:bg-pink-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-600"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => navigate("/signup")}
                        className="flex min-w-\[84px\] items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-white text-\[\#00796B\] border-2 border-\[\#00796B\] text-base font-bold leading-normal tracking-\[0.015em\] hover:bg-\[\#00796B\]/10"
                      >
                        Signup
                      </button>
                    </div>
                    <button
                      onClick={() => navigate('/admin/login')}
                      className="flex min-w-\[84px\] items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-sm font-bold leading-normal tracking-\[0.015em\] hover:from-blue-700 hover:to-blue-900 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
                    >
                      Login as an Admin
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Quotes slider */
              /* Slides move from right to left with seamless looping */}
              <div className="w-full md:w-1/2 flex items-center justify-center">
                <div className="w-full aspect-square max-w-md overflow-hidden rounded-2xl">
                  <div
                    className={`h-full w-full flex ${withTransition ? "transition-transform duration-700 ease-in-out" : ""}`}
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                  >
                    {extendedQuotes.map((quote, index) => (
                      <div key={index} className="w-full shrink-0 h-full p-6">
                        <div className="h-full w-full rounded-2xl bg-white shadow-xl flex items-center justify-center p-6 text-center">
                          <p className="text-lg md:text-xl font-semibold text-\[\#263238\]">{quote}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <div className="mt-auto w-full text-white">
          <Footer noBorder />
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
