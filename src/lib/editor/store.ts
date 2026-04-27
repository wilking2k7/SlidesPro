"use client";

import { create } from "zustand";
import { temporal, type TemporalState } from "zundo";
import { useStore } from "zustand";
import { produce } from "immer";
import type { Slide, SlideElement } from "@/lib/schema/slide";
import type { ThemeTokens } from "@/lib/schema/theme";

/**
 * Editor store. Single source of truth para el deck editado.
 * - zustand: estado reactivo
 * - zundo: time-travel undo/redo (Cmd+Z / Cmd+Shift+Z)
 * - immer: mutaciones inmutables ergonómicas
 *
 * El store NO persiste por sí mismo — un componente padre llama save()
 * con debounce y manda los slides al backend (PATCH /api/presentations/[id]/slides).
 */

export type EditorSlide = {
  id: string;
  position: number;
  data: Slide;
  notes: string;
  // Backend id puede diferir si es un slide nuevo aún sin guardar
  backendId?: string;
};

type EditorState = {
  // Identidad
  presentationId: string;
  title: string;
  theme: ThemeTokens | null;

  // Slides
  slides: EditorSlide[];

  // Selección
  activeSlideIdx: number;
  selectedElementIds: string[];

  // Estado de guardado
  saveStatus: "saved" | "dirty" | "saving" | "error";
  lastSavedAt: number | null;
  saveError: string | null;
};

type EditorActions = {
  // Slides
  setActiveSlide: (idx: number) => void;
  addSlide: (afterIdx?: number) => void;
  duplicateSlide: (idx: number) => void;
  deleteSlide: (idx: number) => void;
  reorderSlides: (fromIdx: number, toIdx: number) => void;
  updateSlideNotes: (idx: number, notes: string) => void;

  // Elementos
  selectElement: (id: string | null, opts?: { additive?: boolean }) => void;
  deselectAll: () => void;
  updateElement: (slideIdx: number, elementId: string, patch: Partial<SlideElement>) => void;
  updateElementBBox: (
    slideIdx: number,
    elementId: string,
    bbox: Partial<SlideElement["bbox"]>
  ) => void;
  updateTextRun: (
    slideIdx: number,
    elementId: string,
    paragraphIdx: number,
    runIdx: number,
    text: string
  ) => void;
  deleteElement: (slideIdx: number, elementId: string) => void;
  duplicateElement: (slideIdx: number, elementId: string) => void;
  bringToFront: (slideIdx: number, elementId: string) => void;
  sendToBack: (slideIdx: number, elementId: string) => void;

  // Save
  setSaveStatus: (s: EditorState["saveStatus"], error?: string | null) => void;
  markDirty: () => void;
  hydrate: (init: {
    presentationId: string;
    title: string;
    theme: ThemeTokens | null;
    slides: EditorSlide[];
  }) => void;
};

export type EditorStore = EditorState & EditorActions;

const initialState: EditorState = {
  presentationId: "",
  title: "",
  theme: null,
  slides: [],
  activeSlideIdx: 0,
  selectedElementIds: [],
  saveStatus: "saved",
  lastSavedAt: null,
  saveError: null,
};

