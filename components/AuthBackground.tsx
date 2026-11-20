import { useEffect, useState } from "react";

/**
 * Inspirational quotes for the authentication experience.
 * Quran and hadith are shown in their original Arabic wording only.
 * Original messages are clearly attributed to "Inspiration Yed Lkhir".
 */
export type Quote = { text: string; author: string; lang: "ar" | "fr" };

export const QUOTES: Quote[] = [
  { text: "مَثَلُ الْمُؤْمِنِينَ فِي تَوَادِّهِمْ وَتَرَاحُمِهِمْ كَمَثَلِ الْجَسَدِ الْوَاحِدِ", author: "حديث — مسلم", lang: "ar" },
  { text: "الْمُؤْمِنُ لِلْمُؤْمِنِ كَالْبُنْيَانِ يَشُدُّ بَعْضُهُ بَعْضًا", author: "حديث — البخاري ومسلم", lang: "ar" },
  { text: "مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ", author: "حديث — مسلم", lang: "ar" },
  { text: "كُلُّ مَعْرُوفٍ صَدَقَةٌ", author: "حديث — البخاري", lang: "ar" },
  { text: "وَالْيَدُ الْعُلْيَا خَيْرٌ مِنَ الْيَدِ السُّفْلَى", author: "حديث — البخاري ومسلم", lang: "ar" },
  { text: "اتَّقُوا النَّارَ وَلَوْ بِشِقِّ تَمْرَةٍ", author: "حديث — البخاري", lang: "ar" },
  { text: "لَنْ تَنَالُوا الْبِرَّ حَتَّىٰ تُنْفِقُوا مِمَّا تُحِبُّونَ", author: "القرآن — آل عمران ٩٢", lang: "ar" },
  { text: "وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ", author: "القرآن — المائدة ٢", lang: "ar" },
  { text: "إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ", author: "القرآن — البقرة ١٩٥", lang: "ar" },
  { text: "فَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ", author: "القرآن — الزلزلة ٧", lang: "ar" },
  { text: "Un petit geste peut illuminer toute une journée.", author: "Inspiration Yed Lkhir", lang: "fr" },
  { text: "La solidarité ne connaît ni frontière ni saison.", author: "Inspiration Yed Lkhir", lang: "fr" },
  { text: "Ensemble, nous portons plus loin la main du bien.", author: "Inspiration Yed Lkhir", lang: "fr" },
  { text: "Chaque heure donnée est un sourire rendu.", author: "Inspiration Yed Lkhir", lang: "fr" },
  { text: "Donner, c'est recevoir autrement.", author: "Inspiration Yed Lkhir", lang: "fr" },
];

/**
 * Arabic-only collection used for the flowing diagonal lanes.
 * Quran/hadith keep their verified wording and attribution; the rest are
 * generic wisdom phrases with no religious attribution.
 */
export type LaneQuote = { text: string; source?: string; lang: "ar" | "fr" };

export const LANE_QUOTES: LaneQuote[] = [
  // Arabic — verified Quran & hadith (accurate wording + attribution)
  { text: "وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ", source: "القرآن — المائدة ٢", lang: "ar" },
  { text: "كُلُّ مَعْرُوفٍ صَدَقَةٌ", source: "حديث — البخاري", lang: "ar" },
  { text: "لَنْ تَنَالُوا الْبِرَّ حَتَّىٰ تُنْفِقُوا مِمَّا تُحِبُّونَ", source: "القرآن — آل عمران ٩٢", lang: "ar" },
  { text: "وَالْيَدُ الْعُلْيَا خَيْرٌ مِنَ الْيَدِ السُّفْلَى", source: "حديث — البخاري ومسلم", lang: "ar" },
  { text: "يدُ الخيرِ لا تنتظرُ شكرًا", lang: "ar" },
  { text: "إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ", source: "القرآن — البقرة ١٩٥", lang: "ar" },
  { text: "الْمُؤْمِنُ لِلْمُؤْمِنِ كَالْبُنْيَانِ يَشُدُّ بَعْضُهُ بَعْضًا", source: "حديث — البخاري ومسلم", lang: "ar" },
  { text: "من زرعَ الخيرَ حصدَ المحبّة", lang: "ar" },
  { text: "فَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ", source: "القرآن — الزلزلة ٧", lang: "ar" },
  { text: "العطاءُ تاجُ الكرام", lang: "ar" },
  { text: "اتَّقُوا النَّارَ وَلَوْ بِشِقِّ تَمْرَةٍ", source: "حديث — البخاري", lang: "ar" },
  { text: "التضامنُ يصنعُ المعجزات", lang: "ar" },
  // French — original inspirational messages (no religious attribution)
  { text: "Donner sans jamais rien attendre en retour.", lang: "fr" },
  { text: "La générosité embellit le cœur.", lang: "fr" },
  { text: "Un petit geste, un immense espoir.", lang: "fr" },
  { text: "Ensemble, la solidarité grandit.", lang: "fr" },
  { text: "Chaque heure offerte est une lumière partagée.", lang: "fr" },
];

export function useRotatingQuote(intervalMs = 5000) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 400);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return { quote: QUOTES[index], visible };
}

export default function AuthBackground() {
  const { quote, visible } = useRotatingQuote();

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-orange-50" />
      <div className="absolute -top-20 -left-20 h-72 w-72 animate-pulse rounded-full bg-red-200/40 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 animate-pulse rounded-full bg-orange-200/40 blur-3xl" style={{ animationDelay: "1s" }} />
      <div
        className="absolute bottom-10 left-1/2 max-w-xl -translate-x-1/2 px-6 text-center transition-opacity duration-500"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <p
          dir={quote.lang === "ar" ? "rtl" : "ltr"}
          className="text-sm italic text-zinc-600"
          style={quote.lang === "ar" ? { fontFamily: "var(--font-cairo), sans-serif" } : undefined}
        >
          « {quote.text} »
        </p>
        <p className="mt-2 text-xs text-zinc-400">— {quote.author}</p>
      </div>
    </div>
  );
}
