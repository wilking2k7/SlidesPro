"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import type { SlideElement } from "@/lib/schema/slide";

/**
 * Render de charts con Recharts. Cubre los 8 chartTypes del schema:
 * bar / column / line / area / pie / donut / scatter / radar.
 *
 * Los datos vienen como `categories` (eje X) + `series[]` (cada uno con name+data[]).
 * Se transforman a un array { category, [seriesName]: value, ... } que es el
 * formato que Recharts espera.
 */

const DEFAULT_PALETTE = [
  "#2563eb",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export function ChartView({
  el,
}: {
  el: Extract<SlideElement, { type: "chart" }>;
}) {
  const palette = el.options?.colorScheme ?? DEFAULT_PALETTE;
  const data = el.categories.map((category, i) => {
    const row: Record<string, string | number> = { category };
    for (const s of el.series) {
      row[s.name] = s.data[i] ?? 0;
    }
    return row;
  });

  const showGrid = el.options?.showGrid ?? true;
  const showLegend = el.options?.showLegend ?? true;
  const showDataLabels = el.options?.showDataLabels ?? false;
  const stacked = el.options?.stacked ?? false;
  const title = el.options?.title;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="w-full h-full flex flex-col p-3 bg-white rounded-lg">
      {title && (
        <div className="text-sm font-semibold text-slate-700 mb-2 px-2 truncate">
          {title}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );

  // Bar / Column (mismo componente, "column" = vertical bars que es default)
  if (el.chartType === "bar" || el.chartType === "column") {
    return (
      <Wrapper>
        <BarChart data={data} layout={el.chartType === "bar" ? "vertical" : "horizontal"}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
          {el.chartType === "bar" ? (
            <>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} />
            </>
          ) : (
            <>
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
            </>
          )}
          <Tooltip />
          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {el.series.map((s, i) => (
            <Bar
              key={s.name}
              dataKey={s.name}
              fill={s.color ?? palette[i % palette.length]}
              stackId={stacked ? "a" : undefined}
              radius={[4, 4, 0, 0]}
            >
              {showDataLabels && <LabelList dataKey={s.name} position="top" fontSize={10} />}
            </Bar>
          ))}
        </BarChart>
      </Wrapper>
    );
  }

  if (el.chartType === "line") {
    return (
      <Wrapper>
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {el.series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.color ?? palette[i % palette.length]}
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </Wrapper>
    );
  }

  if (el.chartType === "area") {
    return (
      <Wrapper>
        <AreaChart data={data}>
          <defs>
            {el.series.map((s, i) => (
              <linearGradient
                key={s.name}
                id={`grad-${el.id}-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={s.color ?? palette[i % palette.length]}
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor={s.color ?? palette[i % palette.length]}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {el.series.map((s, i) => (
            <Area
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.color ?? palette[i % palette.length]}
              fill={`url(#grad-${el.id}-${i})`}
              strokeWidth={2}
              stackId={stacked ? "a" : undefined}
            />
          ))}
        </AreaChart>
      </Wrapper>
    );
  }

  if (el.chartType === "pie" || el.chartType === "donut") {
    // Para pie usamos solo la primera serie (suma de valores por categoría)
    const series = el.series[0];
    if (!series) return null;
    const pieData = el.categories.map((category, i) => ({
      name: category,
      value: series.data[i] ?? 0,
    }));
    const innerRadius = el.chartType === "donut" ? "55%" : 0;
    return (
      <Wrapper>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius="80%"
            paddingAngle={2}
            label={showDataLabels ? { fontSize: 10 } : undefined}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip />
          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </PieChart>
      </Wrapper>
    );
  }

  if (el.chartType === "scatter") {
    return (
      <Wrapper>
        <ScatterChart>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {el.series.map((s, i) => (
            <Scatter
              key={s.name}
              name={s.name}
              data={data.map((row) => ({
                category: row.category,
                [s.name]: row[s.name],
              }))}
              fill={s.color ?? palette[i % palette.length]}
            />
          ))}
        </ScatterChart>
      </Wrapper>
    );
  }

  if (el.chartType === "radar") {
    return (
      <Wrapper>
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fontSize: 10 }} />
          {el.series.map((s, i) => (
            <Radar
              key={s.name}
              name={s.name}
              dataKey={s.name}
              stroke={s.color ?? palette[i % palette.length]}
              fill={s.color ?? palette[i % palette.length]}
              fillOpacity={0.3}
            />
          ))}
          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </RadarChart>
      </Wrapper>
    );
  }

  return null;
}
