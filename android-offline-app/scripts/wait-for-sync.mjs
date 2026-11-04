// Sync status is intentionally visible only in Config.
export async function waitForSync(page) {
  const previous = page.url();
  const settings = new URL("/settings/", previous).href;
  if (previous !== settings) await page.goto(settings);
  await page.getByRole("status").filter({ hasText: "Synced to your account" }).waitFor();
  if (previous !== settings) await page.goto(previous);
}
