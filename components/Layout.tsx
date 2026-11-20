import type { ReactNode } from "react";
import { Stack } from "@adem.rejeb/ui";
import Nav from "./Nav";
import Footer from "./Footer";

/**
 * Global page shell. Renders children full-width inside <main>; each page is
 * responsible for its own container/spacing. This avoids the nested-container /
 * doubled-gutter problem (pages that add `max-w-*` were previously wrapped in
 * another Container inside Layout).
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Stack as="div" direction="column" style={{ minHeight: "100vh" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-red-700 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        Aller au contenu principal
      </a>
      <Nav />
      <main id="main-content" tabIndex={-1} style={{ flex: 1, width: "100%" }}>
        {children}
      </main>
      <Footer />
    </Stack>
  );
}
