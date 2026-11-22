import fs from "node:fs";
import path from "node:path";

/**
 * Switches `.env.local` back to the hosted (or previously remote) Supabase
 * project, from the copy kept by `npm run db:local-env`. Pair it with
 * `db:local-env` when moving between a local stack and the deployed project.
 */
const root = process.cwd();
const envPath = path.join(root, ".env.local");
const backupPath = path.join(root, ".env.local.before-local");

const loopback =
  /^NEXT_PUBLIC_SUPABASE_URL=["']?https?:\/\/(127\.0\.0\.1|localhost|\[::1\])/m;

function readEnvUrl(content) {
  const match = /^NEXT_PUBLIC_SUPABASE_URL=["']?([^"'\r\n]+)/m.exec(content);
  return match?.[1]?.trim() ?? "(absent)";
}

if (!fs.existsSync(backupPath)) {
  console.error(
    `Aucune sauvegarde trouvée dans ${path.basename(backupPath)}.\n` +
      "Copiez-y la configuration distante (URL, SUPABASE_ANON_KEY, " +
      "SUPABASE_SERVICE_ROLE_KEY, TOKEN_ENCRYPTION_KEY) puis relancez cette commande.",
  );
  process.exit(1);
}

const backup = fs.readFileSync(backupPath, "utf8");
if (loopback.test(backup)) {
  console.error(
    `${path.basename(backupPath)} contient une URL locale : impossible de savoir ` +
      "vers quel projet distant revenir. Enregistrez-y la configuration distante.",
  );
  process.exit(1);
}

const url = readEnvUrl(backup);
fs.writeFileSync(envPath, backup);
console.log(`.env.local pointe maintenant vers ${url}`);
console.log(
  "Redémarrez `npm run dev` (ou `npm run build && npm start`) pour charger les nouvelles variables.",
);
