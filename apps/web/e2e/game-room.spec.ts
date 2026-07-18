import { expect, test, type Page } from "@playwright/test";

/**
 * M4 acceptance (plan §11): two browser contexts play a full icebreaker +
 * hot-takes round in the game room; state survives a refresh.
 *
 * The two guests must be booked, matched to the SAME table, and checked in.
 * We drive that through the public API using the seeded admin, then open two
 * real browser sessions.
 */

const API = "http://localhost:4000";

async function api(path: string, opts: { token?: string; body?: unknown; method?: string } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function login(phone: string): Promise<{ token: string; userId: string }> {
  const res = await api("/v1/auth/otp/verify", { body: { phone, code: "000000" } });
  const token = res.body.access_token as string;
  const userId = JSON.parse(Buffer.from(token.split(".")[1]!, "base64").toString()).sub as string;
  return { token, userId };
}

/** Bridge the httpOnly session: log the browser in via the web BFF. */
async function browserLogin(page: Page, phone: string) {
  await page.goto("/login");
  await page.getByTestId("phone-input").fill(phone.replace("+91", ""));
  await page.getByTestId("request-otp").click();
  await page.getByTestId("otp-input").fill("000000");
  await page.getByTestId("verify-otp").click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20_000 });
}

test("two guests play icebreaker + hot-takes; state survives refresh", async ({ browser }) => {
  const runId = String(Date.now()).slice(-7);
  const admin = await login("+911000000001");

  // Create a free event 40h out so bookings auto-confirm
  const city = (await api("/v1/cities")).body.find((c: { slug: string }) => c.slug === "bangalore");
  expect(city).toBeTruthy();
  const created = await api("/v1/admin/events", {
    token: admin.token,
    body: {
      city_slug: "bangalore",
      type: "game_night",
      title: `Game-room test ${runId}`,
      slug: `game-room-test-${runId}`,
      description: "A game-night for the M4 acceptance test — two guests, one table.",
      starts_at: new Date(Date.now() + 40 * 3600 * 1000).toISOString(),
      duration_min: 120,
      price_inr: 0,
      capacity: 6,
      budget_band: "moderate",
      tables: 1,
    },
  });
  const eventId = created.body.id as string;

  // Matching needs ≥5 guests (tables of 5-6). Create 6 (one table); we drive the
  // first two in browsers. +91 + exactly 10 national digits (web needs 10).
  const phones = Array.from({ length: 6 }, (_v, i) => `+919${runId}0${i}`);
  const guests = [] as { token: string; userId: string; phone: string }[];
  for (const phone of phones) {
    const g = await login(phone);
    await api(`/v1/events/${eventId}/bookings`, { token: g.token, method: "POST" });
    guests.push({ ...g, phone });
  }

  // Run matching so all six land at table 1
  await api(`/v1/admin/events/${eventId}/match`, { token: admin.token, method: "POST" });
  await api(`/v1/admin/events/${eventId}/reveal`, { token: admin.token, method: "POST" });
  // Check in only the two we'll drive (they become the table's players)
  const driven = [guests[0]!, guests[1]!];
  for (const g of driven) {
    const tok = await api(`/v1/events/${eventId}/checkin-token`, { token: g.token });
    await api(`/v1/events/${eventId}/checkin`, {
      token: g.token,
      body: { qr_token: tok.body.qr_token },
    });
  }

  // Two real browser sessions
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  await browserLogin(pageA, driven[0]!.phone);
  await browserLogin(pageB, driven[1]!.phone);

  await pageA.goto(`/rooms/${eventId}`);
  await pageB.goto(`/rooms/${eventId}`);

  // Both reach the lobby
  await expect(pageA.getByTestId("lobby")).toBeVisible({ timeout: 20_000 });
  await expect(pageB.getByTestId("lobby")).toBeVisible({ timeout: 20_000 });

  // Guest A starts icebreakers → both see a card synced
  await pageA.getByTestId("start-icebreaker").click();
  await expect(pageA.getByTestId("game-card")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByTestId("game-card")).toBeVisible({ timeout: 10_000 });
  await expect(pageA.getByTestId("level-meter")).toBeVisible();

  const firstCard = await pageA.getByTestId("game-card").textContent();

  // ── State survives a refresh (reconnect snapshot) ──
  await pageB.reload();
  await expect(pageB.getByTestId("game-card")).toHaveText(firstCard ?? "", { timeout: 15_000 });

  // Advance a card — both move together
  await pageA.getByTestId("advance").click();
  await expect
    .poll(async () => pageB.getByTestId("game-card").textContent(), { timeout: 10_000 })
    .not.toBe(firstCard);

  // Play the icebreaker deck to the end (12 cards) to reach the "ended" screen
  for (let i = 0; i < 14; i++) {
    if (await pageA.getByTestId("game-ended").isVisible().catch(() => false)) break;
    await pageA.getByTestId("advance").click().catch(() => undefined);
    await pageA.waitForTimeout(150);
  }
  await expect(pageA.getByTestId("game-ended")).toBeVisible({ timeout: 10_000 });

  // ── Hot-takes round: "Play something else" starts hot_takes for the table ──
  await pageA.getByRole("button", { name: /Play something else/ }).click();
  await expect(pageA.getByTestId("vote-ab")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByTestId("vote-ab")).toBeVisible({ timeout: 10_000 });

  // Both vote → both see the reveal split (2 votes total)
  await pageA.getByRole("button", { name: /Agree/ }).click();
  await pageB.getByRole("button", { name: /Nope/ }).click();
  await expect(pageA.getByTestId("vote-result")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByTestId("vote-result")).toBeVisible({ timeout: 10_000 });

  await ctxA.close();
  await ctxB.close();
});
