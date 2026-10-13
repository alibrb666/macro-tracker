import { expect, test } from '@playwright/test';

const supabaseMock = `window.supabase={createClient(){return {auth:{onAuthStateChange(cb){setTimeout(()=>cb('INITIAL_SESSION',null),0);return {data:{subscription:{unsubscribe(){}}}}},getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),signOut:async()=>{}},from(){return {select(){return {eq(){return {maybeSingle:async()=>({data:null,error:null})}}}},upsert:async()=>({error:null})}}}}};`;

async function isolateExternalServices(page) {
  await page.route(/(supabase-js|tesseract\.js|html5-qrcode)/, route => route.fulfill({ contentType: 'text/javascript', body: route.request().url().includes('supabase-js') ? supabaseMock : '' }));
  await page.route('https://world.openfoodfacts.org/**', route => route.abort());
}

test.beforeEach(async ({ page }) => { await isolateExternalServices(page); await page.goto('/'); });

test('starts offline and navigates between primary tabs', async ({ page }) => {
  await expect(page.getByText('Willkommen!')).toBeVisible();
  await page.getByRole('button', { name: 'Ohne Konto fortfahren' }).click();
  await expect(page.getByRole('heading', { name: 'Heute' })).toBeVisible();
  await page.getByRole('button', { name: 'Bibliothek' }).click();
  await expect(page.getByRole('heading', { name: 'Bibliothek' })).toBeVisible();
  await page.getByRole('button', { name: 'Tagesziele' }).click();
  await expect(page.getByRole('heading', { name: 'Tagesziele' })).toBeVisible();
});

test('creates, edits and deletes a food without external services', async ({ page }) => {
  await page.getByRole('button', { name: 'Ohne Konto fortfahren' }).click();
  await page.getByRole('button', { name: 'Bibliothek' }).click();
  await page.getByRole('button', { name: 'Lebensmittel anlegen' }).click();
  await page.locator('#food-name').fill('QA Hafer');
  await page.locator('#food-kcal').fill('370');
  await page.locator('#food-protein').fill('13');
  await page.locator('#food-carbs').fill('60');
  await page.locator('#food-fat').fill('7');
  await page.getByRole('dialog', { name: 'Lebensmittel hinzufügen' }).getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('QA Hafer')).toBeVisible();
  await page.getByLabel('QA Hafer bearbeiten').click();
  await page.locator('#food-name').fill('QA Haferflocken');
  await page.getByRole('dialog', { name: 'Lebensmittel hinzufügen' }).getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('QA Haferflocken')).toBeVisible();
  await page.getByRole('button', { name: 'Heute' }).click();
  await page.getByTitle('Mahlzeit loggen').click();
  await page.getByRole('button', { name: /QA Haferflocken/ }).click();
  await page.locator('#log-amount').fill('100');
  await page.getByRole('dialog', { name: 'Mahlzeit loggen' }).getByRole('button', { name: 'Hinzufügen' }).click();
  await expect(page.locator('.meal-total-kcal').filter({ hasText: '370 kcal' })).toBeVisible();
  await page.locator('.meal-log-info').filter({ hasText: 'QA Haferflocken' }).click();
  await page.getByRole('dialog', { name: 'Eintrag bearbeiten' }).getByRole('button', { name: 'Löschen' }).click();
  await expect(page.locator('.meal-log-info').filter({ hasText: 'QA Haferflocken' })).toHaveCount(0);
});

test('opens and closes settings dialog', async ({ page }) => {
  await page.getByRole('button', { name: 'Ohne Konto fortfahren' }).click();
  await page.getByRole('button', { name: 'Einstellungen' }).click();
  await expect(page.locator('#modal-settings')).toHaveClass(/open/);
  await page.locator('#modal-settings .modal-close').click();
  await expect(page.locator('#modal-settings')).not.toHaveClass(/open/);
});

test('is usable at mobile viewport', async ({ page }) => {
  await page.getByRole('button', { name: 'Ohne Konto fortfahren' }).click();
  await expect(page.locator('.nav')).toBeVisible();
  await expect(page.locator('.app-container')).toBeVisible();
});
