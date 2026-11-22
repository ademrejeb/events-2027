import { Html, Head, Main, NextScript } from "next/document";

/**
 * First-paint gate.
 *
 * The production CSS is one ~341 KB chunk served by the app itself. On a cold
 * free-tier start it can take seconds to arrive, and Chrome stops
 * render-blocking after ~500 ms, so the page would paint with browser-default
 * buttons and missing Tailwind spacing until the chunk lands. A refresh has it
 * cached, which is why it only looked right after a reload.
 *
 * The app tree stays hidden behind a branded splash until every stylesheet has
 * fired `load` — the only reliable "fully parsed and applied" signal. The
 * previous version gave up after 6 s and revealed the app while the chunk was
 * still arriving (component styles painted, Tailwind spacing missing); polling
 * `sheet.cssRules.length` cannot distinguish a streaming sheet from a parsed
 * one. The 60 s timer here only covers a request that never settles.
 *
 * `visibility` (not `display`) keeps layout running, so the map and fonts
 * settle exactly as they would have.
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

/** Reveals the app once every stylesheet has fired `load`. */
const READY_SCRIPT = `(function(){
  var root = document.documentElement;
  var watched = [];
  var pending = 0;
  var revealed = false;
  function reveal(){
    if (revealed) return;
    revealed = true;
    root.classList.add("styles-ready");
  }
  function check(){
    if (watched.length > 0 && pending === 0) reveal();
  }
  function watch(link){
    if (watched.indexOf(link) !== -1) return;
    watched.push(link);
    pending++;
    function done(){
      link.removeEventListener("load", done);
      link.removeEventListener("error", done);
      pending--;
      check();
    }
    link.addEventListener("load", done);
    link.addEventListener("error", done);
    // A sheet already present after parsing finished loaded before this
    // observer existed, so its load event will never reach us.
    if (document.readyState !== "loading" && link.sheet) done();
  }
  function scan(){
    var links = document.getElementsByTagName("link");
    for (var i = 0; i < links.length; i++) {
      var rel = " " + (links[i].getAttribute("rel") || "").toLowerCase() + " ";
      if (rel.indexOf(" stylesheet ") !== -1) watch(links[i]);
    }
  }
  // The parser inserts Next's stylesheet right after this script, so the
  // observer attaches the load listener before that request can finish.
  if (window.MutationObserver) {
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  }
  scan();
  document.addEventListener("DOMContentLoaded", function(){
    scan();
    // No external stylesheet (dev inlines its CSS): nothing to wait for.
    if (watched.length === 0) reveal();
  });
  // Never leave a permanent splash if the request hangs forever.
  setTimeout(reveal, 60000);
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
