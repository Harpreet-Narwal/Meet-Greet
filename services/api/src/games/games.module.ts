import { Module } from "@nestjs/common";

import { GameStateStore } from "./game-state.store";
import { GamesGateway } from "./games.gateway";

@Module({
  providers: [GamesGateway, GameStateStore],
})
export class GamesModule {}
