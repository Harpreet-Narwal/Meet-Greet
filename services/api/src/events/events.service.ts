import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Event, Venue } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import {
  VENUE_VISIBLE_STATUSES,
  type AdminEventDto,
  type AdminEventPatchDto,
  type EventListQuery,
} from "./events.types";

export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: Event["type"];
  starts_at: string;
  duration_min: number;
  price_inr: number;
  budget_band: Event["budgetBand"];
  women_only: boolean;
  status: Event["status"];
  city_slug: string;
  neighborhood_teaser: string | null;
  seats_total: number;
  seats_left: number;
  /** Only present once revealed. */
  venue: {
    name: string;
    address: string;
    neighborhood: string;
    lat: number;
    lng: number;
  } | null;
}

const ACTIVE_BOOKING_STATUSES = ["pending_payment", "confirmed", "checked_in"] as const;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublic(
    event: Event & { venue: Venue | null; city: { slug: string } },
    activeBookings: number,
  ): PublicEvent {
    const venueVisible = (VENUE_VISIBLE_STATUSES as readonly string[]).includes(event.status);
    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description,
      type: event.type,
      starts_at: event.startsAt.toISOString(),
      duration_min: event.durationMin,
      price_inr: event.priceInr,
      budget_band: event.budgetBand,
      women_only: event.womenOnly,
      status: event.status,
      city_slug: event.city.slug,
      neighborhood_teaser: event.neighborhoodTeaser,
      seats_total: event.capacity,
      seats_left: Math.max(event.capacity - activeBookings, 0),
      venue:
        venueVisible && event.venue
          ? {
              name: event.venue.name,
              address: event.venue.address,
              neighborhood: event.venue.neighborhood,
              lat: event.venue.lat,
              lng: event.venue.lng,
            }
          : null,
    };
  }

  async list(query: EventListQuery): Promise<PublicEvent[]> {
    const dayStart = query.date ? new Date(`${query.date}T00:00:00+05:30`) : undefined;
    const dayEnd = dayStart ? new Date(dayStart.getTime() + 24 * 3600 * 1000) : undefined;
    const events = await this.prisma.event.findMany({
      where: {
        city: { slug: query.city },
        type: query.type,
        budgetBand: query.budget,
        status: query.include_past ? { in: ["published", "revealed", "live", "completed"] } : { in: ["published", "revealed", "live"] },
        startsAt: dayStart ? { gte: dayStart, lt: dayEnd } : query.include_past ? undefined : { gte: new Date() },
      },
      include: { venue: true, city: { select: { slug: true } } },
      orderBy: { startsAt: "asc" },
      take: 50,
    });
    const counts = await this.prisma.booking.groupBy({
      by: ["eventId"],
      where: {
        eventId: { in: events.map((event) => event.id) },
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      _count: true,
    });
    const countByEvent = new Map(counts.map((row) => [row.eventId, row._count]));
    return events.map((event) => this.toPublic(event, countByEvent.get(event.id) ?? 0));
  }

  async getBySlug(slug: string): Promise<PublicEvent> {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: { venue: true, city: { select: { slug: true } } },
    });
    if (!event || event.status === "draft") throw new NotFoundException("no such table");
    const activeBookings = await this.prisma.booking.count({
      where: { eventId: event.id, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
    });
    return this.toPublic(event, activeBookings);
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  async adminCreate(dto: AdminEventDto): Promise<PublicEvent> {
    const city = await this.prisma.city.findUnique({ where: { slug: dto.city_slug } });
    if (!city) throw new BadRequestException(`unknown city: ${dto.city_slug}`);
    let venueId: string | undefined;
    if (dto.venue_slug) {
      const venue = await this.prisma.venue.findUnique({
        where: { cityId_slug: { cityId: city.id, slug: dto.venue_slug } },
      });
      if (!venue) throw new BadRequestException(`unknown venue: ${dto.venue_slug}`);
      venueId = venue.id;
    }
    const event = await this.prisma.event.create({
      data: {
        cityId: city.id,
        venueId,
        type: dto.type,
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        startsAt: dto.starts_at,
        durationMin: dto.duration_min,
        priceInr: dto.price_inr,
        capacity: dto.capacity,
        budgetBand: dto.budget_band,
        womenOnly: dto.women_only,
        neighborhoodTeaser: dto.neighborhood_teaser,
        status: "published",
        tables: {
          create: Array.from({ length: dto.tables }, (_ignored, index) => ({
            tableNumber: index + 1,
            capacity: 6,
          })),
        },
      },
    });
    return this.getBySlug(event.slug);
  }

  async adminPatch(id: string, dto: AdminEventPatchDto): Promise<PublicEvent> {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException("no such event");
    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        startsAt: dto.starts_at,
        durationMin: dto.duration_min,
        priceInr: dto.price_inr,
        capacity: dto.capacity,
        budgetBand: dto.budget_band,
        womenOnly: dto.women_only,
        neighborhoodTeaser: dto.neighborhood_teaser,
        status: dto.status,
      },
    });
    return this.getBySlug(updated.slug);
  }
}
