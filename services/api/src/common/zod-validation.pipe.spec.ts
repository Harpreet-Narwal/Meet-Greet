import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

import { ZodValidationPipe } from "./zod-validation.pipe";

const Schema = z.object({ phone: z.string().min(10) });

describe("ZodValidationPipe", () => {
  it("returns parsed data for valid input", () => {
    const pipe = new ZodValidationPipe(Schema);
    expect(pipe.transform({ phone: "+919876543210", extra: "stripped" })).toEqual({
      phone: "+919876543210",
    });
  });

  it("throws a 400 with issue paths for invalid input", () => {
    const pipe = new ZodValidationPipe(Schema);
    try {
      pipe.transform({ phone: "123" });
      fail("expected BadRequestException");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        issues: { path: string }[];
      };
      expect(response.issues[0]?.path).toBe("phone");
    }
  });
});
