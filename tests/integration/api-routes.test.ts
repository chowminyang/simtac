import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_SCENARIO } from "@/lib/scenario-defaults";
import { POST as exportDocxPost } from "@/app/api/scenario/export-docx/route";
import { GET as knowledgeListGet } from "@/app/api/knowledge/files/route";

describe("API routes", () => {
  beforeEach(() => {
    process.env.KNOWLEDGE_ADMIN_PASSCODE = "test-pass";
  });

  it("exports docx", async () => {
    const request = new Request("http://localhost/api/scenario/export-docx", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario: DEFAULT_SCENARIO }),
    });

    const response = await exportDocxPost(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("wordprocessingml");
  });

  it("disables knowledge listing route", async () => {
    const request = new Request("http://localhost/api/knowledge/files", {
      method: "GET",
      headers: { "x-admin-passcode": "wrong-pass" },
    });

    const response = await knowledgeListGet(request);
    expect(response.status).toBe(403);
  });
});
