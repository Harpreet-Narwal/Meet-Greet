import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { DeckKind, DeckLocale } from "@prisma/client";

import { AiClient } from "../ai/ai.client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiClient,
  ) {}

  /** Admin: RAG-generate a draft deck (cards land safety_reviewed=false). */
  async generate(dto: {
    kind: DeckKind;
    level?: number;
    locale: DeckLocale;
    count: number;
    context_tags: string[];
    title: string;
  }) {
    const result = await this.ai.generateDeck({
      kind: dto.kind,
      level: dto.level,
      locale: dto.locale,
      count: dto.count,
      context_tags: dto.context_tags,
    });
    if (result.cards.length === 0) {
      throw new BadRequestException("the generator returned no usable cards — try different tags");
    }
    const deck = await this.prisma.deck.create({
      data: {
        kind: dto.kind,
        locale: dto.locale,
        title: dto.title,
        level: dto.level,
        source: "generated",
        status: "draft", // never active until an admin approves
        cards: {
          create: result.cards.map((card, ord) => ({
            ord,
            text: card.text,
            safetyReviewed: false,
          })),
        },
      },
      include: { cards: { orderBy: { ord: "asc" } } },
    });
    return this.toView(deck);
  }

  /** Moderation queue: draft/generated decks awaiting approval. */
  async pending() {
    const decks = await this.prisma.deck.findMany({
      where: { status: "draft", deletedAt: null },
      include: { cards: { where: { deletedAt: null }, orderBy: { ord: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return decks.map((d) => this.toView(d));
  }

  /** Approve a deck → safety_reviewed on every card, deck goes active/live. */
  async approve(deckId: string) {
    const deck = await this.prisma.deck.findUnique({ where: { id: deckId } });
    if (!deck) throw new NotFoundException("no such deck");
    await this.prisma.$transaction([
      this.prisma.deckCard.updateMany({
        where: { deckId },
        data: { safetyReviewed: true },
      }),
      this.prisma.deck.update({ where: { id: deckId }, data: { status: "active" } }),
    ]);
    return { approved: true };
  }

  async reject(deckId: string) {
    await this.prisma.deck.update({
      where: { id: deckId },
      data: { status: "retired", deletedAt: new Date() },
    });
    return { rejected: true };
  }

  private toView(deck: {
    id: string;
    kind: DeckKind;
    title: string;
    level: number | null;
    status: string;
    source: string;
    cards: { id: string; text: string; safetyReviewed: boolean }[];
  }) {
    return {
      id: deck.id,
      kind: deck.kind,
      title: deck.title,
      level: deck.level,
      status: deck.status,
      source: deck.source,
      cards: deck.cards.map((c) => ({
        id: c.id,
        text: c.text,
        safety_reviewed: c.safetyReviewed,
      })),
    };
  }
}
