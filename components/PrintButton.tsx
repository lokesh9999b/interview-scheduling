"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" className="btn-ghost btn-sm print:hidden" onClick={() => window.print()}>
      <Printer size={13} /> Print / Save as PDF
    </button>
  );
}
