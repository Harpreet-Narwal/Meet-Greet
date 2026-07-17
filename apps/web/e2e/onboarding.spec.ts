import { expect, test } from "@playwright/test";

/**
 * M1 acceptance (plan §11): a new user completes the quiz → sees their
 * archetype card → profile is persisted on /you.
 */
test("new user: login → quiz → archetype reveal → profile", async ({ page }) => {
  const phone = `90${String(Date.now()).slice(-8)}`;

  // ── Login with mock OTP ────────────────────────────────────────
  await page.goto("/login");
  await page.getByTestId("phone-input").fill(phone);
  await page.getByTestId("request-otp").click();
  await page.getByTestId("otp-input").fill("000000");
  await page.getByTestId("verify-otp").click();

  // ── Quiz intro: name + start ───────────────────────────────────
  await expect(page.getByTestId("name-input")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("name-input").fill("Meera");
  await page.getByTestId("start-quiz").click();

  // ── Answer all 15 questions, whatever kind shows up ────────────
  // Each step scopes to its own question container (seed ords are 1..15) so
  // exit-animating previous questions can never be clicked by mistake.
  for (let ord = 1; ord <= 15; ord++) {
    const container = page.getByTestId(`question-${ord}`);
    await expect(container).toBeVisible({ timeout: 20_000 });
    const slider = container.getByTestId("slider");
    const continueButton = container.getByTestId("continue");

    if (await slider.isVisible().catch(() => false)) {
      await slider.fill("40");
      await continueButton.click();
    } else if (await continueButton.isVisible().catch(() => false)) {
      // multi: tap chips until the continue button unlocks
      const chips = container.locator('[data-testid^="option-"]');
      const count = await chips.count();
      for (let i = 0; i < count; i++) {
        if (await continueButton.isEnabled()) break;
        await chips.nth(i).click();
      }
      await continueButton.click();
    } else {
      await container.locator('[data-testid^="option-"]').first().click();
    }
  }

  // ── Archetype reveal ───────────────────────────────────────────
  await expect(page.getByTestId("archetype-card")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("archetype-card")).toContainText(/you're a/i);
  await expect(page.getByTestId("archetype-card")).toContainText("Meera");

  // ── Skip the selfie, land on the profile ───────────────────────
  await page.getByTestId("to-photo").click();
  await expect(page.getByTestId("photo-input")).toBeAttached();
  await page.getByRole("link", { name: "I'll do this later" }).click();

  await expect(page.getByTestId("profile-name")).toHaveText("Meera", { timeout: 20_000 });
  await expect(page.getByTestId("profile-archetype")).toBeVisible();
});

test("quiz is resumable after a refresh", async ({ page }) => {
  const phone = `91${String(Date.now()).slice(-8)}`;

  await page.goto("/login");
  await page.getByTestId("phone-input").fill(phone);
  await page.getByTestId("request-otp").click();
  await page.getByTestId("otp-input").fill("000000");
  await page.getByTestId("verify-otp").click();

  await expect(page.getByTestId("name-input")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("name-input").fill("Kabir");
  await page.getByTestId("start-quiz").click();

  // Answer the first two questions (both single-choice in seed order)
  await page.getByTestId("question-1").locator('[data-testid^="option-"]').first().click();
  await expect(page.getByTestId("quiz-progress")).toContainText("2 / 15");
  await page.getByTestId("question-2").locator('[data-testid^="option-"]').first().click();
  await expect(page.getByTestId("quiz-progress")).toContainText("3 / 15");

  // Refresh → localStorage restores position (fix(web): quiz resume state)
  await page.reload();
  await page.getByTestId("start-quiz").click();
  await expect(page.getByTestId("quiz-progress")).toContainText("3 / 15");
});
