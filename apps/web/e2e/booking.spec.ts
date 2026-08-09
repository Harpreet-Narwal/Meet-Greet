import { expect, test } from "@playwright/test";

/**
 * M2 acceptance: explore → event page → book (mock pay auto-confirms) →
 * two truths → confirmation → tonight shows the booking.
 */
test("book a table end-to-end with mock payments", async ({ page }) => {
  const phone = `94${String(Date.now()).slice(-8)}`;

  // Sign in (new user; we skip the quiz — booking doesn't require it)
  await page.goto("/login");
  await page.getByTestId("phone-input").fill(phone);
  await page.getByTestId("request-otp").click();
  await page.getByTestId("otp-input").fill("000000");
  await page.getByTestId("verify-otp").click();
  await page.waitForURL("**/onboarding/quiz");

  // Straight to the catalogue
  await page.goto("/explore");
  await expect(page.getByTestId("event-grid")).toBeVisible();

  // Pick the chai table (cheap, never race-contended in tests)
  await page.getByRole("link", { name: /Chai & Chill/ }).first().click();
  await expect(page.getByTestId("book-cta")).toBeVisible();
  await page.getByTestId("book-cta").click();

  // Wait for the SPA transition to the booking page to settle before interacting
  // (clicking during the freshly-mounted client component's hydration is lost).
  await page.waitForURL("**/book");
  const confirm = page.getByTestId("confirm-booking");
  await expect(confirm).toBeEnabled();
  await confirm.click();

  // Paid seats now stop at checkout — the seat is held, not sold, until this
  // settles. The chai table is ₹99, so this step always appears; awaiting it
  // (rather than probing isVisible) also waits out the booking round-trip.
  const payButton = page.getByTestId("pay-booking");
  await expect(payButton).toBeVisible();
  await payButton.click();

  // Payment settled → two truths step
  await page.getByTestId("truth-1").fill("I've cycled Nandi Hills before sunrise");
  await page.getByTestId("truth-2").fill("I own forty board games");
  await page.getByTestId("lie").fill("I've never burnt Maggi");
  await page.getByTestId("submit-truths").click();

  await expect(page.getByTestId("booking-done")).toContainText("Your table awaits");
  await page.getByTestId("to-tonight").click();

  await expect(page.getByTestId("next-booking")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("next-booking")).toContainText("Chai & Chill");
  await expect(page.getByTestId("next-booking")).toContainText("Confirmed");

  // Release the seat. This spec books a REAL seat on a seeded table, and the
  // chai table is only twelve chairs — left uncancelled, a dozen runs sell it
  // out and every later run fails on an aria-disabled "Waitlist open" row that
  // looks nothing like the actual cause.
  await page.evaluate(async () => {
    const mine = await (await fetch("/api/bff/me/bookings")).json();
    const booking = (mine.upcoming ?? [])[0];
    if (booking) await fetch(`/api/bff/bookings/${booking.id}`, { method: "DELETE" });
  });
});
