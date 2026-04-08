const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('dialog', async (dialog) => { await dialog.accept(); });
  const BASE_URL = 'https://ncore.web.app';
  const LOGIN_ID = '0';
  const LOGIN_PW = '0';
  const TARGET_USER = '김효창';
  const TARGET_DATE = '2026-04-02';
  let createdId = '';
  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.fill('#login-id', LOGIN_ID);
    await page.fill('#login-pw', LOGIN_PW);
    await Promise.all([page.waitForLoadState('networkidle'), page.click("button:has-text('로그인')")]);
    await page.click("button:has-text('권한/설정')");
    await page.waitForTimeout(500);
    await page.click("button:has-text('운영실')");
    await page.waitForTimeout(800);
    const creation = await page.evaluate(async ({ targetName, targetDate }) => {
      const targetUser = app.getAdminOpsTargetUsers().find((u) => String(u.name) === String(targetName));
      if (!targetUser) throw new Error('TARGET_USER_NOT_FOUND');
      app.adminOpsTargetUserId = String(targetUser.id);
      app.adminOpsSelectedDate = targetDate;
      app.adminOpsViewYear = moment(targetDate).year();
      app.adminOpsViewMonth = moment(targetDate).month();
      await app.loadAdminOpsPanelData({ force: true });
      await db.load();
      const existing = (appData.requests || []).filter((item) => String(item.userId) === String(targetUser.id) && String(item.startDate) === String(targetDate));
      if (existing.length) throw new Error(`DATE_ALREADY_USED:${existing.map((x)=>x.id).join(',')}`);
      app.renderMasterPermissionPage();
      app.openAdminProxyRequestModal(targetDate);
      document.getElementById('req-type').value = '시간차(퇴근)';
      toggleInputs();
      app.syncRequestTypeDefaults();
      document.getElementById('req-duration-timeoff').value = '2';
      document.getElementById('req-reason').value = 'Refresh';
      await app.submitRequest();
      await db.load();
      await db.loadAdminOpsData();
      const req = [...(appData.requests || [])]
        .filter((item) => String(item.userId) === String(targetUser.id) && String(item.startDate) === String(targetDate) && String(item.reason) === 'Refresh')
        .sort((a,b) => Number(b.id) - Number(a.id))[0];
      if (!req) throw new Error('REQUEST_NOT_FOUND_AFTER_ADMIN_CREATE');
      const log = (appData.accessLogs || []).find((item) => String(item.type || '') === 'AdminRequestCreate' && String(item.detail || '').includes(String(req.id)));
      return { id: String(req.id), status: String(req.status || ''), hasAdminCreateLog: !!log, timeRange: String(req.timeRange || '') };
    }, { targetName: TARGET_USER, targetDate: TARGET_DATE });
    createdId = creation.id;
    if (creation.status !== 'approved') throw new Error(`STATUS_NOT_APPROVED:${creation.status}`);
    if (!creation.hasAdminCreateLog) throw new Error('ADMIN_CREATE_LOG_NOT_FOUND');
    await page.evaluate(async (requestId) => { await db.deleteReq(requestId); await db.load(); }, createdId);
    createdId = '';
    console.log(JSON.stringify({ ok: true, creation }, null, 2));
  } finally {
    if (createdId) { try { await page.evaluate(async (requestId) => { await db.deleteReq(requestId); }, createdId); } catch (e) {} }
    await browser.close();
  }
})().catch((e)=>{ console.error(e.stack || String(e)); process.exit(1); });
