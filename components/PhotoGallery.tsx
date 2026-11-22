type Props = {
  photos: string[];
  label?: string;
  empty?: string;
};

/**
 * Photo grid that adapts its column count and aspect ratio to the number of
 * pictures: one photo is shown wide, two side by side, three or more in a
 * responsive grid. Opening a photo shows the original file.
 */
export default function PhotoGallery({ photos, label, empty }: Props) {
  if (photos.length === 0) {
    return empty ? (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
        {empty}
      </div>
    ) : null;
  }

  const cols =
    photos.length === 1
      ? "grid-cols-1"
      : photos.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-2 sm:grid-cols-3";
  const aspect =
    photos.length === 1 ? "aspect-[16/9]" : photos.length === 2 ? "aspect-[4/3]" : "aspect-square";

  return (
    <div className={`grid gap-3 ${cols}`} aria-label={label}>
      {photos.map((url, i) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`group relative block overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 ${aspect}`}
          title="Ouvrir la photo en grand"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`${label ?? "Photo"} ${i + 1}`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
          {photos.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
              {i + 1}/{photos.length}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
