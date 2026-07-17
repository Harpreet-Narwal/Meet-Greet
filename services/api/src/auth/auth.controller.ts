import { Body, Controller, HttpCode, Post, UnauthorizedException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import {
  OtpRequestSchema,
  OtpVerifySchema,
  RefreshSchema,
  type OtpRequestDto,
  type OtpVerifyDto,
  type RefreshDto,
  type TokenPair,
} from "./auth.types";
import { OtpService } from "./otp.service";
import { Public } from "./public.decorator";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly otp: OtpService,
    private readonly auth: AuthService,
  ) {}

  @Public()
  @Post("otp/request")
  @HttpCode(200)
  @ApiOperation({ summary: "Send a login code to a phone (mock provider logs it; 000000 works in dev)" })
  async requestOtp(
    @Body(new ZodValidationPipe(OtpRequestSchema)) body: OtpRequestDto,
  ): Promise<{ sent: true }> {
    await this.otp.request(body.phone);
    return { sent: true };
  }

  @Public()
  @Post("otp/verify")
  @HttpCode(200)
  @ApiOperation({ summary: "Verify the code → JWT access (15m) + refresh (30d)" })
  async verifyOtp(
    @Body(new ZodValidationPipe(OtpVerifySchema)) body: OtpVerifyDto,
  ): Promise<TokenPair & { is_new_user: boolean }> {
    const valid = await this.otp.verify(body.phone, body.code);
    if (!valid) {
      // Generic message on purpose — no oracle for which part failed.
      throw new UnauthorizedException("that code didn't match — try again");
    }
    return this.auth.loginWithPhone(body.phone);
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({ summary: "Exchange a refresh token for a fresh pair" })
  refresh(@Body(new ZodValidationPipe(RefreshSchema)) body: RefreshDto): Promise<TokenPair> {
    return this.auth.refresh(body.refresh_token);
  }
}
