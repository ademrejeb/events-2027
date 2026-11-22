import { createClient } from "@supabase/supabase-js";

/**
 * Copy every object from the three public storage buckets of one Supabase
 * project to another (hosted → self-hosted). Database rows are migrated
 * separately; see docs/supabase-self-hosted.md.
 *
 *   SOURCE_URL=https://xxx.supabase.co \
 *   SOURCE_SERVICE_KEY=... \
 *   TARGET_URL=https://api.example.tn \
 *   TARGET_SERVICE_KEY=... \
 *   node scripts/copy-storage.mjs
 */

const buckets = (process.env.BUCKETS ?? "event-images,org-logos,avatars")
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

const required = ["SOURCE_URL", "SOURCE_SERVICE_KEY", "TARGET_URL", "TARGET_SERVICE_KEY"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing env: ${missing.join(", ")}`);
  process.exit(1);
}

const source = createClient(process.env.SOURCE_URL, process.env.SOURCE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const target = createClient(process.env.TARGET_URL, process.env.TARGET_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function listFiles(client, bucket, prefix = "") {
  const files = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) files.push(...(await listFiles(client, bucket, path)));
      else files.push(path);
    }
    if (data.length < 100) break;
    offset += data.length;
  }
  return files;
}

let copied = 0;
let skipped = 0;

for (const bucket of buckets) {
  const { error: bucketError } = await target.storage.getBucket(bucket);
  if (bucketError) {
    console.log(`[${bucket}] not present on target (migrations create it) — skipping`);
    continue;
  }

  const files = await listFiles(source, bucket);
  console.log(`[${bucket}] ${files.length} objects`);

  for (const path of files) {
    const { data, error } = await source.storage.from(bucket).download(path);
    if (error || !data) {
      console.warn(`  ! download failed ${path}: ${error?.message ?? "empty"}`);
      skipped += 1;
      continue;
    }
    const { error: uploadError } = await target.storage
      .from(bucket)
      .upload(path, data, { upsert: true, contentType: data.type });
    if (uploadError) {
      console.warn(`  ! upload failed ${path}: ${uploadError.message}`);
      skipped += 1;
    } else {
      copied += 1;
      if (copied % 25 === 0) console.log(`  … ${copied} copied`);
    }
  }
}

console.log(`\nDone: ${copied} copied, ${skipped} skipped.`);
if (skipped > 0) process.exitCode = 1;
