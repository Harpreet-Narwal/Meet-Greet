import { Module } from "@nestjs/common";

import { AdminEventsController, EventsController } from "./events.controller";
import { EventsService } from "./events.service";

@Module({
  controllers: [EventsController, AdminEventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
