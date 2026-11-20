
import { useMemo } from "react";
import { LANE_QUOTES } from "./AuthBackground";

type Lane = {
  id: number;
  top: string;
  direction: "forward" | "reverse";
  duration: number;
  delay: number;
  fontSize: string;
  opacity: number;
  quoteOffset: number;
};

const CONFIG = {
  desktopLanes: 19,
  mobileLanes: 9,
  laneGap: 6.2,
  diagonalAngle: -13,
  sequenceCopies: 3,
  quoteSpacing: "clamp(1.5rem, 4vw, 4rem)",
};

const FONT_SIZES = [
  "text-base",
  "text-lg",
  "text-xl",
  "text-lg",
  "text-2xl",
];

function createLanes(count: number): Lane[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: `${i * (100 / count)}%`,
    direction: i % 2 === 0 ? "forward" : "reverse",
    duration: 58 + ((i * 13) % 34),
    delay: -((i * 17) % 70),
    fontSize: FONT_SIZES[i % FONT_SIZES.length],
    opacity: 0.22 + ((i * 7) % 5) * 0.045,
    quoteOffset: (i * 3) % LANE_QUOTES.length,
  }));
}


function Diamond() {
  return (
    <span
      aria-hidden="true"
      className="mx-5 inline-flex shrink-0 items-center justify-center self-center"
      style={{
        width: "0.45em",
        height: "0.45em",
        lineHeight: 1,
        fontSize: "0.65em",
        transform: "rotate(45deg)",
        backgroundColor: "currentColor",
        opacity: 0.4,
        borderRadius: "1px",
      }}
    />
  );
}


function Quote({ quote }: { quote: (typeof LANE_QUOTES)[number] }) {
  const isArabic = quote.lang === "ar";

  return (
    <span
      dir={isArabic ? "rtl" : "ltr"}
      lang={quote.lang}
      className="inline-flex shrink-0 items-center"
    >
      <span
        className={isArabic ? "font-arabic" : ""}
        style={
          isArabic
            ? { fontFamily: "var(--font-cairo), sans-serif" }
            : undefined
        }
      >
        {isArabic ? quote.text : `“${quote.text}”`}
      </span>

      {quote.source && (
        <span
          className="mx-3 text-[0.7em] opacity-70"
          style={{ fontFamily: "var(--font-cairo), sans-serif" }}
        >
          — {quote.source}
        </span>
      )}

      <Diamond />
    </span>
  );
}

export default function FloatingQuotes() {
  const lanes = useMemo(
    () => createLanes(CONFIG.desktopLanes),
    []
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="yl-tilted absolute inset-[-25%] "
        style={{
          transform: `rotate(${CONFIG.diagonalAngle}deg) scale(1.05)`,
          transformOrigin: "center",
        }}
      >
        {lanes.map((lane) => {
          const quoteSequence = Array.from(
            { length: 6 },
            (_, k) => LANE_QUOTES[(lane.quoteOffset + k) % LANE_QUOTES.length]
          );

          return (
            <div
              key={lane.id}
              className="absolute left-0 w-full overflow-hidden"
              style={{
                top: lane.top,
                height: "3.25rem",
              }}
            >
              <div
                className={[
                  "yl-marquee-track inline-flex w-max items-center",
                  "whitespace-nowrap font-medium leading-none",
                  lane.fontSize,
                  lane.direction === "reverse"
                    ? "yl-marquee-rev"
                    : "yl-marquee",
                ].join(" ")}
                style={
                  {
                    "--yl-dur": `${lane.duration}s`,
                    "--yl-delay": `${lane.delay}s`,
                    "--yl-opacity": lane.opacity,
                    "--yl-gap": CONFIG.quoteSpacing,
                    opacity: lane.opacity,
                  } as React.CSSProperties
                }
              >
                {Array.from(
                  { length: CONFIG.sequenceCopies },
                  (_, copy) => (
                    <span
                      key={copy}
                      className="inline-flex shrink-0 items-center"
                      style={{ gap: CONFIG.quoteSpacing }}
                    >
                      {quoteSequence.map((quote, k) => (
                        <Quote key={`${copy}-${k}`} quote={quote} />
                      ))}
                    </span>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
