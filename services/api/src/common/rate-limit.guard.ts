import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { env } from "../config/env";
import { RedisService } from "../redis/redis.service";

export interface RateLimit {
  limit: number;
  windowSec: number;
}

export const RATE_LIMIT_KEY = "rateLimit";
/** Cap a route: N requests per window per client IP (+ route). */
export const Throttle = (limit: number, windowSec: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowSec });

/**
 * Redis fixed-window rate limiter (plan §7 hardening). Protects abuse-prone
 * routes — OTP request/verify especially. Fails OPEN if Redis is unavailable so
 * a cache blip never locks users out.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // tests hammer OTP from one IP; throttling is a production concern
    if (env.NODE_ENV === "test") return true;
    const config = this.reflector.getAllAndOverride<RateLimit | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!config) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const ip =
      (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      request.ip ??
      "unknown";
    const route = `${request.method}:${request.route?.path ?? request.path}`;
    const key = `ratelimit:${route}:${ip}`;

    try {
      const count = await this.redis.client.incr(key);
      if (count === 1) await this.redis.client.expire(key, config.windowSec);
      if (count > config.limit) {
        throw new HttpException(
          "slow down a little — too many attempts, try again shortly",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      return true; // fail open on cache errors
    }
    return true;
  }
}
