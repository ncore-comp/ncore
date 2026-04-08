const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://ncore.web.app', { waitUntil: 'domcontentloaded' });
  await page.fill('#login-id', '0');
  await page.fill('#login-pw', '0');
  await Promise.all([page.waitForLoadState('networkidle'), page.click("button:has-text('로그인')")]);
  await page.click("button:has-text('권한/설정')");
  await page.waitForTimeout(500);
  await page.click("button:has-text('운영실')");
  await page.waitForTimeout(800);
  const data = await page.evaluate(async () => {
    const targetUser = app.getAdminOpsTargetUsers().find((u) => String(u.name) === '김효창');
    app.adminOpsTargetUserId = String(targetUser.id);
    app.adminOpsSelectedDate = '2026-03-26';
    app.adminOpsViewYear = 2026;
    app.adminOpsViewMonth = 2;
    await app.loadAdminOpsPanelData({ force: true });
    app.renderMasterPermissionPage();
    app.openAdminProxyRequestModal('2026-03-26');
    document.getElementById('req-type').value = '시간차(퇴근)';
    toggleInputs();
    app.syncRequestTypeDefaults();
    document.getElementById('req-duration-timeoff').value = '2';
    document.getElementById('req-reason').value = 'Refresh';
    const requestUser = app.getRequestModalTargetUser();
    const selection = app.getCurrentRequestSelection();
    const type = selection.baseType;
    const sDate = security.normalizeDate(document.getElementById('req-start-date').value);
    const e = app.getTimeoffEndHourForDate(requestUser, sDate);
    const newReq = security.sanitizeRequest({
      id: Date.now(), userId: requestUser.id, userName: requestUser.name,
      dept: requestUser.dept, role: requestUser.role, type, startDate: sDate, endDate: sDate,
      hours: 2, timeRange: `${timeLogic.calcStart(2,e)}:00~${e}:00`, reason: 'Refresh', status: app.isAdminProxyRequestMode() ? 'approved' : 'pending',
      timestamp: new Date().toISOString(), specialLeaveTypeKey: selection.specialLeaveTypeKey, specialLeaveTypeLabel: selection.specialLeaveTypeLabel
    });
    return {
      adminRequestMode: app.adminRequestMode,
      adminRequestEditMode: app.adminRequestEditMode,
      isAdminProxyRequestMode: app.isAdminProxyRequestMode(),
      reqType: document.getElementById('req-type').value,
      reqStatusPrepared: newReq.status,
      reqTargetUser: requestUser ? { id: requestUser.id, name: requestUser.name, role: requestUser.role, dept: requestUser.dept } : null,
      endHour: e,
      timeRange: newReq.timeRange
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e)=>{ console.error(e.stack || String(e)); process.exit(1); });
