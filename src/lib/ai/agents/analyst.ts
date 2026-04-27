import { generateObject } from "ai";
import { modelFor } from "../providers";
import { AnalystOutput } from "../schemas";
import { ANALYST_SYSTEM, buildAnalystPrompt } from "../prompts/analyst";

export type AnalystInput = {
  source: string;
  language: "es" | "en" | "pt";
  slideCount: number;
  depth: "executive" | "detailed" | "step-by-step";
  apiKey?: string;
};

export async function runAnalyst(input: AnalystInput): Promise<AnalystOutput> {
  const { object } = await generateObject({
    model: modelFor("balanced", input.apiKey),
    system: ANALYST_SYSTEM,
    prompt: buildAnalystPrompt(input),
    schema: AnalystOutput,
    temperature: 0.6,
    maxRetries: 2,
  });

  return object;
}
