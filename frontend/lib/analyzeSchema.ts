import { z } from "zod";

export const AnalysisSchema = z.object({
  title: z.string(),
  layout: z.string(),
  components: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      position: z.string(),
    })
  ),
  colorPalette: z.array(z.string()),
  typography: z.object({
    headings: z.string(),
    body: z.string(),
    style: z.string(),
  }),
  style: z.string(),
});

export const VisAIResultSchema = z.object({
  analysis: AnalysisSchema,
  html: z.string().min(1).max(400_000),
  timestamp: z.number().optional(),
});

export type VisAIResult = z.infer<typeof VisAIResultSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;

export function parseVisAIResult(data: unknown): VisAIResult | null {
  const parsed = VisAIResultSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
