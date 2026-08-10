/**
 * Seed skeleton (M0). Grows with the milestones:
 *   M1 → quiz questions from docs/seed-content.md (verbatim)
 *   M2 → venues, events (some past, for history), 30 quiz-completed users
 *   M2 → game decks from docs/seed-content.md (verbatim, safety_reviewed=true)
 * Idempotent — safe to run repeatedly.
 */
import { PrismaClient } from "@prisma/client";

import { decks as seedDecks } from "./seed-data/decks";
import { buildSeedUsers, events as seedEvents, venues as seedVenues } from "./seed-data/demo-content";
import { QUIZ_VERSION, quizQuestionsV1 } from "./seed-data/quiz-v1";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Cities: Bangalore live first, Mumbai queued (plan §5)
  const bangalore = await prisma.city.upsert({
    where: { slug: "bangalore" },
    update: { isLive: true, launchOrder: 1 },
    create: {
      name: "Bengaluru",
      slug: "bangalore",
      state: "Karnataka",
      isLive: true,
      launchOrder: 1,
    },
  });

  await prisma.city.upsert({
    where: { slug: "mumbai" },
    update: { isLive: false, launchOrder: 2 },
    create: {
      name: "Mumbai",
      slug: "mumbai",
      state: "Maharashtra",
      isLive: false,
      launchOrder: 2,
    },
  });

  // Admin (operator checklist: admin@mulaqat.app)
  await prisma.user.upsert({
    where: { phone: "+911000000001" },
    update: { role: "admin" },
    create: {
      phone: "+911000000001",
      email: "admin@mulaqat.app",
      fullName: "Mulaqat Admin",
      firstName: "Admin",
      role: "admin",
      cityId: bangalore.id,
      languages: ["English", "Hindi"],
    },
  });

  // Two hosts — the people who make tables feel hosted, not managed
  const hosts = [
    { phone: "+911000000002", fullName: "Aisha Menon", firstName: "Aisha" },
    { phone: "+911000000003", fullName: "Rohan Deshpande", firstName: "Rohan" },
  ];
  for (const host of hosts) {
    await prisma.user.upsert({
      where: { phone: host.phone },
      update: { role: "host" },
      create: {
        ...host,
        role: "host",
        cityId: bangalore.id,
        languages: ["English", "Hinglish obviously"],
      },
    });
  }

  // Quiz v1 — verbatim from docs/seed-content.md
  for (const question of quizQuestionsV1) {
    await prisma.quizQuestion.upsert({
      where: {
        version_locale_ord: { version: QUIZ_VERSION, locale: "en", ord: question.ord },
      },
      create: {
        version: QUIZ_VERSION,
        locale: "en",
        ord: question.ord,
        kind: question.kind,
        text: question.text,
        subtext: question.subtext,
        traitKey: question.traitKey,
        options: question.options as never,
      },
      update: {
        kind: question.kind,
        text: question.text,
        subtext: question.subtext,
        traitKey: question.traitKey,
        options: question.options as never,
      },
    });
  }

  // ── M2: venues, events (+tables), 30 quiz-completed users ────────────────
  const venueIdBySlug = new Map<string, string>();
  for (const venue of seedVenues) {
    const row = await prisma.venue.upsert({
      where: { cityId_slug: { cityId: bangalore.id, slug: venue.slug } },
      update: { partnerStatus: "active" },
      create: {
        cityId: bangalore.id,
        slug: venue.slug,
        name: venue.name,
        address: venue.address,
        neighborhood: venue.neighborhood,
        lat: venue.lat,
        lng: venue.lng,
        vibeTags: venue.vibeTags,
        priceBand: venue.priceBand,
        capacity: venue.capacity,
        partnerStatus: "active",
      },
    });
    venueIdBySlug.set(venue.slug, row.id);
  }

  const hostRow = await prisma.user.findUnique({ where: { phone: "+911000000002" } });
  const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // Asia/Kolkata is UTC+5:30
  for (const event of seedEvents) {
    // event.hour is IST wall-clock (8 PM dinner = 20). Build the instant whose
    // IST representation is that hour, regardless of the server's timezone, so
    // the UI (which formats in Asia/Kolkata) shows the intended local time.
    let startsAt: Date;
    if (event.hoursFromNow !== undefined) {
      // Relative to *now*, not to a wall-clock hour — see the field's comment.
      startsAt = new Date(Date.now() + event.hoursFromNow * 3600_000);
    } else {
      startsAt = new Date();
      startsAt.setDate(startsAt.getDate() + event.daysFromNow);
      startsAt.setUTCHours(event.hour, 0, 0, 0);
      startsAt.setTime(startsAt.getTime() - IST_OFFSET_MS);
    }
    const row = await prisma.event.upsert({
      where: { slug: event.slug },
      update: { startsAt, status: event.status },
      create: {
        cityId: bangalore.id,
        venueId: venueIdBySlug.get(event.venueSlug),
        type: event.type,
        title: event.title,
        slug: event.slug,
        description: event.description,
        startsAt,
        durationMin: event.durationMin,
        priceInr: event.priceInr,
        capacity: event.capacity,
        budgetBand: event.budgetBand,
        womenOnly: event.womenOnly,
        menOnly: event.menOnly,
        hostId: hostRow?.id,
        status: event.status,
        neighborhoodTeaser: event.neighborhoodTeaser,
      },
    });
    for (let tableNumber = 1; tableNumber <= event.tables; tableNumber++) {
      await prisma.eventTable.upsert({
        where: { eventId_tableNumber: { eventId: row.id, tableNumber } },
        update: {},
        create: { eventId: row.id, tableNumber, capacity: 6 },
      });
    }
  }

  for (const seedUser of buildSeedUsers()) {
    const row = await prisma.user.upsert({
      where: { phone: seedUser.phone },
      update: {},
      create: {
        phone: seedUser.phone,
        email: seedUser.email,
        fullName: seedUser.fullName,
        firstName: seedUser.firstName,
        gender: seedUser.gender,
        dob: new Date(Date.UTC(seedUser.dobYear, 5, 15)),
        cityId: bangalore.id,
        dietary: seedUser.dietary,
        languages: seedUser.languages,
        interests: seedUser.interests,
        relationshipIntent: seedUser.relationshipIntent,
        selfieVerified: true,
      },
    });
    await prisma.personalityProfile.upsert({
      where: { userId: row.id },
      update: {},
      create: {
        userId: row.id,
        quizVersion: QUIZ_VERSION,
        traitEnergy: seedUser.traits.energy,
        traitDepth: seedUser.traits.depth,
        traitNovelty: seedUser.traits.novelty,
        traitStructure: seedUser.traits.structure,
        humorStyles: seedUser.humorStyles,
        archetype: seedUser.archetype,
        archetypeEmoji: seedUser.archetypeEmoji,
        completedAt: new Date("2026-07-01T09:00:00Z"),
      },
    });
  }

  // ── Game decks (verbatim from docs/seed-content.md, safety_reviewed=true) ──
  for (const deck of seedDecks) {
    const existing = await prisma.deck.findFirst({ where: { title: deck.title, source: "seed" } });
    const row = existing
      ? await prisma.deck.update({ where: { id: existing.id }, data: { status: "active" } })
      : await prisma.deck.create({
          data: {
            kind: deck.kind,
            locale: deck.locale,
            title: deck.title,
            level: deck.level,
            source: "seed",
            status: "active",
          },
        });
    for (const [ord, card] of deck.cards.entries()) {
      await prisma.deckCard.upsert({
        where: { deckId_ord: { deckId: row.id, ord } },
        update: { text: card.text, answer: card.answer, safetyReviewed: true },
        create: {
          deckId: row.id,
          ord,
          text: card.text,
          answer: card.answer,
          tags: [],
          safetyReviewed: true,
        },
      });
    }
  }

  await seedTableChat();

  const [cities, users, quizQuestions, venueCount, eventCount, deckCount, cardCount] =
    await Promise.all([
      prisma.city.count(),
      prisma.user.count(),
      prisma.quizQuestion.count({ where: { version: QUIZ_VERSION } }),
      prisma.venue.count(),
      prisma.event.count(),
      prisma.deck.count(),
      prisma.deckCard.count(),
    ]);
  console.log(
    `Seeded ✓  cities=${cities} users=${users} quiz_questions=${quizQuestions} venues=${venueCount} ` +
      `events=${eventCount} decks=${deckCount} deck_cards=${cardCount}`,
  );
}

