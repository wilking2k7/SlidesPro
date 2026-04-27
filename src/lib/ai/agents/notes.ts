import { generateObject } from "ai";
import { modelFor } from "../providers";
import { NotesOutput, type AnalystOutput, type DesignerOutput } from "../schemas";
import { NOTES_SYSTEM, buildNotesPrompt } from "../prompts/notes";

export type NotesInput = {
  analyst: AnalystOutput;
  designer: DesignerOutput;
  language: "es" | "en" | "pt";
  apiKey?: string;
};

export async function runNotes(input: NotesInput): Promise<NotesOutput> {
  const { object } = await generateObject({
    model: modelFor("fast", input.apiKey),
    system: NOTES_SYSTEM,
    prompt: buildNotesPrompt({
      slidesJson: JSON.stringify(input.designer.slides, null, 2),
      hook: input.analyst.hook,
      thesis: input.analyst.thesis,
      language: input.language,
    }),
    schema: NotesOutput,
    temperature: 0.7,
    maxRetries: 2,
  });

  return object;
}
