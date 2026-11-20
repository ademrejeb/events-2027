import Link from "next/link";

/**
 * Yed Lkhir — logo lockup.
 * A hand cradling a heart is the primary mark; the Arabic wordmark is the
 * primary logotype, with the Latin transliteration as a small supporting line.
 */
export function Logo({
  tone = "default",
  showText = true,
  className = "",
}: {
  tone?: "default" | "light";
  showText?: boolean;
  className?: string;
}) {
  const light = tone === "light";
  const uid = light ? "ylLight" : "yl";

  return (
    <Link
      href="/"
      dir="ltr"
      className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}
      aria-label="Yed Lkhir — يد الخير"
    >
      <svg viewBox="0 0 48 48" className="h-10 w-10 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}Badge`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={light ? "#ffffff" : "#dc2626"} />
            <stop offset="100%" stopColor={light ? "#ffd9c7" : "#ea580c"} />
          </linearGradient>
          <linearGradient id={`${uid}Hand`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={light ? "#be123c" : "#ffffff"} />
            <stop offset="100%" stopColor={light ? "#ea580c" : "#ffe8dd"} />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="48" height="48" rx="15" fill={`url(#${uid}Badge)`} />
        <circle cx="24" cy="24" r="17.5" fill="none" stroke="#ffffff" strokeOpacity="0.22" />

        {/* Palm and thumb */}
        <path
          d="M13.3 25.4c0-3.1 1.9-5.5 4.4-5.5 1.2 0 2.1.9 2.1 2.2v6.8c0 1.9-1.2 3.2-2.9 3.2-2.2 0-3.6-2.6-3.6-6.7z"
          fill={`url(#${uid}Hand)`}
        />
        {/* Fingers */}
        <rect x="21.8" y="12.6" width="3.4" height="14.2" rx="1.7" fill={`url(#${uid}Hand)`} />
        <rect x="26.7" y="14.9" width="3.4" height="11.9" rx="1.7" fill={`url(#${uid}Hand)`} />
        <rect x="31.6" y="17.4" width="3.4" height="9.4" rx="1.7" fill={`url(#${uid}Hand)`} />
        {/* Heart cradled in the palm */}
        <path
          d="M22.8 27.3c-.5-1.9-3.2-1.9-3.9 0-.5 1.4.6 2.8 2 3.9 1.4-1.1 2.4-2.5 1.9-3.9z"
          fill={light ? "#ffffff" : "#dc2626"}
        />
      </svg>

      {showText && (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            dir="rtl"
            lang="ar"
            className={
              light
                ? "whitespace-nowrap text-[1.45rem] font-extrabold leading-none text-white"
                : "whitespace-nowrap bg-gradient-to-br from-red-600 to-orange-500 bg-clip-text text-[1.45rem] font-extrabold leading-none text-transparent"
            }
            style={{ fontFamily: "var(--font-cairo), sans-serif" }}
          >
            يد الخير
          </span>
          <span
            dir="ltr"
            className={
              light
                ? "mt-1 whitespace-nowrap text-[0.56rem] font-bold uppercase tracking-[0.2em] text-white/80"
                : "mt-1 whitespace-nowrap text-[0.56rem] font-bold uppercase tracking-[0.2em] text-zinc-400"
            }
          >
            Yed Lkhir
          </span>
        </span>
      )}
    </Link>
  );
}
