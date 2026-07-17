import { randomInt } from "node:crypto";

import { BadRequestException, Injectable, Logger } from "@nestjs/common";

import { env } from "../config/env";
import { RedisService } from "../redis/redis.service";

const OTP_TTL_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 5;

/**
 * OTP over the configured provider. `mock` (dev/CI) logs the code and always
 * accepts 000000 — real providers (msg91/twilio) are env swaps behind the same
 * interface, wired only when asked (CLAUDE.md).
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly redis: RedisService) {}

  private key(phone: string): string {
    return `otp:${phone}`;
  }

  async request(phone: string): Promise<void> {
    const cooldownKey = `${this.key(phone)}:cooldown`;
    const onCooldown = await this.redis.client.get(cooldownKey);
    if (onCooldown) {
      throw new BadRequestException("we just sent a code — try again in a few seconds");
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.redis.client.set(this.key(phone), code, "EX", OTP_TTL_SECONDS);
    await this.redis.client.set(`${this.key(phone)}:attempts`, "0", "EX", OTP_TTL_SECONDS);
    await this.redis.client.set(cooldownKey, "1", "EX", RESEND_COOLDOWN_SECONDS);

    if (env.OTP_PROVIDER === "mock") {
      // Dev convenience (plan §3): code lands in api logs; 000000 also works.
      this.logger.log(`[mock-otp] code for ${phone}: ${code} (000000 also accepted)`);
      return;
    }
    throw new BadRequestException(`OTP provider '${env.OTP_PROVIDER}' is not wired yet`);
  }

  async verify(phone: string, code: string): Promise<boolean> {
    if (env.OTP_PROVIDER === "mock" && code === "000000") return true;

    const attemptsKey = `${this.key(phone)}:attempts`;
    const attempts = await this.redis.client.incr(attemptsKey);
    if (attempts > MAX_ATTEMPTS) {
      throw new BadRequestException("too many attempts — request a fresh code");
    }
    const stored = await this.redis.client.get(this.key(phone));
    if (!stored || stored !== code) return false;

    await this.redis.client.del(this.key(phone), attemptsKey);
    return true;
  }
}
