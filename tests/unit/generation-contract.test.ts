import { beforeEach, describe, expect, it, vi } from "vitest";
import { scenarioDocumentSchema } from "@/lib/scenario-schema";
import { DEFAULT_SCENARIO } from "@/lib/scenario-defaults";
const { parse } = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock("@/lib/openai-client", () => ({ getOpenAIClient: () => ({ responses: { parse } }), getVectorStoreId: () => "test-reference-store" }));
import { fillScenarioSection, generateScenario } from "@/lib/generation";

describe("provider output contract", () => {
  beforeEach(() => { parse.mockReset(); });
  it("fills only the requested section, preserves authored values and images, and retains retrieval citations", async () => {
    const scenario = scenarioDocumentSchema.parse(DEFAULT_SCENARIO);
    scenario.courseInfo.courseTitle = "Protected author content";
    scenario.patientInfo.name = "Unrelated authored name";
    scenario.appendixImages = [{ id:"test", dataUrl:`data:image/png;base64,${"A".repeat(100_000)}`, caption:"Training room", prompt:"Room", revisedPrompt:"", mimeType:"image/png", model:"test", size:"1024x1024", createdAt:"" }];
    parse.mockResolvedValue({ status:"completed", output_parsed: { courseInfo: { ...DEFAULT_SCENARIO.courseInfo, courseTitle:"Replacement", department:"Emergency Medicine" } }, output:[{ type:"file_search_call", results:[{filename:"SIMTAC reference",text:"Reference extract"}]}] });
    const result = await fillScenarioSection({ section:"courseInfo", scenario, config:{thinkingDepth:1} });
    expect(result.scenario.courseInfo.courseTitle).toBe("Protected author content");
    expect(result.scenario.courseInfo.department).toBe("Emergency Medicine");
    expect(result.scenario.patientInfo).toEqual(scenario.patientInfo);
    expect(result.scenario.appendixImages).toEqual(scenario.appendixImages);
    expect(result.citations[0].source).toBe("SIMTAC reference");
    const request = parse.mock.calls[0][0];
    expect(request.input[1].content).not.toContain(scenario.appendixImages[0].dataUrl);
    expect(Object.keys(request.text.format.schema.properties)).toEqual(["courseInfo"]);
    expect(request.tools[0].vector_store_ids).toEqual(["test-reference-store"]);
  });
  it.each(["incomplete", "failed", "completed"])("rejects %s responses without usable output instead of creating a blank scenario", async (status) => {
    parse.mockResolvedValue({ status, output_parsed:null });
    await expect(generateScenario({ mode:"ai_prompt", prompt:"Synthetic teaching scenario", config:{thinkingDepth:0} })).rejects.toThrow("draft has been kept");
    await expect(fillScenarioSection({ section:"objectives", scenario:scenarioDocumentSchema.parse(DEFAULT_SCENARIO), config:{thinkingDepth:1} })).rejects.toThrow("draft has been kept");
  });
});
