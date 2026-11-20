import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/supabase/api";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const MAX_SIZE_MB = 5;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;

function mimeFromFilename(name: string): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "";
  }
}

export const config = { api: { bodyParser: false } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { supabase, user } = await getAuthUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const form = await new Promise<FormData>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    const reader = req as unknown as AsyncIterable<Uint8Array>;
    (async () => {
      for await (const chunk of reader) chunks.push(chunk);
      const rawName = (req.headers["x-filename"] as string) || "upload";
      let filename = rawName;
      try {
        filename = decodeURIComponent(rawName);
      } catch {
        filename = rawName;
      }
      const type = mimeFromFilename(filename);
      const blob = new Blob(chunks as BlobPart[], { type });
      const fd = new FormData();
      fd.append("file", blob, filename);
      fd.append("bucket", (req.headers["x-bucket"] as string) || "event-images");
      resolve(fd);
    })().catch(reject);
  });

  const file = form.get("file");
  const bucket = form.get("bucket");

  if (!(file instanceof File)) {
    return res.status(400).json({ error: "No file provided" });
  }

  const fileType = file.type || mimeFromFilename(file.name);
  const ext = (file.name.split(".").pop() || "").toLowerCase();

  if (!ALLOWED_TYPES.includes(fileType) || !ALLOWED_EXTENSIONS.includes(ext)) {
    return res.status(400).json({ error: "Type de fichier non supporté (JPEG, PNG, WebP, GIF uniquement)" });
  }

  if (file.size > MAX_SIZE) {
    return res.status(400).json({ error: `Fichier trop volumineux (max ${MAX_SIZE_MB} Mo)` });
  }

  const allowedBuckets = ["event-images", "org-logos", "avatars"];
  const bucketName = typeof bucket === "string" && allowedBuckets.includes(bucket) ? bucket : "event-images";

  const fileExt = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(path, arrayBuffer, {
      contentType: fileType,
      upsert: false,
    });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(path);

  return res.status(200).json({ url: urlData.publicUrl, path });
}
