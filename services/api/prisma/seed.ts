/**
 * Seed skeleton (M0). Grows with the milestones:
 *   M1 → quiz questions from docs/seed-content.md (verbatim)
 *   M2 → venues, events (some past, for history), 30 quiz-completed users
 *   M2 → game decks from docs/seed-content.md (verbatim, safety_reviewed=true)
 * Idempotent — safe to run repeatedly.
 */
import { PrismaClient } from "@prisma/client";

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

  const [cities, users] = await Promise.all([prisma.city.count(), prisma.user.count()]);
  console.log(`Seeded ✓  cities=${cities} users=${users} (quiz/venues/events/decks land in M1–M2)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
