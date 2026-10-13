import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const constants = await readFile('js/constants.js', 'utf8');
const v2Constants = constants.replace('SYNC_V2_ENABLED: false', 'SYNC_V2_ENABLED: true');

const supabaseMock = `
window.__qaUser={id:'qa-v2-user-a',email:'a@example.test',user_metadata:{display_name:'QA A'}};
window.__qaRequests=[];
window.supabase={createClient(){let listener;const session=()=>({access_token:'qa-token',user:window.__qaUser});return {
 auth:{onAuthStateChange(cb){listener=cb;window.__qaAuthEvent=(event,user)=>{window.__qaUser=user;cb(event,user?{access_token:'qa-token',user}:null)};queueMicrotask(()=>cb('INITIAL_SESSION',session()));return {data:{subscription:{unsubscribe(){}}}}},getSession:async()=>({data:{session:session()}}),getUser:async()=>({data:{user:window.__qaUser}}),signOut:async()=>{listener?.('SIGNED_OUT',null)}},
 from(table){window.__qaRequests.push(table);return {select(){return {eq(){return {maybeSingle:async()=>({data:{display_name:'QA',avatar:'🥗'},error:null})}}}},upsert:async()=>({error:null,data:null})}}
}};`;

async function openV2(page) {
  await page.route('**/js/constants.js', route => route.fulfill({ contentType: 'text/javascript', body: v2Constants }));
  await page.route(/(supabase-js|tesseract\.js|html5-qrcode)/, route => route.fulfill({ contentType: 'text/javascript', body: route.request().url().includes('supabase-js') ? supabaseMock : '' }));
  await page.route('https://world.openfoodfacts.org/**', route => route.abort());
  await page.goto('/');
  await page.evaluate(async () => {
    window.__qaRequests = [];
    await enterApp({ id: 'qa-v2-user-a', name: 'QA A', emoji: '🥗', email: 'a@example.test' });
  });
  await expect(page.getByRole('heading', { name: 'Heute' })).toBeVisible();
}

test('V2 bootstraps IndexedDB before a missing LocalStorage mirror and survives reload', async ({ page }) => {
  await openV2(page);
  await page.evaluate(async () => {
    await SyncStore.commit('qa-v2-user-a', { ...EMPTY_DB(), foods: [{ id: 'v2-food', name: 'V2 Hafer', per100g: { kcal: 370, protein: 13, carbs: 60, fat: 7 } }] });
    localStorage.removeItem('mt-data-qa-v2-user-a');
  });
  await page.reload();
  await page.evaluate(() => enterApp({ id: 'qa-v2-user-a', name: 'QA A', emoji: '🥗', email: 'a@example.test' }));
  await page.getByRole('button', { name: 'Bibliothek' }).click();
  await expect(page.getByText('V2 Hafer')).toBeVisible();
});

test('a delayed save cannot update state or UI after session ownership changes', async ({ page }) => {
  await openV2(page);
  await page.evaluate(() => {
    window.__qaCallback = false;
    SyncWorker.commit = () => new Promise(resolve => { window.__qaRelease = () => resolve({ projection: { ...EMPTY_DB(), foods: [{ name: 'A only', per100g: { kcal: 1 } }] } }); });
    db.foods.push({ name: 'A only', per100g: { kcal: 1 } });
    window.__qaPending = save(() => { window.__qaCallback = true; });
  });
  await page.evaluate(() => { void enterApp({ id: 'qa-v2-user-b', name: 'QA B', emoji: '🥗', email: 'b@example.test' }); });
  await page.evaluate(() => window.__qaRelease());
  await page.evaluate(() => window.__qaPending);
  await expect.poll(() => page.evaluate(() => currentUser.id)).toBe('qa-v2-user-b');
  expect(await page.evaluate(() => window.__qaCallback)).toBe(false);
  expect(await page.evaluate(() => db.foods.some(food => food.name === 'A only'))).toBe(false);
});

test('V2 blocks legacy cloud operations without making external data requests', async ({ page }) => {
  await openV2(page);
  await page.evaluate(async () => { await cloudPush(); await cloudPull(); });
  expect(await page.evaluate(() => window.__qaRequests.filter(table => table === 'mt_cloud_data'))).toEqual([]);
  expect(await page.evaluate(() => syncV2Enabled())).toBe(true);
});
