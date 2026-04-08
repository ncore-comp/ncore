const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://ncore.web.app', { waitUntil: 'domcontentloaded' });
  await page.fill('#login-id', '0');
  await page.fill('#login-pw', '0');
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.click("button:has-text('로그인')")
  ]);
  const result = await page.evaluate(() => {
    const target = (appData.users || []).find((u) => String(u.name) === '김효창');
    if (!target) return { ok: false, message: 'TARGET_NOT_FOUND' };
    const dates = ['2026-03-20', '2026-04-01', '2026-07-01', '2026-10-01'];
    const byDate = dates.map((date) => ({
      date,
      quarterKey: app.getWorkShiftKeyByDate(date),
      shiftText: app.getWorkShiftForDate(target, date),
      range: app.getWorkShiftRangeForDate(target, date),
      endHour: app.getTimeoffEndHourForDate(target, date)
    }));
    const sampleUser = {
      workQ1: '09:00 ~ 18:00',
      workQ2: '08:00 ~ 17:00',
      workQ3: '07:00 ~ 16:00',
      workQ4: '09:00 ~ 18:00'
    };
    const synthetic = ['2026-03-31', '2026-04-01', '2026-09-30', '2026-10-01'].map((date) => ({
      date,
      quarterKey: app.getWorkShiftKeyByDate(date),
      shiftText: app.getWorkShiftForDate(sampleUser, date),
      endHour: app.getTimeoffEndHourForDate(sampleUser, date)
    }));
    return {
      ok: true,
      target: {
        id: String(target.id || ''),
        name: String(target.name || ''),
        workQ1: String(target.workQ1 || ''),
        workQ2: String(target.workQ2 || ''),
        workQ3: String(target.workQ3 || ''),
        workQ4: String(target.workQ4 || '')
      },
      byDate,
      synthetic,
      saveLogicUsesTargetUser: /getTimeoffEndHourForDate\(requestUser, sDate\)/.test(String(app.submitRequest)),
      proxyEditUsesTargetUser: /getRequestModalTargetUser\(\) \|\| app.currentUser/.test(String(app.syncRequestTypeDefaults))
    };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
