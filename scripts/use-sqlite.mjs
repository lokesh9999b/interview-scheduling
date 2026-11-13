import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const schemaPath = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));
const schema = await readFile(schemaPath, "utf8");
let updated = schema.replace(/(\bdatasource\s+db\s*\{[\s\S]*?\bprovider\s*=\s*")postgresql(")/, "$1sqlite$2");
const switchedProvider = updated !== schema;

if (!switchedProvider) {
  if (!/provider\s*=\s*"sqlite"/.test(schema)) {
    throw new Error("Could not switch Prisma datasource provider to SQLite.");
  }
}

updated = updated.replace(/^[ \t]*directUrl\s*=\s*env\("DATABASE_URL_UNPOOLED"\)\s*\r?\n/gm, "");

if (updated !== schema) {
  await writeFile(schemaPath, updated);
}

if (switchedProvider) {
  console.log("Prisma datasource switched to SQLite.");
} else {
  console.log("Prisma datasource is already SQLite.");
}

console.log('For the local demo, set DATABASE_URL="file:./dev.db" in .env.');
