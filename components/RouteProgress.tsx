import { useEffect, useState } from "react";
import { useRouter } from "next/router";

/**
 * Thin top progress bar during client-side route changes. Gives immediate
 * feedback while the next page compiles/loads, instead of the UI appearing
 * frozen.
 */
export default function RouteProgress() {
  const router = useRouter();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const start = () => {
      if (hideTimer) clearTimeout(hideTimer);
      setActive(true);
    };
    const done = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setActive(false), 250);
    };

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", done);
    router.events.on("routeChangeError", done);

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", done);
      router.events.off("routeChangeError", done);
    };
  }, [router.events]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="yl-route-progress fixed inset-x-0 top-0 z-[100] h-0.5 origin-left bg-gradient-to-r from-red-600 to-orange-500"
    />
  );
}
