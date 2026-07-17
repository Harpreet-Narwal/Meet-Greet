import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get("health")
  @ApiOperation({ summary: "Liveness — process is up (no dependency checks)" })
  health(): { status: "ok"; service: "api" } {
    return { status: "ok", service: "api" };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness — database and redis reachable" })
  async ready(): Promise<{ status: "ready"; db: "up"; redis: "up" }> {
    const [db, redis] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(
        () => true,
        () => false,
      ),
      this.redis.ping(),
    ]);
    if (!db || !redis) {
      throw new ServiceUnavailableException({
        status: "not_ready",
        db: db ? "up" : "down",
        redis: redis ? "up" : "down",
      });
    }
    return { status: "ready", db: "up", redis: "up" };
  }
}