export const useEditorStore = create<EditorStore>()(
  temporal(
    (set, get) => ({
      ...initialState,

      hydrate: (init) =>
        set(() => ({
          presentationId: init.presentationId,
          title: init.title,
          theme: init.theme,
          slides: init.slides,
          activeSlideIdx: 0,
          selectedElementIds: [],
          saveStatus: "saved",
          lastSavedAt: Date.now(),
          saveError: null,
        })),

      setActiveSlide: (idx) =>
        set((s) => {
          const clamped = Math.max(0, Math.min(s.slides.length - 1, idx));
          return { activeSlideIdx: clamped, selectedElementIds: [] };
        }),

      addSlide: (afterIdx) =>
        set(
          produce<EditorState>((draft) => {
            const at = afterIdx ?? draft.activeSlideIdx;
            const nextPos = at + 1;
            const newSlide: EditorSlide = {
              id: crypto.randomUUID(),
              position: nextPos,
              notes: "",
              data: {
                id: crypto.randomUUID(),
                layout: "blank",
                background: { kind: "color", color: "#ffffff" },
                elements: [],
                notes: "",
              },
            };
            draft.slides.splice(nextPos, 0, newSlide);
            draft.slides.forEach((s, i) => (s.position = i));
            draft.activeSlideIdx = nextPos;
            draft.selectedElementIds = [];
            draft.saveStatus = "dirty";
          })
        ),

      duplicateSlide: (idx) =>
        set(
          produce<EditorState>((draft) => {
            const original = draft.slides[idx];
            if (!original) return;
            const cloneData: Slide = JSON.parse(JSON.stringify(original.data));
            cloneData.id = crypto.randomUUID();
            cloneData.elements = cloneData.elements.map((el) => ({
              ...el,
              id: crypto.randomUUID(),
            }));
            const newSlide: EditorSlide = {
              id: crypto.randomUUID(),
              position: idx + 1,
              notes: original.notes,
              data: cloneData,
            };
            draft.slides.splice(idx + 1, 0, newSlide);
            draft.slides.forEach((s, i) => (s.position = i));
            draft.activeSlideIdx = idx + 1;
            draft.selectedElementIds = [];
            draft.saveStatus = "dirty";
          })
        ),

      deleteSlide: (idx) =>
        set(
          produce<EditorState>((draft) => {
            if (draft.slides.length <= 1) return; // siempre dejar 1
            draft.slides.splice(idx, 1);
            draft.slides.forEach((s, i) => (s.position = i));
            draft.activeSlideIdx = Math.max(0, Math.min(draft.slides.length - 1, idx - 1));
            draft.selectedElementIds = [];
            draft.saveStatus = "dirty";
          })
        ),

      reorderSlides: (fromIdx, toIdx) =>
        set(
          produce<EditorState>((draft) => {
            if (fromIdx === toIdx) return;
            const [moved] = draft.slides.splice(fromIdx, 1);
            draft.slides.splice(toIdx, 0, moved);
            draft.slides.forEach((s, i) => (s.position = i));
            if (draft.activeSlideIdx === fromIdx) draft.activeSlideIdx = toIdx;
            draft.saveStatus = "dirty";
          })
        ),

      updateSlideNotes: (idx, notes) =>
        set(
          produce<EditorState>((draft) => {
            if (draft.slides[idx]) {
              draft.slides[idx].notes = notes;
              draft.slides[idx].data.notes = notes;
              draft.saveStatus = "dirty";
            }
          })
        ),

      selectElement: (id, opts) =>
        set((s) => {
          if (id === null) return { selectedElementIds: [] };
          if (opts?.additive) {
            const has = s.selectedElementIds.includes(id);
            return {
              selectedElementIds: has
                ? s.selectedElementIds.filter((x) => x !== id)
                : [...s.selectedElementIds, id],
            };
          }
          return { selectedElementIds: [id] };
        }),

      deselectAll: () => set({ selectedElementIds: [] }),

      updateElement: (slideIdx, elementId, patch) =>
        set(
          produce<EditorState>((draft) => {
            const slide = draft.slides[slideIdx];
            if (!slide) return;
            const idx = slide.data.elements.findIndex((e) => e.id === elementId);
            if (idx < 0) return;
            slide.data.elements[idx] = {
              ...slide.data.elements[idx],
              ...patch,
            } as SlideElement;
            draft.saveStatus = "dirty";
          })
        ),

      updateElementBBox: (slideIdx, elementId, bbox) =>
        set(
          produce<EditorState>((draft) => {
            const slide = draft.slides[slideIdx];
            if (!slide) return;
            const el = slide.data.elements.find((e) => e.id === elementId);
            if (!el) return;
            el.bbox = { ...el.bbox, ...bbox };
            draft.saveStatus = "dirty";
          })
        ),

      updateTextRun: (slideIdx, elementId, paragraphIdx, runIdx, text) =>
        set(
          produce<EditorState>((draft) => {
            const slide = draft.slides[slideIdx];
            if (!slide) return;
            const el = slide.data.elements.find((e) => e.id === elementId);
            if (!el || el.type !== "text") return;
            const run = el.paragraphs[paragraphIdx]?.runs[runIdx];
            if (run) {
              run.text = text;
              draft.saveStatus = "dirty";
            }
          })
        ),

      deleteElement: (slideIdx, elementId) =>
        set(
          produce<EditorState>((draft) => {
            const slide = draft.slides[slideIdx];
            if (!slide) return;
            slide.data.elements = slide.data.elements.filter((e) => e.id !== elementId);
            draft.selectedElementIds = draft.selectedElementIds.filter((id) => id !== elementId);
            draft.saveStatus = "dirty";
          })
        ),

      duplicateElement: (slideIdx, elementId) =>
        set(
          produce<EditorState>((draft) => {
            const slide = draft.slides[slideIdx];
            if (!slide) return;
            const el = slide.data.elements.find((e) => e.id === elementId);
            if (!el) return;
            const clone = JSON.parse(JSON.stringify(el)) as SlideElement;
            clone.id = crypto.randomUUID();
            clone.bbox = { ...clone.bbox, x: clone.bbox.x + 30, y: clone.bbox.y + 30 };
            slide.data.elements.push(clone);
            draft.selectedElementIds = [clone.id];
            draft.saveStatus = "dirty";
          })
        ),

      bringToFront: (slideIdx, elementId) =>
        set(
          produce<EditorState>((draft) => {
            const slide = draft.slides[slideIdx];
            if (!slide) return;
            const max = slide.data.elements.reduce((m, e) => Math.max(m, e.bbox.zIndex), 0);
            const el = slide.data.elements.find((e) => e.id === elementId);
            if (el) {
              el.bbox.zIndex = max + 1;
              draft.saveStatus = "dirty";
            }
          })
        ),

      sendToBack: (slideIdx, elementId) =>
        set(
          produce<EditorState>((draft) => {
            const slide = draft.slides[slideIdx];
            if (!slide) return;
            const min = slide.data.elements.reduce((m, e) => Math.min(m, e.bbox.zIndex), 0);
            const el = slide.data.elements.find((e) => e.id === elementId);
            if (el) {
              el.bbox.zIndex = min - 1;
              draft.saveStatus = "dirty";
            }
          })
        ),

      setSaveStatus: (status, error) =>
        set({
          saveStatus: status,
          saveError: error ?? null,
          lastSavedAt: status === "saved" ? Date.now() : get().lastSavedAt,
        }),

      markDirty: () => set({ saveStatus: "dirty" }),
    }),
    {
      limit: 100,
      // Coalesce mutaciones rápidas (drag continuo) en un solo entry de historial
      handleSet: (handleSet) => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        return (state) => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => handleSet(state), 250);
        };
      },
    }
  )
);

// Hook helper para usar la API temporal (undo/redo)
export const useTemporalStore = <T>(
  selector: (state: TemporalState<EditorStore>) => T
): T => useStore(useEditorStore.temporal, selector);
