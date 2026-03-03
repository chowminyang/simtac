import { describe, expect, it } from "vitest";

import { isValidDmyDate, normalizeToDmyDate } from "@/lib/date-format";

describe("date format helpers", () => {
  it("normalizes common date formats to DD/MM/YYYY", () => {
    expect(normalizeToDmyDate("2026-03-03")).toBe("03/03/2026");
    expect(normalizeToDmyDate("3/3/2026")).toBe("03/03/2026");
    expect(normalizeToDmyDate("03-03-2026")).toBe("03/03/2026");
    expect(normalizeToDmyDate("3 Mar 2026")).toBe("03/03/2026");
  });

  it("validates DD/MM/YYYY with calendar checks", () => {
    expect(isValidDmyDate("29/02/2024")).toBe(true);
    expect(isValidDmyDate("29/02/2025")).toBe(false);
    expect(isValidDmyDate("31/11/2026")).toBe(false);
    expect(isValidDmyDate("03/03/2026")).toBe(true);
  });
});
