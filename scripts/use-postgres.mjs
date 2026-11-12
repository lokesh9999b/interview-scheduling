import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const schemaPath = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));
const schema = await readFile(schemaPath, "utf8");
const updated = schema.replace(/(\bdatasource\s+db\s*\{[\s\S]*?\bprovider\s*=\s*")sqlite(")/, "$1postgresql$2");

if (updated === schema) {
  if (!/provider\s*=\s*"postgresql"/.test(schema)) {
    throw new Error("Could not switch Prisma datasource provider to PostgreSQL.");
  }
  console.log("Prisma datasource is already PostgreSQL.");
} else {
  await writeFile(schemaPath, updated);
  console.log("Prisma datasource switched to PostgreSQL.");
}

console.log("Set DATABASE_URL to your PostgreSQL connection string, then run npm run db:push and npm run db:seed.");
