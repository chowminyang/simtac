import { afterEach, describe, expect, it } from "vitest";

import { getSiteAccessPassword } from "@/lib/site-auth";

const originalSiteAccessPassword = process.env.SITE_ACCESS_PASSWORD;
const originalKnowledgeAdminPasscode = process.env.KNOWLEDGE_ADMIN_PASSCODE;

describe("getSiteAccessPassword", () => {
  afterEach(() => {
    if (originalSiteAccessPassword === undefined) {
      delete process.env.SITE_ACCESS_PASSWORD;
    } else {
      process.env.SITE_ACCESS_PASSWORD = originalSiteAccessPassword;
    }

    if (originalKnowledgeAdminPasscode === undefined) {
      delete process.env.KNOWLEDGE_ADMIN_PASSCODE;
    } else {
      process.env.KNOWLEDGE_ADMIN_PASSCODE = originalKnowledgeAdminPasscode;
    }
  });

  it("defaults to humeaine even if admin passcode is configured", () => {
    delete process.env.SITE_ACCESS_PASSWORD;
    process.env.KNOWLEDGE_ADMIN_PASSCODE = "admin-only-passcode";

    expect(getSiteAccessPassword()).toBe("humeaine");
  });

  it("uses SITE_ACCESS_PASSWORD when configured", () => {
    process.env.SITE_ACCESS_PASSWORD = "custom-site-pass";
    process.env.KNOWLEDGE_ADMIN_PASSCODE = "admin-only-passcode";

    expect(getSiteAccessPassword()).toBe("custom-site-pass");
  });
});
