"use client";

import type { SlideElement } from "@/lib/schema/slide";
import { useMemo } from "react";

/**
 * Embed de video. Soporta:
 *  - YouTube: detecta id desde URLs comunes (watch?v=, youtu.be/, embed/)
 *  - Vimeo: extrae el id numérico
 *  - URL directa (mp4): tag <video> con controles
 *
 * `el.source` indica el modo; si es "url" pero la URL parece YouTube/Vimeo,
 * detectamos automáticamente.
 */
export function VideoView({
  el,
  isPreview = false,
}: {
  el: Extract<SlideElement, { type: "video" }>;
  /** Si true, deshabilita interactividad (en thumbnails de sidebar). */
  isPreview?: boolean;
}) {
  const embed = useMemo(() => detectEmbed(el.src, el.source), [el.src, el.source]);

  const wrapperStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    background: "#000",
    overflow: "hidden",
    pointerEvents: isPreview ? "none" : "auto",
  };

  if (!embed.url) {
    return (
      <div
        style={wrapperStyle}
        className="flex items-center justify-center text-white/60 text-sm"
      >
        URL de video inválida
      </div>
    );
  }

  if (embed.kind === "youtube" || embed.kind === "vimeo") {
    return (
      <div style={wrapperStyle}>
        <iframe
          src={embed.url}
          title="Video"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={embed.url}
        poster={el.poster}
        controls={!isPreview}
        autoPlay={el.autoplay && !isPreview}
        loop={el.loop}
        muted={el.muted}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

function detectEmbed(
  src: string,
  source: "youtube" | "vimeo" | "url"
): { url: string | null; kind: "youtube" | "vimeo" | "url" } {
  if (!src) return { url: null, kind: source };

  // YouTube
  if (source === "youtube" || /youtube\.com|youtu\.be/.test(src)) {
    const id = extractYouTubeId(src);
    if (id) return { url: `https://www.youtube.com/embed/${id}`, kind: "youtube" };
  }

  // Vimeo
  if (source === "vimeo" || /vimeo\.com/.test(src)) {
    const id = extractVimeoId(src);
    if (id) return { url: `https://player.vimeo.com/video/${id}`, kind: "vimeo" };
  }

  // URL directa
  return { url: src, kind: "url" };
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}