/**
 * Give the dev fixture table a group chat that is already alive.
 *
 * `ensureTableChat` (bookings.service) adds a paying guest to their table's chat,
 * but on a fresh database that chat has exactly one member and nothing in it —
 * which tests the plumbing and none of the experience. This seats five demo
 * guests and leaves a conversation mid-flow, so booking `test-table-tonight`
 * lands you somewhere with people already talking.
 *
 * Idempotent: keyed on the chat's event, and it re-runs only when empty.
 */
async function seedTableChat(): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: "test-table-tonight" } });
  if (!event) return;

  const chat =
    (await prisma.chat.findFirst({ where: { eventId: event.id, kind: "table_group" } })) ??
    (await prisma.chat.create({
      data: {
        kind: "table_group",
        eventId: event.id,
        // A table chat outlives the dinner by a week, matching production.
        expiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
      },
    }));

  if ((await prisma.message.count({ where: { chatId: chat.id } })) > 0) return;

  // Demo guests, by the phones buildSeedUsers() assigns.
  const phones = [
    "+919876000001",
    "+919876000003",
    "+919876000005",
    "+919876000007",
    "+919876000009",
  ];
  const guests = await prisma.user.findMany({ where: { phone: { in: phones } } });
  if (guests.length === 0) return;

  for (const guest of guests) {
    await prisma.chatMember.upsert({
      where: { chatId_userId: { chatId: chat.id, userId: guest.id } },
      update: {},
      create: { chatId: chat.id, userId: guest.id },
    });
  }

  // Written to read like people who have not met yet — the tone the real
  // table chat opens in, not filler.
  const script: [number, string][] = [
    [0, "Okay who's actually on time tonight? I'm notoriously 10 minutes late."],
    [1, "Guilty. But I'll bring the good chocolate as an apology in advance."],
    [2, "Ooh which one — the sea salt one from that place in Indiranagar?"],
    [1, "That's the one. Consider it settled then."],
    [3, "I'm coming straight from work so I may be the one in office clothes, be kind."],
    [0, "Honestly same. Solidarity."],
    [4, "Has anyone been to this place before? Asking for my very indecisive self."],
    [2, "Not yet! Heard the filter coffee is unreasonably good though."],
    [3, "Sold. See you all at 8."],
  ];

  const base = Date.now() - script.length * 4 * 60_000;
  for (const [index, [speaker, body]] of script.entries()) {
    const sender = guests[speaker % guests.length];
    if (!sender) continue;
    await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: sender.id,
        kind: "text",
        body,
        // Spread backwards from now so the thread has a believable rhythm
        // instead of nine messages sharing one timestamp.
        createdAt: new Date(base + index * 4 * 60_000),
      },
    });
  }
  await prisma.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
