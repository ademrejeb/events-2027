import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="fr" data-scroll-behavior="smooth">
      <Head>
        {/* Pin the cascade-layer order before any stylesheet is parsed so the
            UI reset can never win over Tailwind utilities, even if chunks are
            injected later (avoids the "needs a refresh" layout flash). */}
        <style
          dangerouslySetInnerHTML={{
            __html: "@layer theme, base, personal-ui, components, utilities;",
          }}
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#dc2626" />
        <meta name="apple-mobile-web-app-title" content="Yed Lkhir" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
