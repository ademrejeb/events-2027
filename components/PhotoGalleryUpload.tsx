import { useRef, useState } from "react";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  bucket?: string;
  label?: string;
  hint?: string;
  max?: number;
  disabled?: boolean;
  maxMB?: number;
};

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Multiple-image uploader: one file picker, a thumbnail per uploaded image and
 * per-image removal. Uploads run one at a time so progress stays readable and
 * the browser does not open a dozen parallel multipart requests.
 */
export default function PhotoGalleryUpload({
  value,
  onChange,
  bucket = "event-images",
  label = "Ajouter des photos",
  hint,
  max = 12,
  disabled = false,
  maxMB = 5,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadOne = (file: File) => {
    const { promise, resolve, reject } = Promise.withResolvers<string>();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.setRequestHeader("x-bucket", bucket);
    xhr.setRequestHeader("x-filename", encodeURIComponent(file.name));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.url) resolve(data.url);
        else reject(new Error(data.error ?? "Échec de l'upload."));
      } catch {
        reject(new Error("Réponse invalide du serveur."));
      }
    };
    xhr.onerror = () => reject(new Error("Erreur réseau pendant l'upload."));
    xhr.send(file);
    return promise;
  };

  async function handleFiles(files: FileList | null) {
    if (!files || disabled) return;
    setError(null);

    const selected = Array.from(files);
    const room = max - value.length;
    if (room <= 0) {
      setError(`Maximum ${max} photos.`);
      return;
    }

    const queue: File[] = [];
    for (const file of selected.slice(0, room)) {
      if (!ALLOWED.includes(file.type)) {
        setError("Format non pris en charge (JPEG, PNG, WebP ou GIF).");
        continue;
      }
      if (file.size > maxMB * 1024 * 1024) {
        setError(`Image trop volumineuse (max ${maxMB} Mo).`);
        continue;
      }
      queue.push(file);
    }
    if (queue.length === 0) return;
    if (selected.length > room) setError(`Maximum ${max} photos.`);

    setUploading(true);
    setProgress({ done: 0, total: queue.length });
    const uploaded: string[] = [];
    for (const file of queue) {
      try {
        uploaded.push(await uploadOne(file));
      } catch (e) {
        setError((e as Error).message);
      }
      setProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));
    }
    setUploading(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        multiple
        disabled={disabled || uploading}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((url) => (
          <div
            key={url}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute right-2 top-2 rounded-lg bg-white/95 px-2 py-1 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-white"
                aria-label="Retirer cette photo"
              >
                Retirer
              </button>
            )}
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            className={`flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-3 text-center transition ${
              dragging
                ? "border-red-500 bg-red-50"
                : "border-zinc-300 bg-white hover:border-red-400 hover:bg-red-50"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {uploading && progress ? (
              <span className="text-xs font-semibold text-zinc-600">
                Envoi… {progress.done}/{progress.total}
              </span>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="text-xs font-semibold text-zinc-700">{label}</span>
                <span className="text-[11px] text-zinc-400">
                  {value.length}/{max} photos
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {hint && !error && <p className="mt-2 text-xs text-zinc-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
