import { useEffect, useState } from "react";

type Preview = { name: string | null; image: string | null; url: string };
type Platform = "facebook" | "instagram";

const cache = new Map<string, Preview | null>();

const LABEL: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
};

const BADGE: Record<Platform, string> = {
  facebook: "bg-[#1877F2]",
  instagram: "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]",
};

/**
 * Facebook/Instagram cards resolved server-side from the public page's Open
 * Graph metadata. If the page cannot be resolved (Instagram blocks anonymous
 * HTML) the link is not shown at all — a bare URL with no name/avatar adds
 * noise, so we only render real previews.
 */
export default function SocialLinks({
  facebook,
  instagram,
}: {
  facebook?: string | null;
  instagram?: string | null;
}) {
  const urls = [facebook, instagram].filter((u): u is string => !!u);
  const [previews, setPreviews] = useState<Record<string, Preview | null>>({});

  useEffect(() => {
    if (urls.length === 0) return;
    const controller = new AbortController();
    let active = true;

    (async () => {
      const entries = await Promise.all(
        urls.map(async (url) => {
          if (cache.has(url)) return [url, cache.get(url)!] as const;
          try {
            const res = await fetch(`/api/social/preview?url=${encodeURIComponent(url)}`, {
              signal: controller.signal,
              cache: "no-store",
            });
            const data = res.ok ? await res.json() : { preview: null };
            const preview: Preview | null = data.preview ?? null;
            cache.set(url, preview);
            return [url, preview] as const;
          } catch {
            return [url, null] as const;
          }
        }),
      );
      if (active) setPreviews(Object.fromEntries(entries));
    })();

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facebook, instagram]);

  const resolvable = urls
    .map((url) => [url, previews[url]] as const)
    .filter((entry): entry is readonly [string, Preview] => !!entry[1]?.name || !!entry[1]?.image);

  if (resolvable.length === 0) return null;

  return (
    <div className="space-y-2">
      {resolvable.map(([url, preview]) => {
        const platform: Platform = url.includes("instagram.com") ? "instagram" : "facebook";
        return (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2.5 transition hover:border-red-200 hover:shadow-sm"
          >
            {preview.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.image}
                alt=""
                loading="lazy"
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${BADGE[platform]}`}
              >
                {platform === "facebook" ? "f" : "ig"}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-zinc-900">
                {preview.name ?? LABEL[platform]}
              </span>
              <span className="block text-xs text-zinc-500">{LABEL[platform]}</span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
