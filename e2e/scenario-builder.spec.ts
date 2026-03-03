import { expect, test } from "@playwright/test";

async function unlockSite(page: import("@playwright/test").Page) {
  const sitePassword = process.env.SITE_ACCESS_PASSWORD || process.env.KNOWLEDGE_ADMIN_PASSCODE || "humeaine";

  await page.goto("/");
  if (page.url().includes("/login")) {
    await page.getByLabel("Password").fill(sitePassword);
    await page.getByRole("button", { name: "Unlock Site" }).click();
  }

  await expect(page.getByText("SIMTAC AI Scenario Builder")).toBeVisible();
}

test("landing allows choosing creation mode and editing worksheet", async ({ page }) => {
  await unlockSite(page);

  await page.getByRole("button", { name: "Fill Worksheet" }).click();
  await expect(page.getByText("1. Course & Trainee Information")).toBeVisible();
  await expect(page.getByRole("button", { name: "Hide Left Sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hide Right Sidebar" })).toBeVisible();

  await page.getByRole("button", { name: "Hide Left Sidebar" }).click();
  await expect(page.getByRole("button", { name: "Show Left Sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to mode selection" })).toHaveCount(0);

  await page.getByRole("button", { name: "Hide Right Sidebar" }).click();
  await expect(page.getByRole("button", { name: "Show Right Sidebar" })).toBeVisible();
  await expect(page.getByText("AI Controls")).toHaveCount(0);

  await page.getByRole("button", { name: "Show Left Sidebar" }).click();
  await expect(page.getByRole("button", { name: "Back to mode selection" })).toBeVisible();

  await page.getByRole("button", { name: "Show Right Sidebar" }).click();
  await expect(page.getByText("AI Controls")).toBeVisible();

  const scenarioTitleField = page.getByLabel("Scenario Title").first();
  await scenarioTitleField.fill("Acute Pulmonary Edema Simulation");
  await expect(scenarioTitleField).toHaveValue("Acute Pulmonary Edema Simulation");

  await page.getByRole("button", { name: "+ Add state" }).click();
  await expect(page.locator("p", { hasText: /^State 2$/ }).first()).toBeVisible();
});

test("scenario flow supports auto-expanding wrapped text and state lock", async ({ page }) => {
  await unlockSite(page);
  await page.getByRole("button", { name: "Fill Worksheet" }).click();

  await page
    .locator("aside")
    .first()
    .getByRole("button", { name: "9. Scenario Flow", exact: true })
    .click();
  const scenarioFlowSection = page.locator("section#scenarioFlow");
  await expect(scenarioFlowSection).toBeVisible();

  const stateOneCard = scenarioFlowSection.locator("div.rounded-xl").first();
  const displayedExamField = stateOneCard.getByLabel("Physical exam (Displayed on SimMan only)");
  await expect(displayedExamField).toBeVisible();

  const heightBefore = await displayedExamField.evaluate((el) => Number.parseFloat(getComputedStyle(el).height));
  const longText = Array.from({ length: 14 }, (_, index) => `Line ${index + 1}: detailed scenario progression cue.`).join(
    "\n",
  );
  await displayedExamField.fill(longText);
  const heightAfter = await displayedExamField.evaluate((el) => Number.parseFloat(getComputedStyle(el).height));
  expect(heightAfter).toBeGreaterThan(heightBefore + 40);

  await stateOneCard.getByRole("button", { name: "Lock state" }).click();
  await expect(displayedExamField).toBeDisabled();
  await expect(stateOneCard).toContainText("Unlock state");
  await stateOneCard.getByRole("button", { name: "Unlock state" }).click();
  await expect(displayedExamField).toBeEnabled();
});

test("equipment fields use wrapped multiline editors and preserve full text", async ({ page }) => {
  await unlockSite(page);
  await page.getByRole("button", { name: "Fill Worksheet" }).click();
  await page
    .locator("aside")
    .first()
    .getByRole("button", { name: "10. Equipment", exact: true })
    .click();

  const equipmentSection = page.locator("section#equipment");
  await expect(equipmentSection).toBeVisible();

  const firstRow = equipmentSection.locator("tbody tr").first();
  const itemField = firstRow.locator("td").nth(1).locator("textarea");
  const remarksField = firstRow.locator("td").nth(3).locator("textarea");
  await expect(itemField).toBeVisible();
  await expect(remarksField).toBeVisible();

  const longItemText = [
    "Difficult airway trolley with full adjunct set",
    "Video laryngoscope blades size 3 and 4",
    "Backup bougie and supraglottic airway set",
  ].join("\n");
  const longRemarksText = [
    "Prepare at bedside before scenario start.",
    "Check battery and screen readiness.",
    "Assign airway nurse as equipment lead.",
  ].join("\n");

  await itemField.fill(longItemText);
  await remarksField.fill(longRemarksText);

  await expect(itemField).toHaveValue(longItemText);
  await expect(remarksField).toHaveValue(longRemarksText);
});

test("field lock and update dialog workflow are available", async ({ page }) => {
  await unlockSite(page);
  await page.getByRole("button", { name: "Fill Worksheet" }).click();

  const scenarioTitleField = page.getByLabel("Scenario Title").first();
  await scenarioTitleField.fill("Septic shock escalation drill");
  await scenarioTitleField.click();

  await page
    .locator("aside")
    .nth(1)
    .getByRole("button", { name: /^Lock selected$/ })
    .click();
  await expect(scenarioTitleField).toBeDisabled();

  await page
    .locator("aside")
    .nth(1)
    .getByRole("button", { name: /^Unlock selected$/ })
    .click();
  await expect(scenarioTitleField).toBeEnabled();

  await page.getByRole("button", { name: "Update Unlocked with AI" }).click();
  await expect(page.getByRole("heading", { name: "Update Unlocked with AI" })).toBeVisible();
  const dialogField = page
    .locator("div.fixed.inset-0")
    .getByPlaceholder("Example: Strengthen hemodynamic progression, add clearer trigger points for state transitions, and include communication cues for nursing handover.");
  await dialogField.fill("Focus on airway-first progression and clearer transition criteria.");
  await expect(dialogField).toHaveValue("Focus on airway-first progression and clearer transition criteria.");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Update Unlocked with AI" })).toHaveCount(0);
});
