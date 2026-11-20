import { useCallback, useRef, useState } from "react";

type Props = {
  bucket?: string;
  accept?: string;
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  maxMB?: number;
};

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function ImageUpload({
  bucket = "event-images",
  accept = "image/jpeg,image/png,image/webp,image/gif",
  currentUrl,
  onUpload,
  onRemove,
  label = "Ajouter une image",
  className = "",
  disabled = false,
  maxMB = 5,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      setProgress(0);

      const ok = await new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.setRequestHeader("x-bucket", bucket);
        xhr.setRequestHeader("x-filename", encodeURIComponent(file.name));
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && data.url) {
              setPreview(data.url);
              setProgress(100);
              onUpload(data.url);
              resolve(true);
            } else {
              setError(data.error ?? "Échec de l'upload.");
              setPreview(currentUrl ?? null);
              resolve(false);
            }
          } catch {
            setError("Réponse invalide du serveur.");
            resolve(false);
          }
        };
        xhr.onerror = () => {
          setError("Erreur réseau pendant l'upload.");
          resolve(false);
        };
        xhr.send(file);
      });

      if (ok) setProgress(0);
      setUploading(false);
    },
    [bucket, currentUrl, onUpload],
  );

  function handleFile(f: File | undefined) {
    if (!f || disabled) return;
    if (!ALLOWED.includes(f.type)) {
      setError("Format non pris en charge (JPEG, PNG, WebP ou GIF).");
      return;
    }
    if (f.size > maxMB * 1024 * 1024) {
      setError(`Image trop volumineuse (max ${maxMB} Mo).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
    upload(f);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onRemove?.();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={disabled || uploading}
      />

      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        className={`group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
          dragging
            ? "scale-[1.01] border-red-500 bg-red-50"
            : preview
              ? "border-zinc-200 bg-zinc-50 hover:border-red-300"
              : "border-zinc-300 bg-white hover:border-red-400 hover:bg-red-50"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {preview ? (
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-48 w-full object-cover sm:h-56" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm">
                Changer l&apos;image
              </span>
              {onRemove && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={clear}
                  onKeyDown={(e) => e.key === "Enter" && clear(e as unknown as React.MouseEvent)}
                  className="rounded-lg bg-white/95 px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-white"
                >
                  Retirer
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
                <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
            </span>
            <p className="mt-3 text-sm font-semibold text-zinc-800">{label}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Glissez une image ici ou cliquez pour parcourir
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              JPEG, PNG, WebP ou GIF — max {maxMB} Mo
            </p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-sm">
            <div className="relative h-12 w-12">
              <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-zinc-200 border-t-red-600" />
            </div>
            <span className="text-xs font-semibold text-zinc-700">
              Envoi… {progress}%
            </span>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </button>

      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
