import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const pdf = await readFile(join(process.cwd(), "docs", "writeup.pdf"));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="grit-interview-writeup.pdf"',
    },
  });
}
