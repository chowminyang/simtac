import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_SCENARIO } from "../src/lib/scenario-defaults";

const image = { id:"preview", prompt:"Synthetic simulation room", revisedPrompt:"", caption:"Synthetic room", dataUrl:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+XlQAAAAASUVORK5CYII=", mimeType:"image/png", model:"test", size:"1024x1024", createdAt:"" };
async function unlock(page: Page) {
  await page.goto("/");
  if (page.url().includes("/login")) {
    await page.getByLabel("Password").fill(process.env.SITE_ACCESS_PASSWORD || "humeaine");
    await page.getByRole("button",{name:"Unlock Site"}).click();
  }
  await expect(page.getByRole("link",{name:"SIMTAC AI Scenario Builder",exact:true})).toBeVisible();
}
async function start(page: Page) { await unlock(page); await page.getByRole("button",{name:"Fill Worksheet",exact:true}).click(); }

test("focused navigation and creation mode changes preserve the draft across reload", async ({page}) => {
  await start(page);
  await page.getByLabel("Course Title",{exact:true}).fill("Synthetic teamwork course");
  await page.getByRole("button",{name:"Next section",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Learning Objectives",exact:true})).toBeVisible();
  await expect(page.getByLabel("Course Title",{exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Change creation mode",exact:true}).click();
  await page.getByRole("button",{name:"Create with AI",exact:true}).click();
  await page.getByRole("button",{name:"Previous section",exact:true}).click();
  await expect(page.getByLabel("Course Title",{exact:true})).toHaveValue("Synthetic teamwork course");
  await expect(page.getByText("Saved on this device",{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Course Title",{exact:true})).toHaveValue("Synthetic teamwork course");
});

test("state protection survives reload and long text expands", async ({page}) => {
  await start(page);
  await page.getByRole("button",{name:"09 Scenario Flow",exact:true}).click();
  const card=page.locator("#scenarioFlow div.rounded-xl").first();
  const field=card.getByLabel("Physical exam (Displayed on SimMan only)");
  const before=await field.evaluate(el=>el.getBoundingClientRect().height);
  await field.fill(Array.from({length:14},(_,i)=>`Synthetic state cue ${i+1}`).join("\n"));
  expect(await field.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(before+40);
  await card.getByRole("button",{name:"Lock state",exact:true}).click();
  await expect(field).toBeDisabled();
  await expect(page.getByText("Saved on this device",{exact:true})).toBeVisible();
  await page.reload();
  await expect(field).toBeDisabled();
  await card.getByRole("button",{name:"Unlock state",exact:true}).click();
  await expect(field).toBeEnabled();
});

test("section protection and update modal support keyboard dismissal", async ({page}) => {
  await start(page);
  await page.locator("summary").filter({hasText:"Section protection"}).click();
  await page.getByRole("button",{name:"[Open] 1. Course & Trainee",exact:true}).click();
  await expect(page.getByLabel("Course Title",{exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"[Locked] 1. Course & Trainee",exact:true}).click();
  await expect(page.getByLabel("Course Title",{exact:true})).toBeEnabled();
  await page.getByRole("button",{name:"Update unlocked with AI",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Update Unlocked with AI"})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("backup import keeps images and exports DOCX", async ({page}) => {
  await start(page);
  await page.getByRole("button",{name:"Import backup",exact:true}).click();
  page.once("dialog",dialog=>dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({name:"backup.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({scenario:{...DEFAULT_SCENARIO,appendixImages:[image]},mode:"worksheet_assist"}))});
  await expect(page.getByText("Backup imported.",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"15 Simulation Images",exact:true}).click();
  await page.getByRole("button",{name:"Open saved image 1 preview"}).click();
  await expect(page.getByRole("dialog",{name:"Saved Image Preview"})).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button",{name:"Export DOCX",exact:true}).click();
  const download=page.waitForEvent("download");
  await page.getByRole("dialog",{name:"Export DOCX"}).getByRole("button",{name:"Export DOCX",exact:true}).click();
  expect((await download).suggestedFilename()).toMatch(/\.docx$/);
});

test("invalid backup does not replace authored content", async ({page}) => {
  await start(page);
  await page.getByLabel("Course Title",{exact:true}).fill("Keep my course");
  await page.locator('input[type="file"]').setInputFiles({name:"invalid.json",mimeType:"application/json",buffer:Buffer.from('{"unrelated":true}')});
  await expect(page.getByRole("alert")).toContainText("SIMTAC draft backup");
  await expect(page.getByLabel("Course Title",{exact:true})).toHaveValue("Keep my course");
});

test("phone section menu and controls fit the viewport", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await start(page);
  await page.getByLabel("Worksheet section",{exact:true}).selectOption("equipment");
  await expect(page.getByRole("heading",{name:"Equipment",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole("button",{name:"Change mode",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Build your next simulation."})).toBeVisible();
});
