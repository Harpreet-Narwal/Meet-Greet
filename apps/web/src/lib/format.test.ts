import { describe, expect, it } from "vitest";

import { formatINR } from "./format";

describe("formatINR", () => {
  it("formats with Indian digit grouping", () => {
    expect(formatINR(499)).toBe("₹499");
    expect(formatINR(4990)).toBe("₹4,990");
    expect(formatINR(125000)).toBe("₹1,25,000");
  });

  it("drops paise", () => {
    expect(formatINR(499.99)).toBe("₹500");
  });
});
