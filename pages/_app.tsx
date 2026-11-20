import "@/styles/globals.css";
import { Manrope, Bricolage_Grotesque, Cairo } from "next/font/google";
import type { AppProps } from "next/app";
import { SessionProvider } from "@/lib/session";
import { ThemeProvider } from "@adem.rejeb/ui";
import RouteProgress from "@/components/RouteProgress";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "800"],
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${manrope.variable} ${bricolage.variable} ${cairo.variable}`}>
      <ThemeProvider defaultTheme="light">
        <SessionProvider>
          <RouteProgress />
          <Component {...pageProps} />
        </SessionProvider>
      </ThemeProvider>
    </div>
  );
}
