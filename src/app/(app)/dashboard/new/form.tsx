"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Image as ImageIcon,
  Globe,
  FileText,
  Youtube,
  FileType,
  Link as LinkIcon,
  Upload,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { PresentationTemplate } from "@/lib/templates";

type ThemeOption = {
  id: string;
  name: string;
  slug: string;
  accent: string;
  background: string;
  text: string;
  mood: string;
};

type SourceTab = "youtube" | "url" | "transcript" | "pdf" | "docx";

export function NewPresentationForm({
  themes,
  templates,
}: {
  themes: ThemeOption[];
  templates: PresentationTemplate[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<SourceTab>("youtube");

  // Inputs por tab
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [transcript, setTranscript] = useState("");

  // Para PDF/DOCX: subimos el archivo y guardamos el texto extraído
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    chars: number;
    text: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Settings
  const [language, setLanguage] = useState<"es" | "en" | "pt">("es");
  const [slideCount, setSlideCount] = useState(8);
  const [depth, setDepth] = useState<"executive" | "detailed" | "step-by-step">(
    "detailed"
  );
  const [themeId, setThemeId] = useState(themes[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "auto");
  const [generateImages, setGenerateImages] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  // ── Resolución de fuente ────────────────────────────────────────────────
  async function resolveSource(): Promise<string> {
    switch (tab) {
      case "youtube":
        if (!youtubeUrl.trim()) throw new Error("Pega un link de YouTube");
        if (!/youtube\.com|youtu\.be/.test(youtubeUrl))
          throw new Error("URL no parece ser de YouTube");
        return youtubeUrl.trim();
      case "url":
        if (!articleUrl.trim()) throw new Error("Pega la URL del artículo");
        // Fetch + extract text via /api/ingest/url
        const res = await fetch("/api/ingest/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: articleUrl.trim() }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "No se pudo cargar el artículo");
        }
        const { text } = (await res.json()) as { text: string };
        return text;
      case "transcript":
        if (transcript.trim().length < 20)
          throw new Error("El transcript debe tener al menos 20 caracteres");
        return transcript.trim();
      case "pdf":
      case "docx":
        if (!uploadedFile)
          throw new Error("Sube un archivo y espera a que se extraiga el texto");
        return uploadedFile.text;
    }
  }

  // ── Upload de PDF/DOCX ──────────────────────────────────────────────────
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setUploadedFile(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ingest/file", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { text: string; chars: number; filename: string };
      setUploadedFile({ name: data.filename, chars: data.chars, text: data.text });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const source = await resolveSource();
      const res = await fetch("/api/presentations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          language,
          slideCount,
          depth,
          themeId,
          templateId,
          generateImages,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const { presentationId } = (await res.json()) as { presentationId: string };
      router.push(`/p/${presentationId}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Source tabs */}
      <div className="card-editorial p-1.5 flex gap-1 overflow-x-auto">
        <TabButton
          active={tab === "youtube"}
          onClick={() => setTab("youtube")}
          icon={<Youtube className="w-4 h-4" />}
          label="YouTube"
        />
        <TabButton
          active={tab === "url"}
          onClick={() => setTab("url")}
          icon={<LinkIcon className="w-4 h-4" />}
          label="URL"
        />
        <TabButton
          active={tab === "transcript"}
          onClick={() => setTab("transcript")}
          icon={<FileText className="w-4 h-4" />}
          label="Transcript"
        />
        <TabButton
          active={tab === "pdf"}
          onClick={() => setTab("pdf")}
          icon={<FileType className="w-4 h-4" />}
          label="PDF"
        />
        <TabButton
          active={tab === "docx"}
          onClick={() => setTab("docx")}
          icon={<FileType className="w-4 h-4" />}
          label="Word"
        />
      </div>

      {/* Source input */}
      <div className="card-editorial p-5">
        {tab === "youtube" && (
          <>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=… o /shorts/…"
              className="w-full text-base px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              Gemini lee el video directamente desde YouTube (incluido shorts).
            </p>
          </>
        )}

        {tab === "url" && (
          <>
            <input
              type="url"
              value={articleUrl}
              onChange={(e) => setArticleUrl(e.target.value)}
              placeholder="https://… (artículo de blog, post, página web)"
              className="w-full text-base px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            <p className="mt-2 text-xs text-slate-500">
              Extrae el texto principal de la página antes de generar la presentación.
            </p>
          </>
        )}

        {tab === "transcript" && (
          <>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={9}
              placeholder="Pega el transcript completo aquí, o describe el tema con detalle…"
              className="w-full text-sm px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono leading-relaxed"
            />
            <div className="mt-2 text-xs text-slate-500 flex justify-between">
              <span>{transcript.length} caracteres</span>
              <span>{transcript.length < 20 ? "mín. 20" : "✓ ok"}</span>
            </div>
          </>
        )}

        {(tab === "pdf" || tab === "docx") && (
          <FileUploadField
            label={tab === "pdf" ? "Sube un PDF" : "Sube un archivo Word (.docx)"}
            accept={tab === "pdf" ? ".pdf,application/pdf" : ".docx"}
            uploaded={uploadedFile}
            uploading={uploading}
            error={uploadError}
            onClick={() => fileInputRef.current?.click()}
            inputRef={fileInputRef}
            onChange={onFileChange}
          />
        )}
      </div>

      {/* Template picker */}
      <div className="card-editorial p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
              Plantilla
            </div>
            <h3 className="font-serif text-lg tracking-tight">Tipo de presentación</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTemplateId(t.id);
                if (t.defaultSlideCount) setSlideCount(t.defaultSlideCount);
                const themeBySlug = themes.find((th) => th.slug === t.defaultThemeSlug);
                if (themeBySlug) setThemeId(themeBySlug.id);
              }}
              className={`text-left rounded-xl border-2 p-3 transition-all ${
                templateId === t.id
                  ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20"
                  : "border-slate-200 hover:border-slate-400 bg-white"
              }`}
            >
              <div className="text-2xl mb-1.5">{t.emoji}</div>
              <div className="text-sm font-semibold leading-tight">{t.name}</div>
              <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-snug">
                {t.description}
              </div>
            </button>
          ))}
        </div>
        {selectedTemplate && selectedTemplate.outline.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Estructura sugerida
            </div>
            {selectedTemplate.outline.map((line, i) => (
              <div key={i} className="text-sm text-slate-700 flex items-baseline gap-2">
                <span className="text-blue-600 font-mono text-xs">{i + 1}.</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Theme picker */}
      <div className="card-editorial p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
              Estilo visual
            </div>
            <h3 className="font-serif text-lg tracking-tight">Identidad gráfica</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setThemeId(t.id)}
              className={`text-left rounded-xl border-2 p-2 transition-all ${
                themeId === t.id
                  ? "border-blue-600 ring-2 ring-blue-600/30"
                  : "border-slate-200 hover:border-slate-400"
              }`}
            >
              <div
                className="h-16 rounded-lg mb-2 relative overflow-hidden flex items-end p-2"
                style={{ background: t.background }}
              >
                <div className="space-y-1 w-full">
                  <div
                    className="h-1 rounded w-2/3"
                    style={{ background: t.text, opacity: 0.85 }}
                  />
                  <div className="h-1 rounded w-1/2" style={{ background: t.text, opacity: 0.4 }} />
                </div>
                <div
                  className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full"
                  style={{ background: t.accent }}
                />
              </div>
              <div className="text-sm font-medium truncate">{t.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                {t.mood}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="card-editorial p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Idioma">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "es" | "en" | "pt")}
              className={selectCls}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </Field>
          <Field label="Slides">
            <select
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className={selectCls}
            >
              {[6, 8, 10, 12, 15, 18].map((n) => (
                <option key={n} value={n}>
                  {n} slides
                </option>
              ))}
            </select>
          </Field>
          <Field label="Profundidad">
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value as typeof depth)}
              className={selectCls}
            >
              <option value="executive">Ejecutivo</option>
              <option value="detailed">Detallado</option>
              <option value="step-by-step">Paso a paso</option>
            </select>
          </Field>
        </div>

        <label className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100 cursor-pointer">
          <div className="flex items-start gap-3">
            <ImageIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium">Generar imágenes con IA</div>
              <div className="text-xs text-slate-500 mt-0.5">
                gemini-2.0-flash-image · suma ~30s al tiempo total
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={generateImages}
            onChange={(e) => setGenerateImages(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-checked:bg-blue-600 rounded-full relative transition-colors">
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                generateImages ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </div>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={submitting} size="xl">
          <Sparkles className="w-4 h-4" />
          {submitting ? "Encolando…" : "Generar presentación"}
        </Button>
      </div>
    </form>
  );
}

function FileUploadField({
  label,
  accept,
  uploaded,
  uploading,
  error,
  onClick,
  inputRef,
  onChange,
}: {
  label: string;
  accept: string;
  uploaded: { name: string; chars: number; text: string } | null;
  uploading: boolean;
  error: string | null;
  onClick: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={onChange}
      />
      <button
        type="button"
        onClick={onClick}
        disabled={uploading}
        className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 px-6 py-10 transition-all disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        ) : uploaded ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        ) : (
          <Upload className="w-8 h-8 text-slate-400" />
        )}
        <div className="text-sm font-medium text-slate-700">
          {uploading ? "Extrayendo texto…" : uploaded ? uploaded.name : label}
        </div>
        {uploaded && (
          <div className="text-xs text-slate-500">
            ✓ {uploaded.chars.toLocaleString()} caracteres extraídos
          </div>
        )}
        {!uploaded && !uploading && (
          <div className="text-xs text-slate-400">Click para seleccionar (max 20MB)</div>
        )}
      </button>
      {error && (
        <div className="mt-2 text-sm text-rose-600 flex items-start gap-1.5">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
        active
          ? "bg-white text-slate-900 shadow-sm border border-slate-200"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

const selectCls =
  "w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";
