"use client";

import { useEffect, useState } from "react";

type Links = { facebook: string | null; instagram: string | null };

const FACEBOOK_PATH =
  "M13.5 21v-7h2.3l.4-2.8h-2.7V9.4c0-.8.2-1.4 1.4-1.4h1.5V5.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v2.8h2.5V21z";
const INSTAGRAM_PATH =
  "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.1A6.7 6.7 0 1 0 18.7 12 6.7 6.7 0 0 0 12 5.3zm0 11A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3zm6.9-11.3a1.6 1.6 0 1 1-1.6-1.6 1.6 1.6 0 0 1 1.6 1.6z";

function Icon({ label, path, href }: { label: string; path: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white hover:text-red-700"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d={path} />
      </svg>
    </a>
  );
}

export default function FooterSocial() {
  const [links, setLinks] = useState<Links | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/social/central", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setLinks({ facebook: data.facebook ?? null, instagram: data.instagram ?? null });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!links || (!links.facebook && !links.instagram)) return null;

  return (
    <div className="mt-5 flex gap-2">
      {links.facebook ? (
        <Icon label="Facebook Yed Lkhir" href={links.facebook} path={FACEBOOK_PATH} />
      ) : null}
      {links.instagram ? (
        <Icon label="Instagram Yed Lkhir" href={links.instagram} path={INSTAGRAM_PATH} />
      ) : null}
    </div>
  );
}
