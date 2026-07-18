import { Module } from "@nestjs/common";

import { ChatModule } from "../chat/chat.module";
import { ConnectionsController } from "./connections.controller";
import { ConnectionsService } from "./connections.service";
import { RatingsService } from "./ratings.service";

@Module({
  imports: [ChatModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService, RatingsService],
  exports: [ConnectionsService, RatingsService],
})
export class ConnectionsModule {}
