import { generateObject } from "ai";
import { MODELS, assertGoogleApiKey } from "../providers";
import { AnalystOutput } from "../schemas";
import { ANALYST_SYSTEM, buildAnalystPrompt } from "../prompts/analyst";

export type AnalystInput = {
  source: string;
  language: "es" | "en" | "pt";
  slideCount: number;
  depth: "executive" | "detailed" | "step-by-step";
};

export async function runAnalyst(input: AnalystInput): Promise<AnalystOutput> {
  assertGoogleApiKey();

  const { object } = await generateObject({
    model: MODELS.balanced(),
    system: ANALYST_SYSTEM,
    prompt: buildAnalystPrompt(input),
    schema: AnalystOutput,
    temperature: 0.6,
    maxRetries: 2,
  });

  return object;
}
