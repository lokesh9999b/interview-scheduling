import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const schemaPath = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));
const schema = await readFile(schemaPath, "utf8");
let updated = schema.replace(/(\bdatasource\s+db\s*\{[\s\S]*?\bprovider\s*=\s*")sqlite(")/, "$1postgresql$2");
const switchedProvider = updated !== schema;

if (!switchedProvider) {
  if (!/provider\s*=\s*"postgresql"/.test(schema)) {
    throw new Error("Could not switch Prisma datasource provider to PostgreSQL.");
  }
}

if (!/\bdirectUrl\s*=/.test(updated)) {
  updated = updated.replace(
    /(\burl\s*=\s*env\("DATABASE_URL"\)\s*\r?\n)/,
    '$1  directUrl = env("DATABASE_URL_UNPOOLED")\n',
  );
  if (!/\bdirectUrl\s*=\s*env\("DATABASE_URL_UNPOOLED"\)/.test(updated)) {
    throw new Error("Could not configure the direct PostgreSQL connection URL.");
  }
}

if (updated !== schema) {
  await writeFile(schemaPath, updated);
}

if (switchedProvider) {
  console.log("Prisma datasource switched to PostgreSQL.");
} else {
  console.log("Prisma datasource is already PostgreSQL.");
}

console.log("Set DATABASE_URL and DATABASE_URL_UNPOOLED to PostgreSQL connection strings, then run npm run db:push and npm run db:seed.");
