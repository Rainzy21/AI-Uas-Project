import { describe, it, expect } from "vitest";
import {
  KIMI_FREE_MODEL,
  OPENROUTER_FREE_ROUTER,
  resolveOpenRouterModelChain,
} from "@/lib/openRouterModels";

describe("resolveOpenRouterModelChain", () => {
  it("defaults to Kimi free then openrouter/free", () => {
    expect(resolveOpenRouterModelChain()).toEqual([
      KIMI_FREE_MODEL,
      OPENROUTER_FREE_ROUTER,
    ]);
  });

  it("puts the preferred model first without duplicates", () => {
    expect(resolveOpenRouterModelChain(OPENROUTER_FREE_ROUTER)).toEqual([
      OPENROUTER_FREE_ROUTER,
      KIMI_FREE_MODEL,
    ]);
  });
});
