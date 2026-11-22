import { useState } from "react";
import { useRouter } from "next/router";

export default function SearchBar({
  onSearch,
}: {
  /** When provided (home page), filtering happens in place instead of navigating. */
  onSearch?: (value: string) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState(
    typeof router.query.q === "string" ? router.query.q : "",
  );
  const [focused, setFocused] = useState(false);

  function submit(value: string) {
    const trimmed = value.trim();
    if (onSearch) {
      onSearch(trimmed);
      return;
    }
    router.push({
      pathname: "/",
      query: trimmed ? { q: trimmed } : {},
      hash: "evenements",
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(q);
      }}
      role="search"
      className={`relative rounded-2xl transition-shadow ${
        focused ? "shadow-lg ring-2 ring-red-500/20" : ""
      }`}
    >
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Rechercher une action solidaire"
          placeholder="Rechercher une action, une ville…"
          className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-28 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-red-500"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          Rechercher
        </button>
      </div>
    </form>
  );
}
