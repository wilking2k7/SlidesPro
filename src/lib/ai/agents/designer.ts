import { generateObject } from "ai";
import { modelFor } from "../providers";
import { DesignerOutput, type AnalystOutput } from "../schemas";
import { DESIGNER_SYSTEM, buildDesignerPrompt } from "../prompts/designer";

export type DesignerInput = {
  analyst: AnalystOutput;
  slideCount: number;
  themeMood: string;
  language: "es" | "en" | "pt";
  apiKey?: string;
};

export async function runDesigner(input: DesignerInput): Promise<DesignerOutput> {
  const { object } = await generateObject({
    model: modelFor("smart", input.apiKey),
    system: DESIGNER_SYSTEM,
    prompt: buildDesignerPrompt({
      analystJson: JSON.stringify(input.analyst, null, 2),
      slideCount: input.slideCount,
      themeMood: input.themeMood,
      language: input.language,
    }),
    schema: DesignerOutput,
    temperature: 0.7,
    maxRetries: 2,
  });

  return object;
}
