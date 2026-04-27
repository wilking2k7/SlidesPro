"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Youtube, Globe } from "lucide-react";

/**
 * Validador en vivo para fuentes (YouTube / URL article / Transcript / PDF /
 * DOCX). Hace debounce y llama al endpoint apropiado, mostrando preview
 * cuando el resultado es exitoso.
 *
 * Para PDF/DOCX la validación ocurre durante el upload (en el upload field
 * mismo) — este componente cubre los inputs de texto/URL.
 */

export type ValidationKind = "youtube" | "url" | "transcript";

export type ValidationState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "valid"; meta: ValidationMeta }
  | { status: "invalid"; error: string };

export type ValidationMeta = {
  kind: "youtube" | "url" | "transcript";
  title?: string;
  author?: string;
  thumbnail?: string;
  domain?: string;
  description?: string;
  chars?: number;
};

export function SourceValidator({
  value,
  kind,
  onChange,
}: {
  value: string;
  kind: ValidationKind;
  onChange?: (state: ValidationState) => void;
}) {
  const [state, setState] = useState<ValidationState>({ status: "idle" });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const trimmed = value.trim();

    if (!trimmed) {
      setState({ status: "idle" });
      onChangeRef.current?.({ status: "idle" });
      return;
    }

    // Transcript: validación local, sin API
    if (kind === "transcript") {
      if (trimmed.length < 20) {
        const next: ValidationState = {
          status: "invalid",
          error: `Necesita al menos 20 caracteres (faltan ${20 - trimmed.length})`,
        };
        setState(next);
        onChangeRef.current?.(next);
        return;
      }
      const next: ValidationState = {
        status: "valid",
        meta: { kind: "transcript", chars: trimmed.length },
      };
      setState(next);
      onChangeRef.current?.(next);
      return;
    }

    // URL/YouTube: validación remota con debounce
    setState({ status: "validating" });
    onChangeRef.current?.({ status: "validating" });

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const endpoint =
          kind === "youtube" ? "/api/validate/youtube" : "/api/validate/url";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.ok) {
          const meta: ValidationMeta = { kind };
          if (kind === "youtube") {
            meta.title = data.title;
            meta.author = data.author;
            meta.thumbnail = data.thumbnail;
          } else {
            meta.title = data.title;
            meta.domain = data.domain;
            meta.thumbnail = data.image ?? undefined;
            meta.description = data.description ?? undefined;
            meta.chars = data.estimatedChars;
          }
          const next: ValidationState = { status: "valid", meta };
          setState(next);
          onChangeRef.current?.(next);
        } else {
          const next: ValidationState = {
            status: "invalid",
            error: data.error ?? "No se pudo validar",
          };
          setState(next);
          onChangeRef.current?.(next);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const next: ValidationState = {
          status: "invalid",
          error: "Error de red al validar",
        };
        setState(next);
        onChangeRef.current?.(next);
      }
    }, 700);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, kind]);

  if (state.status === "idle") return null;

  if (state.status === "validating") {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Validando…
      </div>
    );
  }

  if (state.status === "invalid") {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>{state.error}</div>
      </div>
    );
  }

  // valid
  const m = state.meta;
  if (m.kind === "transcript") {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
        <CheckCircle2 className="w-4 h-4" />
        {m.chars?.toLocaleString()} caracteres · listo para procesar
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 flex gap-3">
      {m.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={m.thumbnail}
          alt={m.title ?? ""}
          className="w-24 h-14 object-cover rounded-md bg-slate-200 shrink-0"
        />
      ) : (
        <div className="w-24 h-14 rounded-md bg-slate-200 grid place-items-center shrink-0">
          {m.kind === "youtube" ? (
            <Youtube className="w-5 h-5 text-slate-400" />
          ) : (
            <Globe className="w-5 h-5 text-slate-400" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
            {m.title}
          </div>
        </div>
        <div className="text-xs text-slate-500 mt-1 truncate">
          {m.kind === "youtube" ? m.author : m.domain}
          {m.kind === "url" && typeof m.chars === "number" && (
            <> · ~{m.chars.toLocaleString()} chars en preview</>
          )}
        </div>
        {m.description && (
          <div className="text-xs text-slate-500 mt-1 line-clamp-2 leading-snug">
            {m.description}
          </div>
        )}
      </div>
    </div>
  );
}
