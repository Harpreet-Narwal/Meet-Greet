import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Public } from "../auth/public.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { EventsService } from "./events.service";
import {
  AdminEventPatchSchema,
  AdminEventSchema,
  EventListQuerySchema,
  type AdminEventDto,
  type AdminEventPatchDto,
  type EventListQuery,
} from "./events.types";

@ApiTags("events")
@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Published events for a city (public, SEO-consumable)" })
  list(@Query(new ZodValidationPipe(EventListQuerySchema)) query: EventListQuery) {
    return this.events.list(query);
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Public event detail — venue hidden until reveal" })
  bySlug(@Param("slug") slug: string) {
    return this.events.getBySlug(slug);
  }
}

@ApiTags("admin")
@ApiBearerAuth()
@Roles("admin")
@UseGuards(RolesGuard)
@Controller("admin/events")
export class AdminEventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @ApiOperation({ summary: "Create + publish an event (admin)" })
  create(@Body(new ZodValidationPipe(AdminEventSchema)) body: AdminEventDto) {
    return this.events.adminCreate(body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update event fields / status (admin)" })
  patch(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(AdminEventPatchSchema)) body: AdminEventPatchDto,
  ) {
    return this.events.adminPatch(id, body);
  }
}
