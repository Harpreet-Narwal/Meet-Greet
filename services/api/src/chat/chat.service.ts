import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMember(chatId: string, userId: string): Promise<void> {
    const member = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!member) throw new NotFoundException("no such chat");
  }

  async myChats(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, firstName: true, photoUrl: true } } },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        event: { select: { title: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    const now = Date.now();
    return chats
      .filter((c) => !c.expiresAt || c.expiresAt.getTime() > now)
      .map((c) => ({
        id: c.id,
        kind: c.kind,
        title:
          c.kind === "table_group"
            ? (c.event?.title ?? "Your table")
            : (c.members.find((m) => m.userId !== userId)?.user.firstName ?? "Chat"),
        members: c.members.map((m) => ({
          id: m.user.id,
          first_name: m.user.firstName,
          photo_url: m.user.photoUrl,
        })),
        last_message: c.messages[0]?.body ?? null,
        expires_at: c.expiresAt?.toISOString() ?? null,
        is_spark: c.kind === "direct",
      }));
  }

  async messages(userId: string, chatId: string) {
    await this.assertMember(chatId, userId);
    const rows = await this.prisma.message.findMany({
      where: { chatId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { sender: { select: { id: true, firstName: true } } },
    });
    return rows.map((m) => ({
      id: m.id,
      body: m.body,
      kind: m.kind,
      sender_id: m.senderId,
      sender_name: m.sender.firstName,
      created_at: m.createdAt.toISOString(),
    }));
  }

  async send(userId: string, chatId: string, body: string) {
    await this.assertMember(chatId, userId);
    const chat = await this.prisma.chat.findUniqueOrThrow({ where: { id: chatId } });
    if (chat.expiresAt && chat.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("this chat has closed");
    }
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 2000) throw new BadRequestException("message must be 1-2000 chars");
    const message = await this.prisma.message.create({
      data: { chatId, senderId: userId, body: trimmed, kind: "text" },
      include: { sender: { select: { firstName: true } } },
    });
    await this.prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
    return {
      id: message.id,
      body: message.body,
      kind: message.kind,
      sender_id: userId,
      sender_name: message.sender.firstName,
      created_at: message.createdAt.toISOString(),
      chat_id: chatId,
    };
  }

  /** Create the table group chat (7-day expiry) at rating-nudge time. */
  async ensureTableGroupChat(eventId: string, tableId: string): Promise<string | null> {
    const existing = await this.prisma.chat.findFirst({
      where: { kind: "table_group", eventId },
    });
    if (existing) return existing.id;
    const seatmates = await this.prisma.booking.findMany({
      where: { tableId, status: { in: ["checked_in", "no_show"] } },
      select: { userId: true },
    });
    if (seatmates.length < 2) return null;
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const chat = await this.prisma.chat.create({
      data: {
        kind: "table_group",
        eventId,
        expiresAt,
        members: { create: seatmates.map((s) => ({ userId: s.userId })) },
      },
    });
    return chat.id;
  }

  /** Close table group chats past T+7d (BullMQ, daily). Returns count closed. */
  async expireGroupChats(): Promise<number> {
    // We keep them but block sends via expiresAt; nothing to delete. Report how
    // many are now past expiry for observability.
    return this.prisma.chat.count({
      where: { kind: "table_group", expiresAt: { lt: new Date() } },
    });
  }
}
