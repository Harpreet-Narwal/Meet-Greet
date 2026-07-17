import { ServiceUnavailableException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { HealthController } from "./health.controller";

function makeController(dbUp: boolean, redisUp: boolean): HealthController {
  const prisma = {
    $queryRaw: dbUp ? jest.fn().mockResolvedValue([1]) : jest.fn().mockRejectedValue(new Error("db down")),
  } as unknown as PrismaService; // narrow test double; only $queryRaw is exercised
  const redis = {
    ping: jest.fn().mockResolvedValue(redisUp),
  } as unknown as RedisService; // narrow test double; only ping() is exercised
  return new HealthController(prisma, redis);
}

describe("HealthController", () => {
  it("health() reports liveness with no dependency checks", () => {
    const controller = makeController(false, false);
    expect(controller.health()).toEqual({ status: "ok", service: "api" });
  });

  it("ready() passes when db and redis are up", async () => {
    const controller = makeController(true, true);
    await expect(controller.ready()).resolves.toEqual({
      status: "ready",
      db: "up",
      redis: "up",
    });
  });

  it("ready() returns 503 when the database is down", async () => {
    const controller = makeController(false, true);
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("ready() returns 503 when redis is down", async () => {
    const controller = makeController(true, false);
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
