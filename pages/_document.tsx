import { Html, Head, Main, NextScript } from "next/document";

/**
 * Styles that must exist before the external stylesheet is parsed.
 *
 * On a cold start the 341 KB CSS chunk is served by the app itself, so it can
 * take seconds to arrive, and Chrome stops render-blocking after ~500 ms: the
 * page then paints with browser defaults (buttons without padding or margins)
 * until the CSS lands. A reload has it cached, which is why it only looked
 * right after a refresh. Instead of painting a broken layout, the app tree is
 * hidden until every stylesheet is really applied, and a branded splash covers
 * the wait. `visibility` (not `display`) keeps layout running, so the map and
 * the fonts settle exactly as they would have.
 */
const CRITICAL_CSS = `
@layer theme, base, personal-ui, components, utilities;
html:not(.styles-ready) body > *:not(#boot-splash) { visibility: hidden; }
#boot-splash {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: #ffffff;
  font-family: ui-sans-serif, system-ui, "Segoe UI", sans-serif;
}
#boot-splash i {
  display: block;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid #fee2e2;
  border-top-color: #dc2626;
  animation: yl-boot-spin .8s linear infinite;
}
#boot-splash b { color: #dc2626; font-size: 15px; letter-spacing: .02em; }
@keyframes yl-boot-spin { to { transform: rotate(360deg); } }
html.styles-ready #boot-splash { display: none; }
@media (prefers-reduced-motion: reduce) { #boot-splash i { animation-duration: 2s; } }
`;

/** Reveals the app once every stylesheet has actually been applied. */
const READY_SCRIPT = `(function(){
  var root = document.documentElement;
  function applied(){
    var links = [].slice.call(document.querySelectorAll('link[rel="stylesheet"]'));
    if (!links.length) return false;
    return links.every(function(l){
      try { return !mediaMatches(l) || !!(l.sheet && l.sheet.cssRules.length); } catch(e){ return true; }
    });
  }
  function mediaMatches(l){
    var m = l.media;
    return !m || !m.mediaText || m.mediaText === 'all' || window.matchMedia(m.mediaText).matches;
  }
  function reveal(){ root.classList.add('styles-ready'); }
  if (applied()) { reveal(); return; }
  var t0 = Date.now();
  var iv = setInterval(function(){
    if (applied() || Date.now() - t0 > 6000) { clearInterval(iv); reveal(); }
  }, 16);
})();`;

export default function Document() {
  return (
    <Html lang="fr" data-scroll-behavior="smooth">
      <Head>
        {/* Inline (not a component) so it is parsed before any stylesheet.
            Pinned layer order + the first-paint gate. */}
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: READY_SCRIPT }} />
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html:
                "#boot-splash{display:none}html:not(.styles-ready) body > *{visibility:visible}",
            }}
          />
        </noscript>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#dc2626" />
        <meta name="apple-mobile-web-app-title" content="Yed Lkhir" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Head>
      <body className="antialiased">
        <div id="boot-splash" aria-hidden="true">
          <i />
          <b>Yed Lkhir</b>
        </div>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
