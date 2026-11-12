import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const markdown = await readFile(join(process.cwd(), "docs", "writeup.md"), "utf8");
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="grit-interview-writeup.md"',
    },
  });
}
