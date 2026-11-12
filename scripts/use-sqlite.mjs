import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const schemaPath = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));
const schema = await readFile(schemaPath, "utf8");
const updated = schema.replace(/(\bdatasource\s+db\s*\{[\s\S]*?\bprovider\s*=\s*")postgresql(")/, "$1sqlite$2");

if (updated === schema) {
  if (!/provider\s*=\s*"sqlite"/.test(schema)) {
    throw new Error("Could not switch Prisma datasource provider to SQLite.");
  }
  console.log("Prisma datasource is already SQLite.");
} else {
  await writeFile(schemaPath, updated);
  console.log("Prisma datasource switched to SQLite.");
}

console.log('For the local demo, set DATABASE_URL="file:./dev.db" in .env.');
