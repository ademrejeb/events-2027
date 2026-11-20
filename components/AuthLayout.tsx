import type { ReactNode } from "react";
import { Logo } from "./Logo";
import FloatingQuotes from "./FloatingQuotes";
import { useRotatingQuote } from "./AuthBackground";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { quote, visible } = useRotatingQuote();

  return (
    <div className="relative flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-orange-600 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl" />

        <Logo tone="light" />

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Ensemble, tendons
            <br />
            la main du bien.
          </h1>
          <p className="mt-4 text-base text-white/80">
            La plateforme tunisienne des bénévoles et des organisations solidaires.
          </p>
        </div>

        <div
          className="relative z-10 transition-opacity duration-500"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
            <p
              dir={quote.lang === "ar" ? "rtl" : "ltr"}
              className={`leading-relaxed ${quote.lang === "ar" ? "text-xl" : "text-sm italic"}`}
              style={quote.lang === "ar" ? { fontFamily: "var(--font-cairo), sans-serif" } : undefined}
            >
              {quote.lang === "ar" ? quote.text : `« ${quote.text} »`}
            </p>
            <p className="mt-2 text-xs text-white/70">— {quote.author}</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-white via-red-50/40 to-orange-50/40 px-6 py-12 lg:w-1/2">
        <FloatingQuotes />
        {/* Soft mask so the form stays the focal point */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 50%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.75) 45%, rgba(255,255,255,0.15) 75%, rgba(255,255,255,0) 100%)",
          }}
        />
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
