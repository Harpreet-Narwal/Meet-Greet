import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";

import { RateLimitGuard } from "../common/rate-limit.guard";
import { env } from "../config/env";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { OtpService } from "./otp.service";

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: env.AUTH_SECRET,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    // rate limiter runs first, then JWT auth
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
