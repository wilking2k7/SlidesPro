"use client";

import type { SlideElement } from "@/lib/schema/slide";

/**
 * Tabla HTML con celdas estilizadas. Soporta header row, alineación,
 * color de fondo/texto por celda, colspan/rowspan, font-family override.
 */
export function TableView({
  el,
}: {
  el: Extract<SlideElement, { type: "table" }>;
}) {
  return (
    <div className="w-full h-full overflow-hidden">
      <table
        className="w-full h-full border-collapse"
        style={{
          fontFamily: el.fontFamily,
          fontSize: el.fontSize,
        }}
      >
        <tbody>
          {el.cells.map((row, ri) => {
            const isHeader = el.headerRow && ri === 0;
            return (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const Tag = isHeader ? "th" : "td";
                  const align = cell.align ?? (isHeader ? "left" : "left");
                  return (
                    <Tag
                      key={ci}
                      colSpan={cell.colspan > 1 ? cell.colspan : undefined}
                      rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                      style={{
                        border: `${el.borderWidth}px solid ${el.borderColor}`,
                        padding: "10px 14px",
                        textAlign: align,
                        background:
                          cell.bg ??
                          (isHeader ? "#f8fafc" : undefined),
                        color: cell.color,
                        fontWeight: cell.bold ?? isHeader ? 600 : 400,
                        verticalAlign: "middle",
                      }}
                    >
                      {cell.text}
                    </Tag>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
