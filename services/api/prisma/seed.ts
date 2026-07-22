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
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + event.daysFromNow);
    startsAt.setUTCHours(event.hour, 0, 0, 0);
    startsAt.setTime(startsAt.getTime() - IST_OFFSET_MS);
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

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
