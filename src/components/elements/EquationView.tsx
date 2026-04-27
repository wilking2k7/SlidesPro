"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";
import type { SlideElement } from "@/lib/schema/slide";

/**
 * Render de ecuaciones LaTeX con KaTeX. Compila a HTML server-side de
 * forma síncrona (KaTeX corre en cualquier ambiente JS).
 *
 * Si el LaTeX falla, muestra el texto crudo entre $$ con tono rojo
 * en vez de crashear.
 */
export function EquationView({
  el,
}: {
  el: Extract<SlideElement, { type: "equation" }>;
}) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(el.latex, {
        displayMode: true,
        throwOnError: false,
        errorColor: "#dc2626",
        output: "html",
      });
    } catch {
      return null;
    }
  }, [el.latex]);

  if (!html) {
    return (
      <div className="w-full h-full grid place-items-center text-rose-600 font-mono text-sm">
        $$ {el.latex} $$
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ color: el.color, fontSize: el.fontSize }}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
