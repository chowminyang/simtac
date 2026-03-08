import { expect, test } from "@playwright/test";

const ONE_PIXEL_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+XlQAAAAASUVORK5CYII=";

function createSavedImageStoragePayload(dataUrl: string) {
  const scenario = {
    courseInfo: {
      courseTitle: "",
      department: "",
      scenarioTitle: "",
      targetLearnerGroup: "",
      numberOfTrainees: "",
      numberOfInstructors: "",
      levelOfExperience: "",
      prerequisiteKnowledge: "",
    },
    objectives: ["", "", "", ""],
    clinicalSetting: { settingRequired: "", remarks: "" },
    instructors: [""],
    confederates: [""],
    traineeRoles: [""],
    patientInfo: {
      name: "",
      showOnMonitorBeforeStart: false,
      makeAvailableDuringSimulation: false,
      identificationNo: "",
      race: "",
      age: "",
      gender: "",
      weight: "",
      height: "",
      pastMedicalAndSocialHistory: "",
      currentMedications: "",
      foodDrugAllergies: "",
      primaryCareProvider: "",
      presentingComplaintHistory: "",
    },
    scenarioInfo: {
      timeAllocatedForScenario: "",
      timeAllocatedForDebrief: "",
      scenarioSummary: "",
      scenarioInformationToTrainees: "",
      transitionMode: "next",
    },
    scenarioFlow: [
      {
        stateName: "",
        vitalSigns: { bp: "", pr: "", rr: "", spo2: "", rhythm: "" },
        physicalExamDisplayedOnSimMan: [""],
        physicalExamVolunteeredByInstructor: [""],
        investigations: [""],
        expectedActions: [""],
        remarks: [""],
        instructorControl: [""],
        transitionRule: "next",
      },
    ],
    equipment: [{ category: "Airway and breathing", item: "", quantity: "", remarks: "" }],
    debriefInfo: { numberOfDebriefers: "", debriefRoomSetup: "", debriefDescription: "", logisticsRequired: "" },
    simulatorPrep: [""],
    monitorSetup: {
      layout: ["5 waveform"],
      parameters: [
        "Primary Electrocardiogram",
        "SPO2 (Plethysmogram)",
        "NBP- Non-invasive Blood Pressure",
        "HR- Heart Rate",
        "Pulse",
      ],
    },
    appendixImages: [
      {
        id: "saved_preview_seed_1",
        prompt: "Singapore ward simulation bedside scene",
        revisedPrompt: "Singapore ward simulation bedside scene",
        caption: "Saved preview image",
        dataUrl,
        mimeType: "image/png",
        model: "gpt-image-1.5",
        size: "1024x1024",
        createdAt: "2026-03-03T00:00:00.000Z",
      },
    ],
    documentInfo: {
      author: "",
      designation: "",
      department: "",
      dateScenarioDeveloped: "",
      dateScenarioUpdated: "",
    },
  };

  return {
    mode: "worksheet_assist",
    scenario,
    thinkingDepth: 1,
    showLeftSidebar: true,
    showRightSidebar: true,
  };
}

async function unlockSite(page: import("@playwright/test").Page) {
  const sitePassword = process.env.SITE_ACCESS_PASSWORD || process.env.KNOWLEDGE_ADMIN_PASSCODE || "humeaine";

  await page.goto("/");
  if (page.url().includes("/login")) {
    await page.getByLabel("Password").fill(sitePassword);
    await page.getByRole("button", { name: "Unlock Site" }).click();
  }

  await expect(page.getByText("SIMTAC AI Scenario Builder")).toBeVisible();
}

async function seedSavedImageDraft(page: import("@playwright/test").Page) {
  await page.addInitScript((payload) => {
    window.localStorage.setItem(
      "simtac_scenario_builder_v1",
      JSON.stringify(payload),
    );
  }, createSavedImageStoragePayload(ONE_PIXEL_PNG_DATA_URL));
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

test("saved image click opens full preview popup", async ({ page }) => {
  await seedSavedImageDraft(page);
  await unlockSite(page);

  const fillWorksheetButton = page.getByRole("button", { name: "Fill Worksheet" });
  if (await fillWorksheetButton.count()) {
    await fillWorksheetButton.first().click();
  }

  await page
    .locator("aside")
    .first()
    .getByRole("button", { name: "15. Simulation Images", exact: true })
    .click();

  const openPreviewButton = page.getByRole("button", { name: "Open saved image 1 preview" }).first();
  if ((await openPreviewButton.count()) === 0) {
    await page.evaluate((payload) => {
      window.localStorage.setItem("simtac_scenario_builder_v1", JSON.stringify(payload));
    }, createSavedImageStoragePayload(ONE_PIXEL_PNG_DATA_URL));
    await page.reload();

    const fillButtonAfterReload = page.getByRole("button", { name: "Fill Worksheet" });
    if (await fillButtonAfterReload.count()) {
      await fillButtonAfterReload.first().click();
    }
    await page
      .locator("aside")
      .first()
      .getByRole("button", { name: "15. Simulation Images", exact: true })
      .click();
  }
  await expect(openPreviewButton).toBeVisible();
  await openPreviewButton.click();

  const previewDialog = page.getByRole("dialog", { name: "Saved Image Preview" });
  await expect(previewDialog).toBeVisible();
  await expect(previewDialog.getByRole("heading", { name: "Saved Image Preview" })).toBeVisible();
  await expect(previewDialog.locator("p").first()).toContainText("Saved preview image");

  await previewDialog.getByRole("button", { name: "Close" }).click();
  await expect(previewDialog).toHaveCount(0);
});
