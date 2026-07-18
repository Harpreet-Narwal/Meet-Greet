import { Injectable } from "@nestjs/common";

import { RedisService } from "../redis/redis.service";
import type { BaseState } from "./engines";

/**
 * Game state lives in Redis so it survives reconnects and multiple gateway
 * instances (plan §6: "state lives in Redis"; room:state snapshot on join).
 */
@Injectable()
export class GameStateStore {
  private static readonly TTL_SECONDS = 6 * 3600; // a table's evening

  constructor(private readonly redis: RedisService) {}

  private key(tableId: string): string {
    return `game:${tableId}`;
  }

  async get(tableId: string): Promise<BaseState | null> {
    const raw = await this.redis.client.get(this.key(tableId));
    return raw ? (JSON.parse(raw) as BaseState) : null;
  }

  async set(tableId: string, state: BaseState): Promise<void> {
    await this.redis.client.set(
      this.key(tableId),
      JSON.stringify(state),
      "EX",
      GameStateStore.TTL_SECONDS,
    );
  }

  async clear(tableId: string): Promise<void> {
    await this.redis.client.del(this.key(tableId));
  }
}
