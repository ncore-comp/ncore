    Object.assign(app, {
        currentUser: null,
        editingId: null,
        viewYear: new Date().getFullYear(),
        viewMonth: new Date().getMonth(),
        showPastShading: true, 
        showUsage: false,
        currentPage: 1,
        requestItemsPerPage: 5,
        currentView: 'dashboard',
        calendarMode: 'self',
        calendarDisplayMode: 'month',
        selectedMemberId: null,
        boardCategoryFilter: 'all',
        boardSearchText: '',
        boardEditingId: null,
        selectedBoardId: null,
        inactivityLimitMs: 10 * 60 * 1000,
        lastActivityAt: Date.now(),
        idleTimer: null,
        idleEventsBound: false,
        unloadLogged: false,
        permissionColumnOpen: 'calendar',
        permissionDeptFilter: 'all',
        masterPermissionTab: 'permissions',
        adminOpsLoaded: false,
        adminOpsAccessLogsLoaded: false,
        adminOpsSecurityLogsLoaded: false,
        adminOpsSelectedDate: '',
        adminOpsViewYear: new Date().getFullYear(),
        adminOpsViewMonth: new Date().getMonth(),
        adminOpsTargetUserId: '',
        adminOpsHolidayEditingId: '',
        adminOpsHolidaySyncStartYear: new Date().getFullYear(),
        adminOpsHolidaySyncEndYear: new Date().getFullYear() + 1,
        adminRequestMode: false,
        adminRequestEditMode: false,
        sessionStorageKey: 'ncore_active_session_v27',
        activityInputThrottleMs: 1000,
        sessionPersistThrottleMs: 5000,
        lastSessionPersistAt: 0,
        calendarRenderCache: null,
        selectedCalendarDate: '',
        mobileNavMenuOpen: false,
        adminNavMenuOpen: false,
        mobileCalendarOpen: false,
        mobileCalendarDetailDate: '',
        mobileRecentRequestsOpen: false,
        situationBoardSelectedDate: '',
        situationBoardScale: 'large',
        situationBoardDeptFilter: 'all',
        situationBoardSeatMapDate: '',
        reportBoardCategory: '',
        reportBoardMode: 'apply',
        reportBoardYear: new Date().getFullYear(),
        reportBoardMonth: new Date().getMonth(),
        reportDetailRequestId: '',
        reportDetailUserId: '',
        workReportEditingId: '',
        specialLeaveSettingsOpen: false,
        mobileMemberStatusOpen: {},
        rejectReasonResolve: null,
        rejectReasonTargetId: '',
        reasonModalConfig: null,

        init: async () => { 
            try {
                app.bindIdleEvents();
                app.renderLogin();
                await app.restoreSession();
                const loadingEl = document.getElementById('loading-overlay');
                if (loadingEl) loadingEl.style.display = 'none';
            } catch(e) { alert("초기화 오류: " + e.message); }
        },
        editAdminManualHoliday: (id) => {
            app.adminOpsHolidayEditingId = security.cleanInlineValue(id);
            app.renderMasterPermissionPage();
        },
        clearAdminHolidayEditor: () => {
            app.adminOpsHolidayEditingId = '';
            app.renderMasterPermissionPage();
        },
        saveAdminManualHoliday: async () => {
            try {
                const date = security.normalizeDate(document.getElementById('admin-holiday-date')?.value, '');
                const name = security.cleanText(document.getElementById('admin-holiday-name')?.value || '');
                if (!date) return alert('휴일 날짜를 선택해주세요.');
                if (!name) return alert('휴일명을 입력해주세요.');
                const editingId = security.cleanInlineValue(app.adminOpsHolidayEditingId || '');
                const editingHoliday = (appData.manualHolidays || []).find((item) => String(item.id) === String(editingId)) || null;
                const isIntegratedCompanyHoliday = !!(editingHoliday && (
                    String(editingHoliday.id || '').startsWith('company-fixed-') ||
                    String(editingHoliday.provider || '').toLowerCase() === 'ncore-fixed' ||
                    String(editingHoliday.category || '').toLowerCase() === 'company_fixed' ||
                    String(editingHoliday.source || '').toLowerCase() === 'company_fixed'
                ));
                const nextId = security.cleanInlineValue(isIntegratedCompanyHoliday ? `company-fixed-${date}` : date);
                if (editingHoliday && editingHoliday.id && editingHoliday.id !== nextId) {
                    await db.upsertManualHoliday({ id: nextId, date, name, enabled: true }, { keepOverlayOnSuccess: true });
                    await db.deleteManualHoliday(editingHoliday.id);
                } else {
                    await db.upsertManualHoliday({ id: editingId || nextId, date, name, enabled: true }, { keepOverlayOnSuccess: true });
                }
                await db.loadBoot();
                app.adminOpsHolidayEditingId = '';
                app.adminOpsLoaded = false;
                await app.loadAdminOpsPanelData({ force: true });
                await app.logUserAction('AdminManualHolidaySave', `${date}:${name}`);
                alert('수동 휴일 저장 완료');
            } catch (e) {
                console.error(e);
                alert('수동 휴일 저장 오류: ' + e.message);
            } finally {
                const loadingEl = document.getElementById('loading-overlay');
                if (loadingEl) loadingEl.style.display = 'none';
                app.renderMasterPermissionPage();
            }
        },
        deleteAdminManualHoliday: async (id) => {
            const safeId = security.cleanInlineValue(id);
            const holiday = (appData.manualHolidays || []).find((item) => String(item.id) === String(safeId));
            if (!holiday) return alert('수동 휴일 정보를 찾을 수 없습니다.');
            if (!confirm(`"${holiday.date} ${holiday.name}" 휴일을 삭제하시겠습니까?`)) return;
            try {
                await db.deleteManualHoliday(safeId);
                await db.loadBoot();
                app.adminOpsHolidayEditingId = '';
                app.adminOpsLoaded = false;
                await app.loadAdminOpsPanelData({ force: true });
                await app.logUserAction('AdminManualHolidayDelete', `${holiday.date}:${holiday.name}`);
                alert('수동 휴일 삭제 완료');
            } catch (e) {
                console.error(e);
                alert('수동 휴일 삭제 오류: ' + e.message);
            } finally {
                const loadingEl = document.getElementById('loading-overlay');
                if (loadingEl) loadingEl.style.display = 'none';
                app.renderMasterPermissionPage();
            }
        },
        syncAdminPublicHolidays: async () => {
            const startInput = document.getElementById('admin-holiday-sync-start-year');
            const endInput = document.getElementById('admin-holiday-sync-end-year');
            const startYear = Number((startInput && startInput.value) || app.adminOpsHolidaySyncStartYear || new Date().getFullYear());
            const endYear = Number((endInput && endInput.value) || app.adminOpsHolidaySyncEndYear || (new Date().getFullYear() + 1));
            if (!Number.isInteger(startYear) || !Number.isInteger(endYear)) return alert('동기화 연도는 숫자로 입력해 주세요.');
            if (startYear > endYear) return alert('시작연도는 종료연도보다 클 수 없습니다.');
            if ((endYear - startYear) >= 3) {
                if (!confirm(`선택한 범위(${startYear}~${endYear})의 자동 공휴일을 다시 동기화하시겠습니까?\n수동 휴일은 유지되고 선택 범위의 자동 공휴일만 갱신됩니다.`)) return;
            } else {
                if (!confirm(`${startYear}년부터 ${endYear}년까지 대한민국 공휴일을 다시 동기화하시겠습니까?\n수동 휴일은 유지되고 선택 범위의 자동 공휴일만 갱신됩니다.`)) return;
            }
            try {
                app.adminOpsHolidaySyncStartYear = startYear;
                app.adminOpsHolidaySyncEndYear = endYear;
                const result = await db.syncPublicHolidays({ startYear, endYear });
                await db.loadBoot();
                app.adminOpsLoaded = false;
                await app.loadAdminOpsPanelData({ force: true });
                const integratedCount = Number(result.manualIntegratedCount ?? result.companyFixedCount ?? 0);
                await app.logUserAction('AdminPublicHolidaySync', `${result.startYear}-${result.endYear}|auto:${result.autoCount}|manualIntegrated:${integratedCount}`);
                alert(`공휴일 동기화 완료\n- 범위: ${result.startYear}~${result.endYear}\n- 자동 공휴일: ${result.autoCount}건\n- 회사 고정휴일(수동 통합): ${integratedCount}건`);
            } catch (e) {
                console.error(e);
                alert('공휴일 동기화 오류: ' + e.message);
            } finally {
                app.renderMasterPermissionPage();
            }
        },
        renderAdminOpsHolidayPanel: () => {
            const editingHoliday = (appData.manualHolidays || []).find((item) => String(item.id) === String(app.adminOpsHolidayEditingId)) || null;
            const manualHolidays = Array.isArray(appData.manualHolidays) ? appData.manualHolidays : [];
            const summary = appData.holidaySummary || { auto: 0, companyFixed: 0, manual: 0 };
            return `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <p class="text-sm font-bold text-gray-800">회사 휴일 설정</p>
                        <p class="text-xs text-gray-500">자동 공휴일을 제외한 회사 휴일을 관리합니다. 노동절과 창립기념일도 이 목록에 함께 표시됩니다.</p>
                    </div>
                    <div class="flex flex-wrap justify-end items-center gap-2">
                        <div class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2">
                            <input id="admin-holiday-sync-start-year" type="number" min="2020" max="2100" value="${Number(app.adminOpsHolidaySyncStartYear || new Date().getFullYear())}" class="w-20 rounded border border-emerald-200 bg-white px-2 py-1 text-xs text-gray-700">
                            <span class="text-xs font-bold text-emerald-700">~</span>
                            <input id="admin-holiday-sync-end-year" type="number" min="2020" max="2100" value="${Number(app.adminOpsHolidaySyncEndYear || (new Date().getFullYear() + 1))}" class="w-20 rounded border border-emerald-200 bg-white px-2 py-1 text-xs text-gray-700">
                            <button onclick="app.syncAdminPublicHolidays()" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">공휴일 동기화</button>
                        </div>
                        <div class="flex flex-wrap justify-end gap-1.5 text-[11px]">
                        <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">자동 ${summary.auto || 0}</span>
                        <span class="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-bold">회사휴일 ${summary.manual || 0}</span>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)_auto] gap-2 mb-4">
                    <input id="admin-holiday-date" type="date" value="${editingHoliday ? editingHoliday.date : ''}" class="border bg-gray-50 p-2.5 rounded-lg">
                    <input id="admin-holiday-name" type="text" value="${editingHoliday ? editingHoliday.name : ''}" placeholder="예: 여름휴가, 전사 워크숍" class="border bg-gray-50 p-2.5 rounded-lg">
                    <div class="flex gap-2">
                        <button onclick="app.saveAdminManualHoliday()" class="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">${editingHoliday ? '수정 완료' : '휴일 저장'}</button>
                        <button onclick="app.clearAdminHolidayEditor()" class="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200">초기화</button>
                    </div>
                </div>
                <div class="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                    ${manualHolidays.length ? manualHolidays.map((holiday) => `
                        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <div class="text-sm font-bold text-gray-800">${holiday.name}</div>
                                <div class="text-xs text-gray-500">${holiday.date}</div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <button onclick="app.editAdminManualHoliday('${security.cleanInlineValue(holiday.id)}')" class="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 text-xs font-bold hover:bg-indigo-50">수정</button>
                                <button onclick="app.deleteAdminManualHoliday('${security.cleanInlineValue(holiday.id)}')" class="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50">삭제</button>
                            </div>
                        </div>`).join('') : `
                        <div class="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-400 text-center">
                            등록된 수동 휴일이 없습니다.
                        </div>`}
                </div>
            </div>`;
        },
        deleteAdminManagedRequest: async (id) => {
            const safeId = security.cleanInlineValue(id);
            const req = (appData.requests || []).find((item) => String(item.id) === String(safeId));
            if (!req) return alert('삭제할 연차 내역을 찾을 수 없습니다.');
            const targetUser = app.ensureAdminOpsTargetUser();
            const displayType = app.getRequestDisplayType(req);
            const periodText = app.formatRequestPeriodText(req);
            if (!confirm(`"${req.userName}"의 ${displayType} (${periodText}) 내역을 삭제하시겠습니까?`)) return;
            try {
                await db.deleteReq(safeId);
                await app.logUserAction('AdminRequestDelete', `${safeId}:${req.userId}:${req.startDate}`);
                alert('연차 내역 삭제 완료');
            } catch (e) {
                console.error(e);
                alert('연차 내역 삭제 오류: ' + e.message);
            } finally {
                if (targetUser && String(app.adminOpsTargetUserId) !== String(targetUser.id)) {
                    app.adminOpsTargetUserId = security.cleanInlineValue(targetUser.id);
                }
                app.renderMasterPermissionPage();
            }
        },
        getAdminOpsTargetUsers: () => {
            if (!app.currentUser || !app.hasAdminOpsAccess()) return [];
            return appData.users.filter((u) => u && u.role !== 'master');
        },
        ensureAdminOpsTargetUser: () => {
            const candidates = app.getAdminOpsTargetUsers();
            if (!candidates.length) {
                app.adminOpsTargetUserId = '';
                return null;
            }
            const exists = candidates.find((u) => String(u.id) === String(app.adminOpsTargetUserId));
            if (!exists) app.adminOpsTargetUserId = String(candidates[0].id);
            return candidates.find((u) => String(u.id) === String(app.adminOpsTargetUserId)) || candidates[0];
        },
        setAdminOpsTargetUser: (userId) => {
            app.adminOpsTargetUserId = security.cleanInlineValue(userId);
            app.adminOpsSelectedDate = '';
            app.renderMasterPermissionPage();
        },
        changeAdminOpsMonth: (delta) => {
            const next = moment({ year: app.adminOpsViewYear, month: app.adminOpsViewMonth, day: 1 }).add(Number(delta || 0), 'month');
            app.adminOpsViewYear = next.year();
            app.adminOpsViewMonth = next.month();
            app.renderMasterPermissionPage();
        },
        setAdminOpsSelectedDate: (dateStr) => {
            app.adminOpsSelectedDate = security.normalizeDate(dateStr, '');
            app.renderMasterPermissionPage();
        },
        isAdminProxyRequestMode: () => !!app.adminRequestMode,
        getRequestModalTargetUser: () => {
            if (!app.isAdminProxyRequestMode()) return app.currentUser;
            const selectEl = document.getElementById('req-target-user');
            const safeId = security.cleanInlineValue((selectEl && selectEl.value) || app.adminOpsTargetUserId || '');
            return app.getAdminOpsTargetUsers().find((u) => String(u.id) === String(safeId)) || null;
        },
        syncRequestTargetField: () => {
            const wrap = document.getElementById('div-proxy-user');
            const selectEl = document.getElementById('req-target-user');
            if (!wrap || !selectEl) return;
            if (!app.isAdminProxyRequestMode()) {
                wrap.classList.add('hidden');
                return;
            }
            const users = app.getAdminOpsTargetUsers();
            wrap.classList.remove('hidden');
            if (!users.length) {
                selectEl.innerHTML = '<option value="">관리 가능한 직원 없음</option>';
                return;
            }
            app.ensureAdminOpsTargetUser();
            selectEl.innerHTML = users.map((user) => `<option value="${security.cleanInlineValue(user.id)}">${user.name} (${user.dept})</option>`).join('');
            selectEl.value = app.adminOpsTargetUserId;
        },
        handleRequestTargetUserChange: (value) => {
            app.adminOpsTargetUserId = security.cleanInlineValue(value);
            const currentType = document.getElementById('req-type')?.value || '연차';
            const nextType = String(currentType || '').startsWith('special:') ? '연차' : currentType;
            app.refreshRequestTypeOptions(nextType);
            app.syncRequestTypeDefaults();
        },
        editAdminManagedRequest: (id) => {
            const safeId = security.cleanInlineValue(id);
            const req = (appData.requests || []).find((item) => String(item.id) === String(safeId));
            if (!req) return alert('수정할 연차 내역을 찾을 수 없습니다.');
            const targetUser = app.getAdminOpsTargetUsers().find((user) => String(user.id) === String(req.userId));
            if (!targetUser) return alert('관리 가능한 대상 직원이 아닙니다.');
            app.adminOpsTargetUserId = security.cleanInlineValue(targetUser.id);
            app.openRequestModal(req.startDate, { adminMode: true, targetUserId: targetUser.id, editId: safeId, editMode: true });
            const normalizedType = security.normalizeType(req.type);
            const selectedTypeValue = app.getRequestEditSelectionValue(req);
            app.refreshRequestTypeOptions(selectedTypeValue);
            document.getElementById('req-type').value = selectedTypeValue;
            const specialMode = document.getElementById('req-special-mode');
            if (specialMode) {
                specialMode.innerHTML = app.getSpecialModeOptionsHtml(normalizedType);
                specialMode.value = normalizedType;
            }
            const sEl = document.getElementById('req-start-date');
            const eEl = document.getElementById('req-end-date');
            if (sEl) sEl.value = moment(req.startDate).format('YYYY-MM-DD');
            if (eEl) eEl.value = moment(req.endDate).format('YYYY-MM-DD');
            const allowPast = document.getElementById('allow-past');
            if (allowPast) {
                allowPast.checked = true;
                app.togglePastDates();
            }
            document.getElementById('req-reason').value = req.reason;
            document.getElementById('is-multi-day').checked = req.startDate !== req.endDate;
            toggleInputs();
            if (normalizedType === '시간차(퇴근)') {
                const dEl = document.getElementById('req-duration-timeoff');
                if (dEl && Number(req.hours) >= 1 && Number(req.hours) <= 7) dEl.value = String(Number(req.hours));
                app.syncRequestTypeDefaults();
            } else if (req.timeRange && req.timeRange.includes('~')) {
                const [rawStart, rawEnd] = String(req.timeRange).split('~');
                const startHour = parseInt(rawStart, 10);
                const endHour = parseInt(rawEnd, 10);
                if (Number.isFinite(startHour) && Number.isFinite(endHour) && endHour > startHour) {
                    const duration = timeLogic.getEff(startHour, endHour);
                    if (normalizedType === '시간차(외출)') {
                        const dEl = document.getElementById('req-duration-out');
                        const tEl = document.getElementById('req-start-time-out');
                        if (dEl && duration >= 1 && duration <= 10) dEl.value = String(duration);
                        if (tEl) tEl.value = String(startHour);
                        updateOutPreview();
                    }
                }
            }
            document.getElementById('req-modal-title').innerText = '관리자 대리 수정';
            document.getElementById('req-modal-btn').innerText = '수정 완료';
            document.getElementById('req-modal').classList.remove('hidden');
        },
        loadAdminOpsPanelData: async (options = {}) => {
            const force = !!options.force;
            const includeAccessLogs = !!options.includeAccessLogs;
            const includeSecurityLogs = !!options.includeSecurityLogs;
            const resetLogPanels = !!options.resetLogPanels;
            if (resetLogPanels) {
                appData.accessLogs = [];
                appData.securityLogs = [];
                app.adminOpsAccessLogsLoaded = false;
                app.adminOpsSecurityLogsLoaded = false;
            }
            if (app.adminOpsLoaded && !force && !includeAccessLogs && !includeSecurityLogs) return true;
            try {
                const result = await db.loadAdminOpsData({ includeAccessLogs, includeSecurityLogs });
                app.adminOpsLoaded = true;
                if (includeAccessLogs) app.adminOpsAccessLogsLoaded = !!result.accessLogsLoaded;
                if (includeSecurityLogs) app.adminOpsSecurityLogsLoaded = !!result.securityLogsLoaded;
                return true;
            } catch (e) {
                if (!options.silent) alert('운영실 데이터 로드 실패: ' + e.message);
                return false;
            }
        },
        loadAdminOpsAccessLogs: async () => {
            const ok = await app.loadAdminOpsPanelData({ force: true, includeAccessLogs: true });
            if (ok) app.renderMasterPermissionPage();
        },
        loadAdminOpsSecurityLogs: async () => {
            const ok = await app.loadAdminOpsPanelData({ force: true, includeSecurityLogs: true });
            if (ok) app.renderMasterPermissionPage();
        },
        buildAdminOpsCalendarData: (targetUser, year = app.adminOpsViewYear, month = app.adminOpsViewMonth) => {
            const safeTarget = targetUser || app.ensureAdminOpsTargetUser();
            const monthStart = moment({ year, month, day: 1 });
            const monthEnd = monthStart.clone().endOf('month');
            const eventMap = {};
            if (!safeTarget) return { eventMap };
            const items = (appData.requests || [])
                .filter((req) => app.requestBelongsToUser(req, safeTarget))
                .sort((a, b) =>
                    app.getRequestTypePriority(a) - app.getRequestTypePriority(b) ||
                    String(a.startDate || '').localeCompare(String(b.startDate || ''), 'ko') ||
                    String(a.timestamp || '').localeCompare(String(b.timestamp || ''), 'ko')
                );
            items.forEach((req) => {
                const start = moment(req.startDate);
                const end = moment(req.endDate || req.startDate);
                const rangeStart = moment.max(start, monthStart);
                const rangeEnd = moment.min(end, monthEnd);
                if (rangeStart.isAfter(rangeEnd, 'day')) return;
                const cursor = rangeStart.clone();
                while (cursor.isSameOrBefore(rangeEnd, 'day')) {
                    const key = cursor.format('YYYY-MM-DD');
                    if (!eventMap[key]) eventMap[key] = [];
                    eventMap[key].push(req);
                    cursor.add(1, 'day');
                }
            });
            Object.keys(eventMap).forEach((key) => {
                eventMap[key].sort((a, b) =>
                    app.getRequestTypePriority(a) - app.getRequestTypePriority(b) ||
                    String(a.startDate || '').localeCompare(String(b.startDate || ''), 'ko') ||
                    String(a.timestamp || '').localeCompare(String(b.timestamp || ''), 'ko')
                );
            });
            return { eventMap };
        },
        getAdminOpsRequestsForDate: (dateStr, targetUser = app.ensureAdminOpsTargetUser()) => {
            const safeDate = security.normalizeDate(dateStr, '');
            if (!safeDate || !targetUser) return [];
            return (appData.requests || [])
                .filter((req) => app.requestBelongsToUser(req, targetUser))
                .filter((req) => {
                    const start = security.normalizeDate(req.startDate, '');
                    const end = security.normalizeDate(req.endDate, start);
                    return !!start && !!end && safeDate >= start && safeDate <= end;
                })
                .sort((a, b) =>
                    String(a.startDate || '').localeCompare(String(b.startDate || ''), 'ko') ||
                    app.getRequestTypePriority(a) - app.getRequestTypePriority(b) ||
                    String(a.timestamp || '').localeCompare(String(b.timestamp || ''), 'ko')
                );
        },
        renderAdminOpsProxyPanel: () => {
            const targetUser = app.ensureAdminOpsTargetUser();
            if (!targetUser) {
                return `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                    <p class="text-sm font-bold text-gray-800 mb-1">달력 기반 대리 등록/삭제</p>
                    <p class="text-sm text-gray-500">관리 가능한 직원이 없습니다.</p>
                </div>`;
            }
            const monthStart = moment({ year: app.adminOpsViewYear, month: app.adminOpsViewMonth, day: 1 });
            const safeSelectedDate = security.normalizeDate(
                app.adminOpsSelectedDate,
                monthStart.format('YYYY-MM-DD')
            );
            app.adminOpsSelectedDate = safeSelectedDate;
            const calendarData = app.buildAdminOpsCalendarData(targetUser, app.adminOpsViewYear, app.adminOpsViewMonth);
            const selectedRequests = app.getAdminOpsRequestsForDate(safeSelectedDate, targetUser);
            let html = `<div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div class="p-4 border-b border-gray-200 bg-gray-50/70">
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                            <p class="text-sm font-bold text-gray-800">달력 기반 대리 등록/삭제</p>
                            <p class="text-xs text-gray-500">대상 직원을 고르고 날짜를 클릭해 누락된 연차를 보정합니다. 날짜 더블클릭 또는 버튼으로 등록창을 엽니다.</p>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <label class="text-xs text-gray-500">대상 직원</label>
                            <select class="border bg-white rounded-lg px-3 py-2 text-sm font-bold text-gray-700" onchange="app.setAdminOpsTargetUser(this.value)">
                                ${app.getAdminOpsTargetUsers().map((user) => `<option value="${security.cleanInlineValue(user.id)}" ${String(user.id) === String(app.adminOpsTargetUserId) ? 'selected' : ''}>${user.name} (${user.dept})</option>`).join('')}
                            </select>
                            <button onclick="app.openAdminProxyRequestModal('${safeSelectedDate}')" class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">선택 날짜로 대리 등록</button>
                        </div>
                    </div>
                </div>
                <div class="px-4 py-3 border-b border-gray-200 flex items-center">
                    <button onclick="app.changeAdminOpsMonth(-1)" class="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition"><i class="fa-solid fa-chevron-left text-gray-600"></i></button>
                    <h3 class="text-xl font-bold text-gray-800 mx-4">${app.adminOpsViewYear}년 ${app.adminOpsViewMonth + 1}월 <span class="text-sm font-normal text-gray-500">(${targetUser.name})</span></h3>
                    <button onclick="app.changeAdminOpsMonth(1)" class="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition"><i class="fa-solid fa-chevron-right text-gray-600"></i></button>
                </div>
                <div class="calendar-grid">
                    <div class="calendar-header-cell text-red-500">일</div><div class="calendar-header-cell">월</div><div class="calendar-header-cell">화</div><div class="calendar-header-cell">수</div><div class="calendar-header-cell">목</div><div class="calendar-header-cell">금</div><div class="calendar-header-cell text-blue-500">토</div>`;
            const firstDayIdx = new Date(app.adminOpsViewYear, app.adminOpsViewMonth, 1).getDay();
            const lastDate = new Date(app.adminOpsViewYear, app.adminOpsViewMonth + 1, 0).getDate();
            for (let i = 0; i < firstDayIdx; i++) html += `<div class="calendar-cell bg-gray-50/50"></div>`;
            for (let d = 1; d <= lastDate; d++) {
                const dateStr = `${app.adminOpsViewYear}-${String(app.adminOpsViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const today = moment().startOf('day');
                const curDate = moment(dateStr);
                const isToday = curDate.isSame(today, 'day');
                const isSelected = safeSelectedDate === dateStr;
                const isRed = holidayLogic.isRedDay(dateStr);
                const isSat = holidayLogic.isSat(dateStr);
                const holName = holidayLogic.getHolName(dateStr);
                const events = calendarData.eventMap[dateStr] || [];
                const eventHtml = events.slice(0, 4).map((req) => {
                    const isRejected = req.status === 'rejected';
                    const isCancelled = req.status === 'cancelled';
                    const isPending = req.status === 'pending';
                    let tone = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    if (isRejected) tone = 'bg-red-100 text-red-700 border-red-300';
                    else if (isCancelled) tone = 'bg-gray-100 text-gray-500 border-gray-300';
                    else if (isPending) tone = 'bg-amber-100 text-amber-800 border-amber-300';
                    return `<div class="text-[10px] px-1 py-0.5 rounded border truncate ${tone}">${app.getRequestDisplayType(req)}</div>`;
                }).join('');
                const moreHtml = events.length > 4 ? `<div class="text-[10px] text-gray-400">+${events.length - 4}건</div>` : '';
                html += `<div class="calendar-cell hover:bg-gray-50 ${isToday ? 'calendar-cell-today' : ''} ${isSelected ? 'calendar-cell-selected' : ''}" onclick="app.setAdminOpsSelectedDate('${dateStr}')" ondblclick="app.openAdminProxyRequestModal('${dateStr}')">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-sm font-bold ml-1 mt-1 ${isToday ? 'today-circle' : (isRed ? 'holiday-text' : (isSat ? 'sat-text' : 'text-gray-700'))}">${d}</span>
                        ${holName ? `<span class="text-[10px] text-white bg-red-400 px-1 rounded truncate max-w-[68px]">${holName}</span>` : ''}
                    </div>
                    <div class="space-y-1 px-1 max-h-[86px] overflow-hidden">${eventHtml}${moreHtml}</div>
                </div>`;
            }
            html += `</div>
                <div class="p-4 border-t border-gray-200 bg-white">
                    <div class="flex items-center justify-between gap-3 mb-3">
                        <div>
                            <p class="text-sm font-bold text-gray-800">${safeSelectedDate} / ${targetUser.name}</p>
                            <p class="text-xs text-gray-500">선택 날짜에 걸친 연차 내역입니다. 잘못된 데이터는 여기서 바로 삭제할 수 있습니다.</p>
                        </div>
                        <button onclick="app.openAdminProxyRequestModal('${safeSelectedDate}')" class="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-bold border border-indigo-100 hover:bg-indigo-100">이 날짜에 등록</button>
                    </div>
                    <div class="space-y-2">
                        ${selectedRequests.length ? selectedRequests.map((req) => {
                            const statusLabel = req.status === 'approved' ? '승인' : (req.status === 'pending' ? '대기' : (req.status === 'rejected' ? '반려' : (req.status === 'cancel_requested' ? '취소요청' : '취소')));
                            const statusTone = req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : (req.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : (req.status === 'rejected'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-gray-100 text-gray-600'));
                            return `<div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 flex items-center justify-between gap-3">
                                <div class="min-w-0">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="font-bold text-gray-800">${app.getRequestDisplayType(req)}</span>
                                        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${statusTone}">${statusLabel}</span>
                                    </div>
                                    <div class="mt-1 text-xs text-gray-500">${app.formatRequestPeriodText(req)}</div>
                                    <div class="mt-1 text-xs text-gray-600">${req.reason || '-'}</div>
                                    ${req.detailReason ? `<div class="mt-1 text-xs text-amber-600">상세사유: ${req.detailReason}</div>` : ''}
                                </div>
                                <div class="shrink-0 flex items-center gap-2">
                                    <button onclick="app.editAdminManagedRequest('${security.cleanInlineValue(req.id)}')" class="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 text-xs font-bold hover:bg-indigo-50">수정</button>
                                    <button onclick="app.deleteAdminManagedRequest('${security.cleanInlineValue(req.id)}')" class="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50">삭제</button>
                                </div>
                            </div>`;
                        }).join('') : `<div class="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-400 text-center">선택 날짜에 등록된 연차 내역이 없습니다.</div>`}
                    </div>
                </div>
            </div>`;
            return html;
        },
        renderAdminOpsLogPanel: () => {
            const logs = Array.isArray(appData.accessLogs) ? appData.accessLogs.slice(0, 20) : [];
            const loaded = !!app.adminOpsAccessLogsLoaded;
            return `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <p class="text-sm font-bold text-gray-800">최근 접속 로그</p>
                        <p class="text-xs text-gray-500">${loaded ? '불러온 최근 20건만 표시합니다.' : '운영실 진입 시 자동으로 읽지 않습니다. 필요할 때만 불러옵니다.'}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="app.loadAdminOpsAccessLogs()" class="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-800">${loaded ? '새로고침' : '접속 로그 불러오기'}</button>
                        <button onclick="app.downloadAccessLogsCsv()" class="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-900">CSV 다운로드</button>
                        <span class="text-[11px] font-bold text-slate-500">${loaded ? `${logs.length}건` : '미로드'}</span>
                    </div>
                </div>
                <div class="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                    ${loaded && logs.length ? logs.map((log) => `
                        <div class="rounded-lg border border-gray-200 bg-slate-50 px-3 py-2">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-sm font-bold text-gray-800">${log.userName || '-'}</span>
                                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">${log.type || '-'}</span>
                            </div>
                            <div class="mt-1 text-xs text-gray-500">${log.timestamp || '-'}</div>
                            <div class="mt-1 text-xs text-gray-500">${log.ip || '-'}</div>
                            <div class="mt-1 text-xs text-gray-600 break-all">${log.detail || '-'}</div>
                        </div>`).join('') : `
                        <div class="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-400 text-center">
                            ${loaded ? '표시할 접속 로그가 없습니다.' : '접속 로그를 아직 불러오지 않았습니다.'}
                        </div>`}
                </div>
            </div>`;
        },
        renderAdminOpsSecurityLogPanel: () => {
            const logs = Array.isArray(appData.securityLogs) ? appData.securityLogs.slice(0, 20) : [];
            const loaded = !!app.adminOpsSecurityLogsLoaded;
            return `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <p class="text-sm font-bold text-gray-800">최근 보안 로그</p>
                        <p class="text-xs text-gray-500">${loaded ? '불러온 최근 20건만 표시합니다.' : '운영실 진입 시 자동으로 읽지 않습니다. 필요할 때만 불러옵니다.'}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="app.loadAdminOpsSecurityLogs()" class="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700">${loaded ? '새로고침' : '보안 로그 불러오기'}</button>
                        <button onclick="app.downloadSecurityLogsCsv()" class="px-3 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-bold hover:bg-rose-800">CSV 다운로드</button>
                        <span class="text-[11px] font-bold text-slate-500">${loaded ? `${logs.length}건` : '미로드'}</span>
                    </div>
                </div>
                <div class="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                    ${loaded && logs.length ? logs.map((log) => `
                        <div class="rounded-lg border border-gray-200 bg-rose-50/40 px-3 py-2">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-sm font-bold text-gray-800">${log.userName || log.userId || '-'}</span>
                                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${app.getSecuritySeverityTone(log.severity)}">${log.severity || 'info'}</span>
                            </div>
                            <div class="mt-1 text-xs font-semibold text-slate-700">${log.eventType || '-'}</div>
                            <div class="mt-1 text-xs text-gray-500">${log.timestamp || '-'}</div>
                            <div class="mt-1 text-xs text-gray-500">${log.ip || '-'}</div>
                            <div class="mt-1 text-xs text-gray-600 break-all">${log.detail || '-'}</div>
                        </div>`).join('') : `
                        <div class="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-400 text-center">
                            ${loaded ? '표시할 보안 로그가 없습니다.' : '보안 로그를 아직 불러오지 않았습니다.'}
                        </div>`}
                </div>
            </div>`;
        },
        renderAdminOpsPanel: () => {
            const targetUser = app.ensureAdminOpsTargetUser();
            const safeSelectedDate = security.normalizeDate(app.adminOpsSelectedDate, moment({ year: app.adminOpsViewYear, month: app.adminOpsViewMonth, day: 1 }).format('YYYY-MM-DD'));
            app.adminOpsSelectedDate = safeSelectedDate;
            return `<div class="space-y-4">
                <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                    <p class="text-sm font-bold text-gray-800">운영실</p>
                    <p class="text-sm text-gray-600">접속 로그 확인, 달력 기반 대리 등록/삭제, 수동 휴일 설정을 한 곳에서 처리합니다.</p>
                    <div class="mt-3 flex flex-wrap gap-2 text-[11px]">
                        <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">대상 직원 ${targetUser ? 1 : 0}명 선택</span>
                        <span class="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-bold">선택 날짜 ${safeSelectedDate || '-'}</span>
                        <span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">접속 로그 ${app.adminOpsAccessLogsLoaded ? `${(appData.accessLogs || []).length}건 로드` : '미로드'}</span>
                        <span class="px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-bold">보안 로그 ${app.adminOpsSecurityLogsLoaded ? `${(appData.securityLogs || []).length}건 로드` : '미로드'}</span>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-4">
                    <div class="space-y-4">
                        ${app.renderAdminOpsProxyPanel()}
                        ${app.renderAdminOpsHolidayPanel()}
                    </div>
                    <div class="space-y-4">
                        ${app.renderAdminOpsLogPanel()}
                        ${app.renderAdminOpsSecurityLogPanel()}
                    </div>
                </div>
            </div>`;
        },
        readSessionState: () => {
            try {
                const raw = sessionStorage.getItem(app.sessionStorageKey);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                return {
                    userId: security.cleanInlineValue(parsed.userId || ''),
                    sessionToken: security.cleanInlineValue(parsed.sessionToken || ''),
                    lastActivityAt: Number(parsed.lastActivityAt || 0)
                };
            } catch (e) {
                return null;
            }
        },
        saveSessionState: () => {
            try {
                if (!app.currentUser || !app.currentUser.id) {
                    sessionStorage.removeItem(app.sessionStorageKey);
                    return;
                }
                sessionStorage.setItem(app.sessionStorageKey, JSON.stringify({
                    userId: security.cleanInlineValue(app.currentUser.id),
                    sessionToken: db.getSessionToken(),
                    lastActivityAt: Number(app.lastActivityAt || Date.now())
                }));
            } catch (e) {
                console.warn('session save skip', e);
            }
        },
        clearSessionState: () => {
            try {
                sessionStorage.removeItem(app.sessionStorageKey);
            } catch (e) {
                console.warn('session clear skip', e);
            }
        },
        handleExpiredSession: (message = '로그인이 만료되었습니다. 다시 로그인해 주세요.') => {
            db.clearSessionToken();
            app.clearSessionState();
            app.stopIdleWatch();
            app.currentUser = null;
            app.currentView = 'dashboard';
            app.renderNav();
            app.renderLogin();
            alert(message);
        },
        restoreSession: async () => {
            const saved = app.readSessionState();
            if (!saved || !saved.userId || !saved.sessionToken) return false;
            if (saved.lastActivityAt && (Date.now() - saved.lastActivityAt) >= app.inactivityLimitMs) {
                db.clearSessionToken();
                app.clearSessionState();
                return false;
            }

            app.setLoadingOverlayState('새로고침 복원 중...', { subtext: '(최대 15초)' });

            try {
                db.setSessionToken(saved.sessionToken);
                let loadedAllData = false;
                const sessionBoot = await db.loadSessionBoot();
                if (!sessionBoot || sessionBoot.result !== 'success') {
                    throw new Error(db.getApiErrorMessage(sessionBoot && sessionBoot.message, 'SESSION_RESTORE_FAILED'));
                }

                const freshUser = security.sanitizeUser(sessionBoot.user || {});
                if (!freshUser || !freshUser.id) throw new Error('SESSION_USER_NOT_FOUND');

                app.currentUser = freshUser;
                delete app.currentUser.password;
                app.currentView = 'dashboard';
                app.boardCategoryFilter = 'all';
                app.boardSearchText = '';
                app.boardEditingId = null;
                app.selectedBoardId = null;
                app.unloadLogged = false;
                appData.meta.situationBoardLoaded = false;
                app.calendarRenderCache = null;
                app.markActivity({ force: true });
                app.startIdleWatch();

                if (appData.meta.scopedLoadSupported) {
                    app.setLoadingOverlayState('데이터 로드중...\n잠시만 기다려 주세요.', { subtext: '(최대 15초)' });
                    const deferredResult = await db.loadDeferred();
                    if (!deferredResult.ok) {
                        const fullResult = await db.load();
                        if (!fullResult.ok) throw new Error('FULL_LOAD_FAILED');
                    }
                    loadedAllData = true;
                }

                if (!loadedAllData) {
                    app.setLoadingOverlayState('데이터 로드중...\n잠시만 기다려 주세요.', { subtext: '(최대 15초)' });
                    const fullResult = await db.load();
                    if (!fullResult.ok) throw new Error('FULL_LOAD_FAILED');
                }
                app.syncCurrentUserFromUsers();
                app.recalcUsedHours();
                app.renderNav();
                app.refreshDashboard();
                return true;
            } catch (e) {
                console.warn('session restore skip', e);
                db.clearSessionToken();
                app.clearSessionState();
                app.currentUser = null;
                app.renderNav();
                app.renderLogin();
                return false;
            } finally {
                app.hideLoadingOverlay();
            }
        },
        markActivity: (options = {}) => {
            const now = Date.now();
            const force = !!options.force;
            if (force || (now - app.lastActivityAt >= app.activityInputThrottleMs)) {
                app.lastActivityAt = now;
            }
            if (!app.currentUser) return;
            if (force || (now - app.lastSessionPersistAt >= app.sessionPersistThrottleMs)) {
                app.lastSessionPersistAt = now;
                app.saveSessionState();
            }
        },
        bindIdleEvents: () => {
            if (app.idleEventsBound) return;
            app.idleEventsBound = true;
            const events = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'];
            events.forEach((eventName) => {
                window.addEventListener(eventName, () => app.markActivity(), { passive: true });
            });
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) app.markActivity({ force: true });
            });
            const sendUnloadLog = () => {
                if (!app.currentUser || app.unloadLogged) return;
                app.unloadLogged = true;
                db.logAccessBeacon({
                    userId: app.currentUser.id,
                    userName: app.currentUser.name,
                    logType: 'Logout',
                    detail: 'window_close'
                });
            };
            window.addEventListener('pagehide', sendUnloadLog);
            window.addEventListener('beforeunload', sendUnloadLog);
        },
        startIdleWatch: () => {
            app.markActivity({ force: true });
            if (app.idleTimer) clearInterval(app.idleTimer);
            app.idleTimer = setInterval(() => {
                if (!app.currentUser) return;
                const idleMs = Date.now() - app.lastActivityAt;
                if (idleMs >= app.inactivityLimitMs) {
                    app.logout('timeout');
                }
            }, 15000);
        },
        stopIdleWatch: () => {
            if (app.idleTimer) {
                clearInterval(app.idleTimer);
                app.idleTimer = null;
            }
        },

        toggleUsage: () => {
            app.markActivity({ force: true });
            app.showUsage = !app.showUsage;
            app.refreshDashboard();
        },
        
        togglePwVisibility: (el) => {
            const type = el.checked ? 'text' : 'password';
            document.getElementById('pw-current').type = type;
            document.getElementById('pw-new').type = type;
            document.getElementById('pw-confirm').type = type;
        },

        changePage: (newPage) => {
            app.currentPage = newPage;
            app.refreshDashboard(); 
        },
        setRequestItemsPerPage: (size) => {
            const nextSize = Number(size);
            if (![5, 10, 15].includes(nextSize)) return;
            app.requestItemsPerPage = nextSize;
            app.currentPage = 1;
            app.refreshDashboard();
        },

        renderLogin: () => {
            app.setLoginScreenLayout(true);
            document.getElementById('app-container').innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[calc(100vh-250px)] md:min-h-[calc(100vh-230px)] px-4">
                <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
                    <div class="text-center mb-8">
                        <i class="fa-solid fa-calendar-check text-indigo-600 text-5xl mb-4"></i>
                        <h1 class="text-2xl font-bold text-gray-800">NCORE 연차관리</h1>
                    </div>
                    <div class="space-y-4">
                        <div><label class="block text-xs font-bold text-gray-500 mb-1 ml-1">아이디</label><input id="login-id" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:border-indigo-500" placeholder="ID 입력"></div>
                        <div><label class="block text-xs font-bold text-gray-500 mb-1 ml-1">비밀번호</label><input type="password" id="login-pw" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:border-indigo-500" placeholder="비밀번호 입력"></div>
                        <button onclick="app.tryLogin()" class="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition mt-2">로그인</button>
                    </div>
                </div>
            </div>`;
        },
        setLoadingOverlayState: (message = '', options = {}) => {
            const loadingEl = document.getElementById('loading-overlay');
            const loadingTextEl = document.getElementById('loading-text');
            const loadingSubtextEl = document.getElementById('loading-subtext');
            const subtext = String(options.subtext || '').trim();
            if (loadingTextEl && message) loadingTextEl.innerHTML = String(message).replace(/\n/g, '<br>');
            if (loadingSubtextEl) {
                loadingSubtextEl.innerText = subtext || '(최대 15초)';
                loadingSubtextEl.classList.toggle('hidden', !subtext);
            }
            if (loadingEl) loadingEl.style.display = options.visible === false ? 'none' : 'flex';
        },
        hideLoadingOverlay: () => {
            const loadingEl = document.getElementById('loading-overlay');
            const loadingSubtextEl = document.getElementById('loading-subtext');
            if (loadingSubtextEl) loadingSubtextEl.classList.add('hidden');
            if (loadingEl) loadingEl.style.display = 'none';
        },
        syncCurrentUserFromUsers: () => {
            if (!app.currentUser) return;
            const freshUser = appData.users.find((u) => String(u.id) === String(app.currentUser.id));
            if (!freshUser) return;
            const mergedUser = security.sanitizeUser({
                ...app.currentUser,
                ...freshUser,
                permissions: freshUser.permissions || app.currentUser.permissions || {}
            });
            mergedUser.usedHours = Number(freshUser.usedHours || 0);
            mergedUser.pendingHours = Number(freshUser.pendingHours || 0);
            delete mergedUser.password;
            app.currentUser = mergedUser;
            app.saveSessionState();
        },
        sortRequestsByRecent: (requests = []) => {
            const toDayValue = (value, endOfDay = false) => {
                const parsed = moment(value, ['YYYY-MM-DD', moment.ISO_8601], true);
                if (!parsed.isValid()) return 0;
                return (endOfDay ? parsed.endOf('day') : parsed.startOf('day')).valueOf();
            };
            const toTimestampValue = (value) => {
                const parsed = moment(value);
                return parsed.isValid() ? parsed.valueOf() : 0;
            };
            return [...requests].sort((a, b) => {
                const startDiff = toDayValue(b.startDate) - toDayValue(a.startDate);
                if (startDiff !== 0) return startDiff;
                const endDiff = toDayValue(b.endDate, true) - toDayValue(a.endDate, true);
                if (endDiff !== 0) return endDiff;
                const timestampDiff = toTimestampValue(b.timestamp) - toTimestampValue(a.timestamp);
                if (timestampDiff !== 0) return timestampDiff;
                const idA = Number(a && a.id);
                const idB = Number(b && b.id);
                if (Number.isFinite(idA) && Number.isFinite(idB) && idA !== idB) return idB - idA;
                return String(b && b.id || '').localeCompare(String(a && a.id || ''), 'ko');
            });
        },
        renderRequestPageSizeControl: () => {
            const currentSize = [5, 10, 15].includes(Number(app.requestItemsPerPage)) ? Number(app.requestItemsPerPage) : 5;
            return `<div class="flex items-center gap-1">${[5, 10, 15].map((size) => {
                const activeClass = currentSize === size
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600';
                return `<button onclick="app.setRequestItemsPerPage(${size})" class="px-2.5 py-1 rounded-full text-xs font-bold border transition ${activeClass}">${size}개</button>`;
            }).join('')}</div>`;
        },
        renderRecentRequestRow: (r) => {
            const displayType = app.getRequestDisplayType(r);
            const badgeClass = app.getRequestBadgeClass(r);

            const formattedDate = r.startDate === r.endDate
                ? app.fmtDate(r.startDate)
                : app.fmtDate(r.startDate) + '~' + app.fmtDate(r.endDate);
            const timeRangeText = r.timeRange ? `(${r.timeRange})` : '&nbsp;';
            const timeRangeClass = r.timeRange
                ? 'inline-flex justify-center text-sm font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded'
                : 'inline-flex justify-center text-sm font-bold text-gray-200 bg-gray-50 px-2 py-0.5 rounded opacity-0';
            const statusText = app.getRequestStatusText(r.status);
            const statusClass = app.getRequestStatusClasses(r.status);

            if (app.isMobileViewport) {
                return `<div class="p-4 border-b last:border-0 hover:bg-gray-50">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0 flex-1">
                            <div class="font-bold text-base text-gray-800">${formattedDate}</div>
                            <div class="mt-2 flex flex-wrap items-center gap-2">
                                <span class="inline-flex justify-center px-2 py-0.5 rounded text-xs font-bold ${badgeClass}">${displayType}</span>
                                ${r.timeRange ? `<span class="inline-flex justify-center text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">(${r.timeRange})</span>` : ''}
                            </div>
                            <p class="mt-2 text-sm text-gray-500"><span class="font-medium text-gray-700">${r.reason}</span></p>
                            <p class="mt-1 text-xs text-gray-400">${app.formatDeductionText(r)}</p>
                        </div>
                        <span class="font-bold px-3 py-1 rounded-full text-xs text-center shrink-0 ${statusClass}">${statusText}</span>
                    </div>
                    <div class="mt-3 flex flex-wrap justify-end gap-3 text-xs">
                        ${r.status==='pending'?`<button onclick="app.editReq('${r.id}')" class="text-indigo-600 underline font-bold">수정</button>`:''}
                        ${app.canRequestCancel(r)?`<button onclick="app.processReq('${r.id}','cancel_req')" class="text-gray-500 underline hover:text-red-500">취소</button>`:''}
                        ${r.status==='cancelled'?`<button onclick="app.deleteReq('${r.id}')" class="text-gray-500 underline hover:text-red-600">삭제</button>`:''}
                    </div>
                </div>`;
            }

                const deleteButton = r.status === 'cancelled'
                    ? `<button onclick="app.deleteReq('${r.id}')" class="text-xs text-gray-400 underline hover:text-red-600 text-right pr-3"><i class="fa-regular fa-trash-can mr-1"></i>삭제</button>`
                    : '';
                return `<div class="p-5 border-b last:border-0 hover:bg-gray-50 flex justify-between items-center gap-4"><div class="min-w-0 flex-grow"><div class="inline-grid max-w-full items-center gap-3 mb-1 align-middle" style="grid-template-columns:220px minmax(120px,170px) 122px;"><span class="font-bold text-lg truncate">${formattedDate}</span><span class="inline-flex justify-center px-2 py-0.5 rounded text-xs font-bold ${badgeClass}">${displayType}</span><span class="${timeRangeClass}">${timeRangeText}</span></div><p class="text-sm text-gray-500 pl-1"><span class="font-medium text-gray-700">${r.reason}</span> | <span class="text-gray-400">${app.formatDeductionText(r)}</span></p></div><div class="flex flex-col items-end min-w-[80px]"><span class="font-bold px-3 py-1 rounded-full text-xs text-center ml-auto mb-1 ${statusClass}">${statusText}</span>${r.status==='pending'?`<button onclick="app.editReq('${r.id}')" class="text-xs text-indigo-500 underline hover:text-indigo-700 font-bold text-right mb-1 pr-3">수정</button>`:''} ${app.canRequestCancel(r)?`<button onclick="app.processReq('${r.id}','cancel_req')" class="text-xs text-gray-400 underline hover:text-red-500 text-right pr-3">취소</button>`:''} ${deleteButton}</div></div>`;
        },
        renderRecentRequestList: (title, requests, emptyText, options = {}) => {
            const pageSize = [5, 10, 15].includes(Number(app.requestItemsPerPage)) ? Number(app.requestItemsPerPage) : 5;
            const totalItems = requests.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
            if (app.currentPage > totalPages && totalPages > 0) app.currentPage = Math.max(1, totalPages);
            const startIdx = (app.currentPage - 1) * pageSize;
            const pagedReqs = requests.slice(startIdx, startIdx + pageSize);
            const paginationWrapClass = String(options.paginationWrapClass || 'flex justify-end items-center mt-3 px-1 space-x-2');
            const sectionClass = String(options.sectionClass || '');
            if (!app.isMobileViewport) {
                return `<div class="mb-8"><div class="flex justify-between items-center mb-4 px-1"><h3 class="text-lg font-bold text-gray-800">${title}</h3>${app.renderRequestPageSizeControl()}</div><div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${sectionClass}">${totalItems === 0 ? `<div class="p-8 text-center text-gray-400">${emptyText}</div>` : pagedReqs.map((r) => app.renderRecentRequestRow(r)).join('')}</div>${totalItems > 0 ? `<div class="${paginationWrapClass}"><button ${app.currentPage === 1 ? 'disabled' : ''} onclick="app.changePage(${app.currentPage - 1})" class="px-3 py-1 rounded border ${app.currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">이전</button><span class="text-sm text-gray-600 font-medium">${app.currentPage} / ${totalPages}</span><button ${app.currentPage === totalPages ? 'disabled' : ''} onclick="app.changePage(${app.currentPage + 1})" class="px-3 py-1 rounded border ${app.currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">다음</button></div>` : ''}</div>`;
            }
            const isOpen = !!app.mobileRecentRequestsOpen;
            return `<div class="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${sectionClass}">
                <div class="px-4 py-4 bg-gray-50/70">
                    <button onclick="app.toggleMobileRecentRequestsOpen()" class="w-full flex items-center justify-between gap-3 text-left">
                        <div class="min-w-0">
                            <h3 class="text-base font-bold text-gray-800 flex items-center"><i class="fa-regular fa-rectangle-list mr-2 text-indigo-600"></i>${title}</h3>
                            <p class="mt-1 text-xs text-gray-500">${totalItems}건</p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="text-xs font-bold text-indigo-700">${isOpen ? '접기' : '펼치기'}</span>
                            <i class="fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs text-indigo-600"></i>
                        </div>
                    </button>
                </div>
                ${isOpen ? `<div class="px-4 pt-3">${app.renderRequestPageSizeControl()}</div><div class="overflow-hidden">${totalItems === 0 ? `<div class="p-8 text-center text-gray-400">${emptyText}</div>` : pagedReqs.map((r) => app.renderRecentRequestRow(r)).join('')}</div>${totalItems > 0 ? `<div class="${paginationWrapClass} pb-4"><button ${app.currentPage === 1 ? 'disabled' : ''} onclick="app.changePage(${app.currentPage - 1})" class="px-3 py-1 rounded border ${app.currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">이전</button><span class="text-sm text-gray-600 font-medium">${app.currentPage} / ${totalPages}</span><button ${app.currentPage === totalPages ? 'disabled' : ''} onclick="app.changePage(${app.currentPage + 1})" class="px-3 py-1 rounded border ${app.currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">다음</button></div>` : ''}` : ''}
            </div>`;
        },
        isMobileMemberSectionOpen: (deptName) => !!app.mobileMemberStatusOpen[security.cleanInlineValue(deptName || '')],
        toggleMobileMemberSection: (deptName) => {
            const safeDept = security.cleanInlineValue(deptName || '');
            app.mobileMemberStatusOpen = {
                ...app.mobileMemberStatusOpen,
                [safeDept]: !app.isMobileMemberSectionOpen(safeDept)
            };
            app.refreshDashboard();
        },

        renderNav: () => {
            const el = document.getElementById('nav-info');
            if (!app.currentUser) {
                app.setLayoutMode('default');
                return el.innerHTML = '';
            }
            app.setLayoutMode(app.currentView === 'situation-board' ? 'situation' : 'default');
            const isMaster = app.currentUser.role === 'master';
            const canManageUsers = app.hasUserManagePermission();
            const canAccessMasterPermission = app.hasMasterPermissionAccess();
            const canAccessAdminOps = app.hasAdminOpsAccess();
            const canAccessSituationBoard = app.canAccessSituationBoard();
            const boardEnabled = app.isBoardFeatureEnabled();
            const boardBtn = boardEnabled ? `<button onclick="app.closeTopNavMenus(true); app.openBoardPage()" class="text-sm ${app.currentView==='board' ? 'bg-blue-700' : 'bg-blue-600'} text-white px-3 py-2 rounded-lg font-bold">공지사항</button>` : '';
            const situationBtn = canAccessSituationBoard ? `<button onclick="app.closeTopNavMenus(true); app.openSituationBoard()" class="text-sm ${app.currentView==='situation-board' ? 'bg-slate-900' : 'bg-slate-700'} text-white px-3 py-2 rounded-lg font-bold">전체 상황판</button>` : '';
            const homeBtn = app.currentView !== 'dashboard'
                ? `<button onclick="app.closeTopNavMenus(true); app.backToDashboard()" class="text-sm bg-white border px-3 py-2 rounded-lg font-bold">홈</button>`
                : '';
            const adminMenuItems = [];
            if (canAccessAdminOps) adminMenuItems.push({ value: 'master-permissions', label: '권한/설정' });
            if (canAccessAdminOps) adminMenuItems.push({ value: 'admin-ops', label: '운영실' });
            if (canManageUsers) adminMenuItems.push({ value: 'user-management', label: '구성원 관리' });
            const adminMenuBtn = adminMenuItems.length ? `<div class="relative" onclick="event.stopPropagation()">
                <button type="button" onclick="app.toggleAdminNavMenu(); event.stopPropagation();" class="text-sm ${app.currentView==='master-permissions' || app.currentView==='user-management' ? 'bg-purple-700 text-white border-purple-700' : 'bg-white border text-gray-700'} px-3 py-2 rounded-lg font-bold inline-flex items-center gap-2">
                    <span>관리 메뉴</span>
                    <i class="fa-solid ${app.adminNavMenuOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs"></i>
                </button>
                <div class="${app.adminNavMenuOpen ? 'block' : 'hidden'} absolute right-0 top-full mt-2 min-w-[172px] z-40">
                    <div class="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                        ${adminMenuItems.map((item) => `<button type="button" onclick="app.handleAdminNavAction('${item.value}')" class="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 border-b last:border-b-0 border-gray-100">${item.label}</button>`).join('')}
                    </div>
                </div>
            </div>` : '';
            const pwBtn = `<button onclick="app.closeTopNavMenus(true); document.getElementById('pw-modal').classList.remove('hidden')" class="text-sm bg-white border px-3 py-2 rounded-lg">비번변경</button>`;
            const logoutBtn = `<button onclick="app.logout()" class="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg font-bold">로그아웃</button>`;
            const profileHtml = `<div class="text-right"><p class="text-sm font-bold">${app.currentUser.name} <span class="text-xs text-gray-500">${app.currentUser.rank||''}</span>${isMaster?'<span class="text-[10px] bg-red-600 text-white px-1 rounded ml-1">MASTER</span>':''}</p><p class="text-xs text-gray-500">${app.currentUser.dept}</p></div>`;
            const actions = [boardBtn, situationBtn, homeBtn, adminMenuBtn, pwBtn, logoutBtn].filter(Boolean);
            const actionsHtml = actions.join('');

            if (app.isMobileViewport) {
                const mobileOptions = [];
                if (boardEnabled) mobileOptions.push({ value: 'board', label: '공지사항' });
                if (canAccessSituationBoard) mobileOptions.push({ value: 'situation-board', label: '전체 상황판' });
                if (app.currentView !== 'dashboard') mobileOptions.push({ value: 'home', label: '홈' });
                if (canAccessAdminOps) mobileOptions.push({ value: 'master-permissions', label: '권한/설정' });
                if (canAccessAdminOps) mobileOptions.push({ value: 'admin-ops', label: '운영실' });
                if (canManageUsers) mobileOptions.push({ value: 'user-management', label: '구성원 관리' });
                mobileOptions.push({ value: 'password', label: '비번변경' });
                mobileOptions.push({ value: 'logout', label: '로그아웃' });
                const isOpen = !!app.mobileNavMenuOpen;
                el.innerHTML = `<div class="relative">
                    <button type="button" onclick="app.toggleMobileNavMenu(); event.stopPropagation();" class="flex items-start justify-end gap-3 text-right relative z-10">
                        <div>${profileHtml}</div>
                        <div class="w-8 h-8 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500 mt-0.5 shrink-0">
                            <i class="fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs"></i>
                        </div>
                    </button>
                    <div class="${isOpen ? 'block' : 'hidden'} absolute right-0 top-full mt-2 w-[172px] z-40" onclick="event.stopPropagation()">
                        <div class="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                            ${mobileOptions.map((item) => `<button type="button" onclick="app.handleMobileNavAction('${item.value}')" class="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 border-b last:border-b-0 border-gray-100">${item.label}</button>`).join('')}
                        </div>
                    </div>
                </div>`;
                return;
            }

            el.innerHTML = `<div class="flex items-center"><div class="mr-3">${profileHtml}</div><div class="flex items-center gap-2">${actionsHtml}</div></div>`;
        },
        handleMobileNavAction: (action) => {
            const safeAction = String(action || '').trim();
            if (!safeAction) return;
            app.mobileNavMenuOpen = false;
            app.adminNavMenuOpen = false;
            if (safeAction === 'board') return app.openBoardPage();
            if (safeAction === 'situation-board') return app.openSituationBoard();
            if (safeAction === 'home') return app.backToDashboard();
            if (safeAction === 'master-permissions') return app.renderMasterPermissionPage();
            if (safeAction === 'admin-ops') {
                app.renderMasterPermissionPage();
                return app.setMasterPermissionTab('ops');
            }
            if (safeAction === 'user-management') return app.renderUserManagement();
            if (safeAction === 'password') return document.getElementById('pw-modal')?.classList.remove('hidden');
            if (safeAction === 'logout') return app.logout();
        },
        handleAdminNavAction: (action) => {
            const safeAction = String(action || '').trim();
            if (!safeAction) return;
            app.adminNavMenuOpen = false;
            if (safeAction === 'master-permissions') return app.renderMasterPermissionPage();
            if (safeAction === 'admin-ops') {
                app.renderMasterPermissionPage();
                return app.setMasterPermissionTab('ops');
            }
            if (safeAction === 'user-management') return app.renderUserManagement();
        },
        closeTopNavMenus: (silent = false) => {
            app.mobileNavMenuOpen = false;
            app.adminNavMenuOpen = false;
            if (!silent) app.renderNav();
        },
        toggleAdminNavMenu: () => {
            app.adminNavMenuOpen = !app.adminNavMenuOpen;
            app.mobileNavMenuOpen = false;
            app.renderNav();
        },
        toggleMobileNavMenu: () => {
            app.mobileNavMenuOpen = !app.mobileNavMenuOpen;
            app.adminNavMenuOpen = false;
            app.renderNav();
        },

        // [수정] recalcUsedHours: 승인 대기 시간도 계산하도록 수정
        recalcUsedHours: () => {
            if (!appData.meta.requestsLoaded) return;
            appData.users.forEach(u => { u.usedHours = 0; u.pendingHours = 0; });
            appData.requests.forEach(r => {
                const u = app.getRequestOwnerUser(r);
                if (u) { 
                    if (app.isSpecialLeaveRequest(r)) return;
                    if (app.isWorkReportRequest(r)) return;
                    if (['approved', 'cancel_requested'].includes(r.status)) {
                        u.usedHours += Number(r.hours); 
                    } else if (r.status === 'pending') {
                        u.pendingHours += Number(r.hours);
                    }
                }
            });
            app.syncCurrentUserFromUsers();
        },

        tryLogin: async () => {
            const id = security.cleanInlineValue(document.getElementById('login-id').value);
            const pw = document.getElementById('login-pw').value;
            if(!id || !pw) return alert("아이디/비밀번호를 입력하세요.");
            db.clearSessionToken();
            app.setLoadingOverlayState('로그인 중...', { subtext: '(최대 15초)' });
            try {
                db.getClientIp().catch(() => '');
                const maxLoginRetry = 2; // 총 3회 시도
                const loginBaseDelayMs = 300;
                let json = null;
                let lastError = null;
                let useLegacyLogin = false;
                let usedBundledBoot = false;
                let loadedAllData = false;

                for (let attempt = 0; attempt <= maxLoginRetry; attempt++) {
                    try {
                        const loginAction = useLegacyLogin ? 'login' : 'login_boot';
                        json = await db.fetchJsonWithTimeout(GOOGLE_SCRIPT_URL, {
                            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                            body: JSON.stringify({ action: loginAction, id: id, password: pw })
                        });

                        if (
                            !useLegacyLogin &&
                            json &&
                            json.result === 'error' &&
                            String(json.message || '').includes('지원하지 않는 action')
                        ) {
                            useLegacyLogin = true;
                            attempt -= 1;
                            continue;
                        }

                        const canRetry = db.isRetryableError(json) && attempt < maxLoginRetry;
                        if (!canRetry) break;

                        const jitterMs = Math.floor(Math.random() * 301) + 100; // 100~400ms 무작위 지연
                        const waitMs = loginBaseDelayMs * Math.pow(2, attempt) + jitterMs;
                        app.setLoadingOverlayState('로그인 중...', { subtext: '(최대 15초)' });
                        await db.waitRetry(waitMs);
                    } catch (e) {
                        lastError = e;
                        if (attempt >= maxLoginRetry) throw e;
                        const jitterMs = Math.floor(Math.random() * 301) + 100; // 100~400ms 무작위 지연
                        const waitMs = loginBaseDelayMs * Math.pow(2, attempt) + jitterMs;
                        app.setLoadingOverlayState('로그인 중...', { subtext: '(최대 15초)' });
                        await db.waitRetry(waitMs);
                    }
                }

                if (!json && lastError) throw lastError;
                if (json.result === 'success') {
                    const sessionToken = security.cleanInlineValue(json.sessionToken || '');
                    if (!sessionToken) throw new Error('SESSION_REQUIRED');
                    db.setSessionToken(sessionToken);
                    app.currentUser = security.sanitizeUser(json.user || {});
                    delete app.currentUser.password;
                    appData.users = [];
                    appData.requests = [];
                    appData.boardPosts = [];
                    appData.holidays = {};
                    appData.specialLeaveTypes = [];
                    appData.userSpecialLeaves = [];
                    appData.mailRoutes = [];
                    app.currentView = 'dashboard';
                    app.boardCategoryFilter = 'all';
                    app.boardSearchText = '';
                    app.boardEditingId = null;
                    app.selectedBoardId = null;
                    appData.meta.requestsLoaded = false;
                    appData.meta.boardPostsLoaded = false;
                    appData.meta.situationBoardLoaded = false;
                    app.calendarRenderCache = null;
                    app.unloadLogged = false;
                    app.markActivity({ force: true });
                    app.startIdleWatch();
                    app.setLoadingOverlayState('로그인 완료', { subtext: '(최대 15초)' });
                    await db.waitRetry(120);

                    const bundledData = (json.data && typeof json.data === 'object') ? json.data : null;
                    if (bundledData) {
                        app.setLoadingOverlayState('데이터 로드중...\n잠시만 기다려 주세요.', { subtext: '(최대 15초)' });
                        db.applyLoadData(bundledData, { users: true, requests: false, boardPosts: false, holidays: true });
                        const meta = (json.meta && typeof json.meta === 'object') ? json.meta : {};
                        appData.meta.scopedLoadSupported = !!meta.scopedLoad;
                        appData.meta.lastLoadScope = String(meta.scope || 'boot');
                        usedBundledBoot = true;
                        app.syncCurrentUserFromUsers();
                    }
                    if (!usedBundledBoot) {
                        app.setLoadingOverlayState('데이터 로드중...\n잠시만 기다려 주세요.', { subtext: '(최대 15초)' });
                        const bootResult = await db.loadBoot();
                        if (!bootResult.ok) {
                            if (bootResult.error) throw new Error(bootResult.error);
                            const fullResult = await db.load();
                            if (!fullResult.ok && fullResult.error) throw new Error(fullResult.error);
                            if (!fullResult.ok) throw new Error('FULL_LOAD_FAILED');
                            loadedAllData = true;
                        }
                        if (!(bootResult.ok && bootResult.scopedLoadSupported) && !loadedAllData) {
                            const fullResult = await db.load();
                            if (!fullResult.ok && fullResult.error) throw new Error(fullResult.error);
                            if (!fullResult.ok) throw new Error('FULL_LOAD_FAILED');
                            loadedAllData = true;
                        }
                    }

                    if (appData.meta.scopedLoadSupported && !loadedAllData) {
                        app.setLoadingOverlayState('데이터 로드중...\n잠시만 기다려 주세요.', { subtext: '(최대 15초)' });
                        const deferredResult = await db.loadDeferred();
                        if (!deferredResult.ok) {
                            if (deferredResult.error) throw new Error(deferredResult.error);
                            const fullResult = await db.load();
                            if (!fullResult.ok && fullResult.error) throw new Error(fullResult.error);
                            if (!fullResult.ok) throw new Error('FULL_LOAD_FAILED');
                        }
                    }
                    if (!appData.meta.requestsLoaded) {
                        app.setLoadingOverlayState('데이터 로드중...\n잠시만 기다려 주세요.', { subtext: '(최대 15초)' });
                        const fullResult = await db.load();
                        if (!fullResult.ok && fullResult.error) throw new Error(fullResult.error);
                        if (!fullResult.ok) throw new Error('FULL_LOAD_FAILED');
                    }
                    app.syncCurrentUserFromUsers();
                    app.recalcUsedHours();
                    app.renderNav();
                    app.refreshDashboard();
                } else {
                    const rawMessage = String((json && json.message) || '');
                    let loginMessage = db.getApiErrorMessage(rawMessage, "아이디/비밀번호 확인");
                    if (rawMessage === 'LOGIN_INVALID') {
                        const failCount = Number(json.failCount || 0);
                        const failLimit = Number(json.failLimit || 5);
                        if (failCount > 0 && failLimit > 0) {
                            loginMessage = `아이디 또는 비밀번호가 올바르지 않습니다. (${failCount}/${failLimit})`;
                        } else {
                            loginMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';
                        }
                    } else if (rawMessage === 'LOGIN_BLOCKED') {
                        const retryAfterSec = Math.max(0, Number(json.retryAfterSec || 0));
                        const remainMinutes = Math.max(1, Math.ceil(retryAfterSec / 60));
                        loginMessage = `비밀번호를 5회 잘못 입력해 로그인할 수 없습니다. 약 ${remainMinutes}분 후 다시 시도해 주세요.`;
                    }
                    alert(loginMessage);
                }
            } catch(e) { console.error(e); alert(db.getApiErrorMessage((e && e.message) || '', db.getScriptErrorMessage ? db.getScriptErrorMessage(e) : "서버 통신 오류")); } finally { app.hideLoadingOverlay(); }
        },

        logout: async (reason = 'manual') => {
            const isManual = reason === 'manual';
            if (isManual && !confirm('로그아웃 하시겠습니까?')) return;

            const userSnapshot = app.currentUser
                ? { id: app.currentUser.id, name: app.currentUser.name }
                : null;
            const hasSessionToken = !!db.getSessionToken();
            if (hasSessionToken) {
                try {
                    await db.logoutSession(isManual ? 'manual' : 'idle_timeout');
                } catch (e) {
                    console.warn('logout session skip', e);
                }
            }
            app.unloadLogged = true;
            app.stopIdleWatch();
            app.clearSessionState();
            db.clearSessionToken();
            app.currentUser = null;
            app.currentView = 'dashboard';
            app.renderNav();
            app.renderLogin();
            if (!isManual) alert('입력이 10분 이상 없어 자동 로그아웃되었습니다.');

            if (userSnapshot && !hasSessionToken) {
                const logPayload = {
                    userId: userSnapshot.id,
                    userName: userSnapshot.name,
                    logType: 'Logout',
                    detail: isManual ? 'manual' : 'idle_timeout'
                };
                const sentByBeacon = db.logAccessBeacon(logPayload);
                if (!sentByBeacon) {
                    db.logAccess(logPayload).catch((e) => console.warn('logout log skip', e));
                }
            }
        },

        changePassword: async () => {
            const currentPw = document.getElementById('pw-current').value.trim();
            const newPw = document.getElementById('pw-new').value.trim();
            const cfmPw = document.getElementById('pw-confirm').value.trim();

            if (!app.currentUser) {
                return alert('로그인이 필요합니다.');
            }
            if(!currentPw) {
                return alert('현재 비밀번호를 입력하세요.');
            }
            if(!newPw || newPw !== cfmPw) {
                return alert('새 비밀번호가 일치하지 않거나 비어있습니다.');
            }
            if (newPw.length < 4) {
                return alert('비밀번호는 4자 이상으로 입력하세요.');
            }

            try {
                document.getElementById('loading-text').innerText = '비밀번호 저장 중...';
                document.getElementById('loading-overlay').style.display = 'flex';
                const json = await db.postJsonWithRetry(
                    { action: 'change_password', currentPassword: currentPw, newPassword: newPw, actor: db.getActor() },
                    { retries: 6, baseDelayMs: 250, maxRetryWaitMs: 5000 }
                );
                if (!json || json.result !== 'success') {
                    const msg = String((json && json.message) || '');
                    if (msg.includes('지원하지 않는 action') || msg.toLowerCase().includes('unsupported')) {
                        throw new Error('서버에 비밀번호 변경 기능이 아직 배포되지 않았습니다.');
                    }
                    throw new Error(db.getApiErrorMessage(msg, '비밀번호 저장 실패'));
                }

                document.getElementById('pw-current').value = '';
                document.getElementById('pw-new').value = '';
                document.getElementById('pw-confirm').value = '';
                await app.logUserAction('PasswordChange', 'self_password_changed');
                alert('변경되었습니다.');
                document.getElementById('pw-modal').classList.add('hidden');
            } catch (e) {
                console.error(e);
                alert('저장 실패: ' + (e.message || '서버 상태를 확인하세요.'));
            } finally {
                document.getElementById('loading-overlay').style.display = 'none';
            }
        },

        ensureBoardPostsLoaded: async () => {
            if (appData.meta.boardPostsLoaded) return true;
            try {
                const result = await db.loadBoardPosts();
                return !!(result && result.ok);
            } catch (e) {
                console.error(e);
                alert('공지사항 데이터 로드 실패: ' + (e.message || '서버 상태를 확인하세요.'));
                return false;
            }
        },

        openBoardPage: async () => {
            if (!app.isBoardFeatureEnabled()) {
                alert('공지사항 기능이 꺼져 있습니다.');
                return;
            }
            const loaded = await app.ensureBoardPostsLoaded();
            if (!loaded) return;
            app.currentView = 'board';
            app.currentPage = 1;
            app.renderNav();
            app.renderBoardPage();
        },

        backToDashboard: () => {
            app.currentView = 'dashboard';
            app.currentPage = 1;
            app.renderNav();
            app.refreshDashboard();
        },

        getBoardPostsForView: () => {
            const items = (appData.boardPosts || [])
                .map((post) => security.sanitizeBoardPost(post))
                .filter((post) => post.status !== 'deleted');

            let filtered = items;
            if (app.boardCategoryFilter !== 'all') {
                filtered = filtered.filter((post) => post.category === app.boardCategoryFilter);
            }
            const q = String(app.boardSearchText || '').trim().toLowerCase();
            if (q) {
                filtered = filtered.filter((post) => {
                    const hay = `${post.title} ${post.content} ${post.authorName}`.toLowerCase();
                    return hay.includes(q);
                });
            }
            filtered.sort((a, b) => {
                if (a.isNotice !== b.isNotice) return a.isNotice ? -1 : 1;
                return moment(b.updatedAt).valueOf() - moment(a.updatedAt).valueOf();
            });
            return filtered;
        },

        canEditBoardPost: (post) => {
            if (!app.currentUser || !post) return false;
            if (app.currentUser.role === 'master') return true;
            return String(post.authorId) === String(app.currentUser.id);
        },

        openBoardWriteForm: (postId = '') => {
            const box = document.getElementById('board-write-box');
            if (!box) return;
            app.boardEditingId = postId || null;
            const target = appData.boardPosts.find((post) => String(post.id) === String(postId));
            if (target && !app.canEditBoardPost(target)) {
                alert('이 글은 수정 권한이 없습니다.');
                return;
            }
            const titleEl = document.getElementById('board-title');
            const categoryEl = document.getElementById('board-category');
            const contentEl = document.getElementById('board-content');
            const noticeEl = document.getElementById('board-notice');
            const titleTextEl = document.getElementById('board-write-title');

            if (titleTextEl) titleTextEl.innerText = target ? '게시글 수정' : '게시글 작성';
            if (titleEl) titleEl.value = target ? target.title : '';
            if (categoryEl) categoryEl.value = target ? target.category : '일반';
            if (contentEl) contentEl.value = target ? target.content : '';
            if (noticeEl) noticeEl.checked = target ? !!target.isNotice : false;
            box.classList.remove('hidden');
        },

        closeBoardWriteForm: () => {
            app.boardEditingId = null;
            const box = document.getElementById('board-write-box');
            if (box) box.classList.add('hidden');
        },

        saveBoardPost: async () => {
            if (!app.currentUser) return;
            const titleEl = document.getElementById('board-title');
            const categoryEl = document.getElementById('board-category');
            const contentEl = document.getElementById('board-content');
            const noticeEl = document.getElementById('board-notice');
            if (!titleEl || !categoryEl || !contentEl || !noticeEl) return;

            const title = security.cleanText(titleEl.value);
            const content = security.cleanMultiline(contentEl.value);
            const category = security.cleanText(categoryEl.value);
            const isNotice = noticeEl.checked && app.currentUser.role === 'master';
            if (!title || !content) return alert('제목과 내용을 입력하세요.');

            const oldPost = appData.boardPosts.find((post) => String(post.id) === String(app.boardEditingId));
            if (oldPost && !app.canEditBoardPost(oldPost)) return alert('이 글은 수정 권한이 없습니다.');

            const now = moment().format('YYYY-MM-DD HH:mm:ss');
            const payload = {
                id: oldPost ? oldPost.id : String(Date.now()),
                title,
                content,
                category,
                authorId: oldPost ? oldPost.authorId : app.currentUser.id,
                authorName: oldPost ? oldPost.authorName : app.currentUser.name,
                authorDept: oldPost ? oldPost.authorDept : app.currentUser.dept,
                isNotice: oldPost ? (app.currentUser.role === 'master' ? isNotice : !!oldPost.isNotice) : isNotice,
                status: 'active',
                viewCount: oldPost ? (Number(oldPost.viewCount) || 0) : 0,
                createdAt: oldPost ? oldPost.createdAt : now,
                updatedAt: now
            };

            try {
                await db.upsertBoardPost(payload);
                await app.logUserAction(oldPost ? 'BoardPostUpdate' : 'BoardPostCreate', `${payload.id}:${payload.title}`);
                app.selectedBoardId = payload.id;
                app.closeBoardWriteForm();
                app.renderBoardPage();
            } catch (e) {
                alert(e.message || '게시글 저장 중 오류가 발생했습니다.');
            }
        },

        deleteBoardPost: async (postId) => {
            const safeId = security.cleanInlineValue(postId);
            const post = appData.boardPosts.find((item) => String(item.id) === String(safeId));
            if (!post) return;
            if (!app.canEditBoardPost(post)) return alert('이 글은 삭제 권한이 없습니다.');
            if (!confirm('이 글을 삭제할까요?')) return;

            try {
                await db.deleteBoardPost(safeId);
                await app.logUserAction('BoardPostDelete', safeId);
                if (String(app.selectedBoardId) === String(safeId)) app.selectedBoardId = null;
                app.renderBoardPage();
            } catch (e) {
                alert(e.message || '게시글 삭제 중 오류가 발생했습니다.');
            }
        },

        selectBoardPost: (postId) => {
            app.selectedBoardId = security.cleanInlineValue(postId);
            const target = appData.boardPosts.find((item) => String(item.id) === String(app.selectedBoardId));
            if (target) target.viewCount = Number(target.viewCount || 0) + 1;
            app.renderBoardPage();
        },

        setBoardCategoryFilter: (value) => {
            app.boardCategoryFilter = security.cleanText(value || 'all') || 'all';
            app.currentPage = 1;
            app.renderBoardPage();
        },

        setBoardSearch: (value) => {
            app.boardSearchText = security.cleanText(value || '');
            app.currentPage = 1;
            app.renderBoardPage();
        },

        renderBoardPage: () => {
            if (!app.currentUser) return app.renderLogin();
            if (!app.isBoardFeatureEnabled()) {
                app.currentView = 'dashboard';
                app.renderNav();
                return app.refreshDashboard();
            }
            const list = app.getBoardPostsForView();
            const totalItems = list.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
            if (app.currentPage > totalPages) app.currentPage = totalPages;
            const start = (app.currentPage - 1) * ITEMS_PER_PAGE;
            const paged = list.slice(start, start + ITEMS_PER_PAGE);
            let selected = list.find((post) => String(post.id) === String(app.selectedBoardId)) || null;
            if (!selected && list.length > 0) {
                selected = list[0];
                app.selectedBoardId = selected.id;
            }

            const categoryOptions = ['all', '공지', '일반', '업무공유', '질문']
                .map((c) => `<option value="${c}" ${app.boardCategoryFilter===c ? 'selected' : ''}>${c==='all' ? '전체' : c}</option>`)
                .join('');

            document.getElementById('app-container').innerHTML = `
            <div class="w-full max-w-7xl mx-auto px-4 fade-in pt-8 pb-12">
                <div class="bg-white p-6 rounded-2xl shadow-sm border mb-6">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 class="text-2xl font-bold">사내 공지사항</h2>
                            <p class="text-sm text-gray-500 mt-1">공지, 업무 공유, 질문을 한 곳에서 관리합니다.</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="app.openBoardWriteForm()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold">글쓰기</button>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">분류</label><select class="w-full bg-gray-50 border p-2.5 rounded-lg" onchange="app.setBoardCategoryFilter(this.value)">${categoryOptions}</select></div>
                        <div class="md:col-span-2"><label class="block text-xs font-bold text-gray-500 mb-1">검색</label><input value="${app.boardSearchText}" oninput="app.setBoardSearch(this.value)" class="w-full bg-gray-50 border p-2.5 rounded-lg" placeholder="제목/내용/작성자"></div>
                    </div>
                </div>

                <div id="board-write-box" class="hidden bg-white p-6 rounded-2xl shadow-sm border mb-6">
                    <h3 id="board-write-title" class="text-lg font-bold mb-4">게시글 작성</h3>
                    <div class="space-y-3">
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">제목</label><input id="board-title" class="w-full bg-gray-50 border p-2.5 rounded-lg" placeholder="제목"></div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><label class="block text-xs font-bold text-gray-500 mb-1">분류</label><select id="board-category" class="w-full bg-gray-50 border p-2.5 rounded-lg"><option value="일반">일반</option><option value="업무공유">업무공유</option><option value="질문">질문</option><option value="공지">공지</option></select></div>
                            <div class="flex items-end">${app.currentUser.role === 'master' ? '<label class="inline-flex items-center gap-2 text-sm"><input id="board-notice" type="checkbox"> 공지로 고정</label>' : '<input id="board-notice" type="checkbox" class="hidden">'} </div>
                        </div>
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">내용</label><textarea id="board-content" rows="6" class="w-full bg-gray-50 border p-2.5 rounded-lg" placeholder="내용"></textarea></div>
                        <div class="flex justify-end gap-2">
                            <button onclick="app.closeBoardWriteForm()" class="bg-gray-100 px-5 py-2.5 rounded-lg font-bold">취소</button>
                            <button onclick="app.saveBoardPost()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold">저장</button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden">
                        <div class="p-4 border-b font-bold">글 목록 (${totalItems})</div>
                        <div class="max-h-[620px] overflow-y-auto">
                            ${paged.length === 0 ? '<div class="p-6 text-center text-gray-400">게시글이 없습니다.</div>' : paged.map((post) => `
                                <button onclick="app.selectBoardPost('${post.id}')" class="w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${String(app.selectedBoardId)===String(post.id) ? 'bg-indigo-50' : ''}">
                                    <div class="flex items-center gap-2 mb-1">
                                        ${post.isNotice ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold">공지</span>' : ''}
                                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">${post.category}</span>
                                    </div>
                                    <div class="font-bold text-sm text-gray-800 truncate">${post.title}</div>
                                    <div class="text-xs text-gray-500 mt-1">${post.authorName} · ${moment(post.updatedAt).format('YYYY-MM-DD HH:mm')}</div>
                                </button>
                            `).join('')}
                        </div>
                        <div class="p-3 border-t flex items-center justify-center gap-2">
                            <button ${app.currentPage === 1 ? 'disabled' : ''} onclick="app.changePage(${app.currentPage - 1})" class="px-3 py-1 rounded border ${app.currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">이전</button>
                            <span class="text-sm text-gray-600">${app.currentPage} / ${totalPages}</span>
                            <button ${app.currentPage === totalPages ? 'disabled' : ''} onclick="app.changePage(${app.currentPage + 1})" class="px-3 py-1 rounded border ${app.currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">다음</button>
                        </div>
                    </div>

                    <div class="lg:col-span-3 bg-white rounded-2xl shadow-sm border p-6">
                        ${selected ? `
                            <div class="flex flex-wrap justify-between gap-3 items-start border-b pb-4 mb-4">
                                <div>
                                    <div class="flex items-center gap-2 mb-2">
                                        ${selected.isNotice ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold">공지</span>' : ''}
                                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">${selected.category}</span>
                                    </div>
                                    <h3 class="text-xl font-bold">${selected.title}</h3>
                                    <p class="text-xs text-gray-500 mt-2">${selected.authorName} (${selected.authorDept || '-'}) · ${moment(selected.updatedAt).format('YYYY-MM-DD HH:mm')} · 조회 ${selected.viewCount || 0}</p>
                                </div>
                                <div class="flex items-center gap-2">
                                    ${app.canEditBoardPost(selected) ? `<button onclick="app.openBoardWriteForm('${selected.id}')" class="text-sm px-3 py-1.5 rounded border border-indigo-200 text-indigo-600 font-bold">수정</button><button onclick="app.deleteBoardPost('${selected.id}')" class="text-sm px-3 py-1.5 rounded border border-red-200 text-red-600 font-bold">삭제</button>` : ''}
                                </div>
                            </div>
                            <div class="text-sm leading-7 whitespace-pre-wrap text-gray-700">${selected.content}</div>
                        ` : '<div class="text-center text-gray-400 py-20">왼쪽에서 글을 선택하세요.</div>'}
                    </div>
                </div>
            </div>${app.getModal()}`;
        },

        refreshDashboard: () => {
            app.setLoginScreenLayout(false);
            if(!app.currentUser) return app.renderLogin();
            if (app.currentView === 'board') return app.renderBoardPage();
            if (app.currentView === 'situation-board') return app.renderSituationBoard();
            app.currentView = 'dashboard';
            app.renderNav();
            app.markActivity({ force: true });
            app.recalcUsedHours();
            app.ensureCalendarMode();
            try {
                const hasMemberStatusPermission = app.getCurrentPermissions().memberStatusScope !== 'none';
                if(
                    app.currentUser.role === 'master' ||
                    app.currentUser.role === 'ceo' ||
                    app.hasApprovalPermission() ||
                    hasMemberStatusPermission
                ) app.renderManagerDashboard();
                else app.renderEmployeeDashboard();
            } catch (err) {
                console.error("Dashboard Render Error: ", err);
                app.renderEmployeeDashboard();
            }
        },

        getModal: () => {
            const timeOpts = makeTimeOptions();
            const outDurationOpts = makeDurationOptions(10);
            const reportDurationOpts = `<option value="0" selected>0시간</option>${makeDurationOptions(10)}`;
            let reportStartOpts = '';
            for (let i = 7; i <= 22; i++) {
                const val = String(i).padStart(2, '0');
                reportStartOpts += `<option value="${i}">${val}:00</option>`;
            }
            return `<div id="req-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden flex justify-center items-center z-50 fade-in">
                <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transform scale-100">
                    <div class="flex justify-between items-center mb-6 border-b pb-2">
                        <h3 class="font-bold text-xl text-gray-800" id="req-modal-title">연차 신청</h3>
                        <div class="flex items-center">
                            <label class="inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="allow-past" class="sr-only peer" onchange="app.togglePastDates()">
                                <div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                <span class="ms-2 text-xs font-medium text-gray-500">지난 날짜 선택</span>
                            </label>
                        </div>
                    </div>
                    <div class="space-y-4 mb-6">
                        <div id="div-proxy-user" class="hidden">
                            <label class="block text-xs font-bold text-gray-500 mb-1">대상 직원</label>
                            <select id="req-target-user" class="w-full bg-gray-50 border p-2.5 rounded-lg" onchange="app.handleRequestTargetUserChange(this.value)"></select>
                            <p class="text-[10px] text-gray-500 mt-1">관리자 대리 등록/수정 모드입니다.</p>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">종류</label>
                            <select id="req-type" class="w-full bg-gray-50 border p-2.5 rounded-lg" onchange="toggleInputs()">${app.getRequestTypeOptionsHtml('연차')}</select>
                        </div>
                        <div id="div-special-mode" class="hidden">
                            <label class="block text-xs font-bold text-gray-500 mb-1">사용 방식</label>
                            <select id="req-special-mode" class="w-full bg-gray-50 border p-2.5 rounded-lg" onchange="toggleInputs()">${app.getSpecialModeOptionsHtml('연차')}</select>
                        </div>
                        <div id="div-date-range">
                            <div class="flex justify-between items-center mb-1">
                                <label class="block text-xs font-bold text-gray-500">날짜</label>
                                <label class="inline-flex items-center cursor-pointer">
                                    <span class="mr-2 text-xs text-gray-500">기간 설정</span>
                                    <input type="checkbox" id="is-multi-day" class="sr-only peer" onchange="toggleInputs()">
                                    <div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div class="flex gap-2">
                                <input type="date" id="req-start-date" onchange="app.checkHoliday(this)" class="w-full bg-gray-50 border p-2.5 rounded-lg">
                                <input type="date" id="req-end-date" onchange="app.checkHoliday(this)" class="w-full bg-gray-50 border p-2.5 rounded-lg">
                            </div>
                            <p id="date-status" class="text-[10px] font-bold mt-1 min-h-[15px]"></p>
                        </div>
                        <div id="div-timeoff" class="hidden bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                            <div class="flex gap-2 mb-2">
                                <div class="w-1/2">
                                    <label class="text-xs font-bold text-indigo-700">사용 시간</label>
                                    <select id="req-duration-timeoff" class="w-full border p-1 rounded mt-1"><option value="1">1시간</option><option value="2">2시간</option><option value="3">3시간</option><option value="4">4시간</option><option value="5">5시간</option><option value="6">6시간</option><option value="7">7시간</option></select>
                                </div>
                                <div class="w-1/2">
                                    <label class="text-xs font-bold text-indigo-700">퇴근 시간</label>
                                    <select id="req-end-time-timeoff" class="w-full border p-1 rounded mt-1 bg-gray-100 text-gray-500" disabled><option value="18">18:00</option><option value="17">17:00</option><option value="16">16:00</option></select>
                                </div>
                            </div>
                            <p class="text-[10px] text-indigo-600">* 대상 직원의 현재 근무시간 기준 퇴근 시간이 자동 적용됩니다.</p>
                        </div>
                        <div id="div-out" class="hidden bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                            <div class="flex gap-2 mb-2">
                                <div class="w-1/2">
                                    <label class="text-xs font-bold text-emerald-700">사용 시간</label>
                                    <select id="req-duration-out" class="w-full border p-1 rounded mt-1" onchange="updateOutPreview()">${outDurationOpts}</select>
                                </div>
                                <div class="w-1/2">
                                    <label class="text-xs font-bold text-emerald-700">시작 시간</label>
                                    <select id="req-start-time-out" class="w-full border p-1 rounded mt-1" onchange="updateOutPreview()">${timeOpts}</select>
                                </div>
                            </div>
                            <p id="req-out-preview" class="text-[10px] text-emerald-700 min-h-[15px]"></p>
                            <p class="text-[10px] text-emerald-600">* 시작 시간을 기준으로 자동 종료 계산</p>
                        </div>
                        <div id="div-report" class="hidden bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                            <div id="req-report-time-grid" class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="text-xs font-bold text-slate-700">시작 시간</label>
                                    <select id="req-report-start-time" class="w-full border p-2 rounded mt-1" onchange="app.updateReportPreview()">${reportStartOpts}</select>
                                </div>
                                <div>
                                    <label class="text-xs font-bold text-slate-700">보고 시간</label>
                                    <select id="req-report-duration" class="w-full border p-2 rounded mt-1" onchange="app.updateReportPreview()">${reportDurationOpts}</select>
                                </div>
                            </div>
                            <p id="req-report-preview" class="text-[11px] text-slate-600 min-h-[18px]"></p>
                            <div id="req-report-weekly-limit" class="hidden"></div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 mb-1">사유</label>
                                <input type="text" id="req-report-reason" class="w-full bg-white border p-2.5 rounded-lg" placeholder="예: 긴급 일정 대응, 자료 보완">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 mb-1">업무내용</label>
                                <textarea id="req-report-work-detail" class="w-full bg-white border p-2.5 rounded-lg min-h-[90px]" placeholder="실제 수행한 작업 내용을 입력하세요."></textarea>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 mb-1">요청 부서</label>
                                <input type="text" id="req-report-dept" class="w-full bg-white border p-2.5 rounded-lg" placeholder="예: 연구기획">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 mb-1">비고</label>
                                <textarea id="req-report-note" class="w-full bg-white border p-2.5 rounded-lg min-h-[72px]" placeholder="상세 사유, 참고사항 등을 입력하세요."></textarea>
                            </div>
                        </div>
                        <div id="div-reason-select">
                            <label class="block text-xs font-bold text-gray-500 mb-1">사유</label>
                            <select id="req-reason" class="w-full bg-gray-50 border p-2.5 rounded-lg"><option value="Refresh">Refresh</option><option value="병원(본인)">병원(본인)</option><option value="병원(가족)">병원(가족)</option><option value="가사">가사</option><option value="은행">은행</option><option value="여행">여행</option><option value="건강검진(유급)">건강검진(유급)</option><option value="건강검진(무급)">건강검진(무급)</option></select>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2">
                        <button onclick="document.getElementById('req-modal').classList.add('hidden')" class="bg-gray-100 px-5 py-2.5 rounded-lg font-bold">취소</button>
                        <button onclick="app.submitRequest()" id="req-modal-btn" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg">신청하기</button>
                    </div>
                </div>
            </div>
            <div id="work-report-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden flex justify-center items-center z-50 fade-in" onclick="if(event.target===this) app.closeWorkReportModal()">
                <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transform scale-100">
                    <div class="flex justify-between items-center mb-6 border-b pb-2">
                        <h3 class="font-bold text-xl text-gray-800">잔업/특근 신청</h3>
                        <div class="flex items-center">
                            <label class="inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="work-report-allow-past" class="sr-only peer" onchange="app.toggleWorkReportPastDates()">
                                <div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                <span class="ms-2 text-xs font-medium text-gray-500">지난 날짜 선택</span>
                            </label>
                        </div>
                    </div>
                    <div class="space-y-4 mb-6">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">구분</label>
                            <select id="work-report-type" class="w-full bg-gray-50 border p-2.5 rounded-lg" onchange="app.syncWorkReportTypeDefaults()"></select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">날짜</label>
                            <input type="date" id="work-report-date" onchange="app.syncWorkReportTypeDefaults()" class="w-full bg-gray-50 border p-2.5 rounded-lg">
                            <p id="work-report-date-status" class="text-[10px] font-bold mt-1 min-h-[15px]"></p>
                        </div>
                        <div id="work-report-time-fields" class="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div class="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                    <label class="text-xs font-bold text-slate-700">시작 시간</label>
                                    <select id="work-report-start-time" class="w-full border p-2 rounded mt-1" onchange="app.updateWorkReportPreview()">${reportStartOpts}</select>
                                </div>
                                <div>
                                    <label class="text-xs font-bold text-slate-700">보고 시간</label>
                                    <select id="work-report-duration" class="w-full border p-2 rounded mt-1" onchange="app.updateWorkReportPreview()">${reportDurationOpts}</select>
                                </div>
                            </div>
                            <p id="work-report-preview" class="text-[11px] text-slate-600 min-h-[18px]"></p>
                            <p class="text-[10px] text-slate-500">잔업/특근은 먼저 기록하고, 정산월에 승인 요청을 보냅니다.</p>
                        </div>
                        <div id="work-report-weekly-limit" class="hidden"></div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">사유</label>
                            <input type="text" id="work-report-reason" class="w-full bg-gray-50 border p-2.5 rounded-lg" placeholder="예: 긴급 일정 대응, 자료 보완">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">업무내용</label>
                            <textarea id="work-report-work-detail" class="w-full bg-gray-50 border p-2.5 rounded-lg min-h-[90px]" placeholder="실제 수행한 작업 내용을 입력하세요."></textarea>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">요청 부서</label>
                            <input type="text" id="work-report-dept" class="w-full bg-gray-50 border p-2.5 rounded-lg" placeholder="예: 연구기획">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">비고</label>
                            <textarea id="work-report-note" class="w-full bg-gray-50 border p-2.5 rounded-lg min-h-[72px]" placeholder="상세 사유, 참고사항 등을 입력하세요."></textarea>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2">
                        <button onclick="app.closeWorkReportModal()" class="bg-gray-100 px-5 py-2.5 rounded-lg font-bold">취소</button>
                        <button onclick="app.submitWorkReport()" class="bg-slate-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg">보고 저장</button>
                    </div>
                </div>
            </div>
            <div id="pw-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden flex justify-center items-center z-50 fade-in"><div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"><h3 class="font-bold text-xl mb-6 border-b pb-2">비밀번호 변경</h3>
            <div class="flex items-center justify-end mb-2">
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" onchange="app.togglePwVisibility(this)" class="sr-only peer">
                    <div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    <span class="ms-2 text-xs font-medium text-gray-500">비밀번호 보기</span>
                </label>
            </div>
            <div class="space-y-4 mb-6">
                <div><label class="block text-xs font-bold text-gray-500 mb-1">현재 비밀번호</label><input type="password" id="pw-current" class="w-full bg-gray-50 border p-3 rounded-lg" placeholder="현재 비밀번호 입력"></div>
                <div><label class="block text-xs font-bold text-gray-500 mb-1">변경할 비밀번호</label><input type="password" id="pw-new" class="w-full bg-gray-50 border p-3 rounded-lg" placeholder="변경할 비밀번호 입력"></div>
                <div><label class="block text-xs font-bold text-gray-500 mb-1">변경할 비밀번호 재확인</label><input type="password" id="pw-confirm" class="w-full bg-gray-50 border p-3 rounded-lg" placeholder="변경할 비밀번호 다시 입력"></div>
            </div>
            <div class="flex justify-end gap-2"><button onclick="document.getElementById('pw-modal').classList.add('hidden')" class="bg-gray-100 px-5 py-2.5 rounded-lg font-bold">취소</button><button onclick="app.changePassword()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg">변경</button></div></div></div>
            <div id="member-card-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden flex justify-center items-center z-50 fade-in"><div class="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl"><div class="flex justify-between items-center mb-4 border-b pb-2"><h3 class="font-bold text-xl text-gray-800">직원 카드</h3><button onclick="app.closeMemberCard()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button></div><div id="member-card-body" class="min-h-[180px]"></div><div class="flex justify-end mt-5"><button onclick="app.closeMemberCard()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold">닫기</button></div></div></div>
            <div id="report-board-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden justify-center items-center z-50 fade-in" onclick="if(event.target===this) app.closeReportBoard()">
                <div class="bg-white rounded-2xl p-6 w-full max-w-6xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">
                    <div class="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 class="font-bold text-xl text-gray-800">월별 잔업/특근 현황</h3>
                        <button onclick="app.closeReportBoard()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                    </div>
                    <div id="report-board-body" class="flex-1 overflow-auto"></div>
                </div>
            </div>
            <div id="report-detail-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden justify-center items-start z-[70] fade-in overflow-y-auto pt-24 pb-6" onclick="if(event.target===this) app.closeReportDetail()">
                <div class="bg-white rounded-2xl p-6 w-full max-w-[1280px] max-h-[88vh] shadow-2xl overflow-hidden flex flex-col">
                    <div class="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 class="font-bold text-xl text-gray-800">보고 상세</h3>
                        <button onclick="app.closeReportDetail()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                    </div>
                    <div id="report-detail-body" class="min-h-[180px] flex-1 min-h-0 overflow-auto pr-1 custom-scrollbar"></div>
                    <div class="flex justify-end mt-5 shrink-0">
                        <button onclick="app.closeReportDetail()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold">닫기</button>
                    </div>
                </div>
            </div>
            <div id="report-settlement-mail-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden justify-center items-center z-50 fade-in" onclick="if(event.target===this) app.closeWorkReportSettlementDraftModal()">
                <div class="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[88vh] shadow-2xl overflow-hidden flex flex-col">
                    <div class="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 class="font-bold text-xl text-gray-800">정산 메일 초안</h3>
                        <button onclick="app.closeWorkReportSettlementDraftModal()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                    </div>
                    <div class="flex-1 overflow-auto space-y-4">
                        <div class="grid grid-cols-1 gap-3">
                            <div>
                                <label class="block text-xs font-bold text-gray-500 mb-1">받는 사람</label>
                                <input id="report-settlement-mail-to" class="w-full bg-gray-50 border p-2.5 rounded-lg" readonly>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 mb-1">참조</label>
                                <input id="report-settlement-mail-cc" class="w-full bg-gray-50 border p-2.5 rounded-lg" readonly>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 mb-1">제목</label>
                                <input id="report-settlement-mail-subject" class="w-full bg-gray-50 border p-2.5 rounded-lg" readonly>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 mb-1">본문</label>
                                <textarea id="report-settlement-mail-body" class="w-full bg-gray-50 border p-3 rounded-lg min-h-[320px]" readonly></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 mt-5">
                        <button onclick="app.copyWorkReportSettlementDraft()" class="bg-gray-100 px-5 py-2.5 rounded-lg font-bold">본문 복사</button>
                        <button onclick="app.openWorkReportSettlementMailApp()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold">메일 앱 열기</button>
                    </div>
                </div>
            </div>
            <div id="mobile-calendar-detail-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden z-50 items-end" onclick="if(event.target===this) app.closeMobileCalendarDayDetail()"><div class="w-full bg-white rounded-t-3xl shadow-2xl border border-gray-200 min-h-[42vh] max-h-[80vh] overflow-hidden flex flex-col"><div class="shrink-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between"><div class="text-base font-bold text-gray-900">날짜 상세내역</div><button type="button" onclick="app.closeMobileCalendarDayDetail()" class="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 font-bold">닫기</button></div><div id="mobile-calendar-detail-body" class="flex-1 overflow-y-auto overscroll-contain pb-8"></div></div></div>`;
        },
        initModal: (presetDate = '', options = {}) => {
            app.adminRequestMode = !!options.adminMode;
            app.adminRequestEditMode = !!options.editMode;
            if (app.adminRequestMode && options.targetUserId) {
                app.adminOpsTargetUserId = security.cleanInlineValue(options.targetUserId);
            }
            app.editingId = security.cleanInlineValue(options.editId || '');
            const today = moment().format('YYYY-MM-DD');
            const defaultDate = security.normalizeDate(presetDate, today);
            const s = document.getElementById('req-start-date');
            const e = document.getElementById('req-end-date');

            document.getElementById('req-modal-title').innerText = app.adminRequestEditMode ? "관리자 대리 수정" : (app.adminRequestMode ? "관리자 대리 등록" : "연차 신청");
            document.getElementById('req-modal-btn').innerText = app.adminRequestEditMode ? "수정 완료" : (app.adminRequestMode ? "등록하기" : "신청하기");
            app.syncRequestTargetField();
            app.refreshRequestTypeOptions('연차');
            document.getElementById('req-type').value = "연차";
            const specialMode = document.getElementById('req-special-mode');
            if (specialMode) {
                specialMode.innerHTML = app.getSpecialModeOptionsHtml('연차');
                specialMode.value = '연차';
            }
            document.getElementById('req-reason').value = "Refresh";

            const toggle = document.getElementById('allow-past');
            if (toggle) toggle.checked = false;

            const multiToggle = document.getElementById('is-multi-day');
            if (multiToggle) multiToggle.checked = false;
            const reportReason = document.getElementById('req-report-reason');
            const reportDetail = document.getElementById('req-report-work-detail');
            const reportDept = document.getElementById('req-report-dept');
            const reportNote = document.getElementById('req-report-note');
            const reportDuration = document.getElementById('req-report-duration');
            const reportStart = document.getElementById('req-report-start-time');
            if (reportReason) reportReason.value = '';
            if (reportDetail) reportDetail.value = '';
            if (reportDept) reportDept.value = '';
            if (reportNote) reportNote.value = '';
            if (reportDuration) reportDuration.value = '0';
            if (reportStart) reportStart.value = '9';

            if (s && e) {
                s.min = today;
                e.min = today;
                s.value = defaultDate;
                e.value = defaultDate;
            }

            document.getElementById('date-status').innerText = "";
            toggleInputs();
            app.syncRequestTypeDefaults();
            if (s && s.value) app.checkHoliday(s);
        }
    });

    app.checkHoliday = (el) => {
        const dateStr = el.value;
        const statusEl = document.getElementById('date-status');
        if(!dateStr) return statusEl.innerText = "";
        const selection = app.getCurrentRequestSelection();
        const isSpecialDayOnly = selection.isSpecial && selection.requestMode === 'day_only';
        const allowHolidayRequest = !!selection.allowHolidayRequest;
        if (selection.baseType === '특근') {
            statusEl.innerText = '✅ 특근 보고는 주말/공휴일에도 등록할 수 있습니다.';
            statusEl.style.color = "#10b981";
            toggleInputs();
            return;
        }
        if (isSpecialDayOnly || allowHolidayRequest) {
            const modeLabel = selection.dayCountMode === 'calendar_days' ? '달력일 기준' : '영업일 기준';
            statusEl.innerText = `✅ 특별휴가는 ${modeLabel}으로 차감되며 선택한 날짜 신청이 가능합니다.`;
            statusEl.style.color = "#10b981";
            toggleInputs();
            return;
        }
        
        const isRed = holidayLogic.isRedDay(dateStr);
        const holName = holidayLogic.getHolName(dateStr);
        const isSat = holidayLogic.isSat(dateStr);

        if(isRed) {
            statusEl.innerText = `⚠️ 선택하신 날짜는 ${holName || '공휴일(일요일)'}입니다. (신청 불가)`;
            statusEl.style.color = "#ef4444";
        } else if(isSat) {
            statusEl.innerText = `ℹ️ 선택하신 날짜는 토요일입니다. (신청 불가)`;
            statusEl.style.color = "#3b82f6";
        } else {
            statusEl.innerText = "✅✅ 신청 가능한 날짜입니다.";
            statusEl.style.color = "#10b981";
        }
        toggleInputs();
    };

    function calcOutEndTime(startHour, durationHour) {
        if (!Number.isFinite(startHour) || !Number.isFinite(durationHour)) return null;
        let end = startHour;
        let remain = durationHour;
        while (remain > 0) {
            if (end !== 12) remain--;
            end++;
            if (end > 18) return null;
        }
        return end;
    }

    function formatHour(hour) {
        return `${String(hour).padStart(2, '0')}:00`;
    }

    function updateOutPreview() {
        const preview = document.getElementById('req-out-preview');
        const startEl = document.getElementById('req-start-time-out');
        const durationEl = document.getElementById('req-duration-out');
        if (!preview || !startEl || !durationEl) return;

        const s = parseInt(startEl.value, 10);
        const d = parseInt(durationEl.value, 10);
        const e = calcOutEndTime(s, d);
        if (e === null) {
            preview.innerText = '* 근무시간(18:00) 안에서 설정해주세요.';
            preview.style.color = '#dc2626';
            return;
        }
        preview.innerText = `자동 종료 시간: ${formatHour(e)} (${formatHour(s)} ~ ${formatHour(e)})`;
        preview.style.color = '#047857';
    }

        app.updateReportPreview = () => {
            const preview = document.getElementById('req-report-preview');
            const startEl = document.getElementById('req-report-start-time');
            const durationEl = document.getElementById('req-report-duration');
            const typeEl = document.getElementById('req-type');
        if (!preview || !startEl || !durationEl || !typeEl) return;
        const selectedType = security.normalizeType(typeEl.value || '잔업');
        if (selectedType === '특근') {
            preview.innerText = '특근은 하루 기준으로 기록됩니다.';
            preview.style.color = '#be123c';
            app.renderRequestReportWeeklyLimitSummary();
            return;
        }
        const startHour = parseInt(startEl.value, 10);
        const duration = parseInt(durationEl.value, 10);
        if (!Number.isFinite(startHour) || !Number.isFinite(duration) || duration < 1) {
            preview.innerText = '보고 시간을 선택하면 잔업 가능시간을 계산합니다.';
            preview.style.color = '#64748b';
            app.renderRequestReportWeeklyLimitSummary();
            return;
        }
        const endHour = startHour + duration;
        if (endHour > 24) {
            preview.innerText = '* 종료 시간이 24:00을 넘지 않게 설정해주세요.';
            preview.style.color = '#dc2626';
            app.renderRequestReportWeeklyLimitSummary();
            return;
        }
        preview.innerText = `${selectedType} 시간: ${formatHour(startHour)} ~ ${formatHour(endHour)} (${duration}시간)`;
        preview.style.color = selectedType === '특근' ? '#be123c' : '#334155';
        app.renderRequestReportWeeklyLimitSummary();
    };

    function toggleInputs() {
        const selection = app.getCurrentRequestSelection();
        const t = selection.baseType;
        const sDate = document.getElementById('req-start-date');
        const eDate = document.getElementById('req-end-date');
        const allowPast = document.getElementById('allow-past')?.checked || false;
        const isMultiDay = document.getElementById('is-multi-day');
        const reasonWrap = document.getElementById('div-reason-select');
        const reportWrap = document.getElementById('div-report');
        const reportStartEl = document.getElementById('req-report-start-time');
        const reportDurationEl = document.getElementById('req-report-duration');
        const reportTimeGridEl = document.getElementById('req-report-time-grid');
        const reportDeptEl = document.getElementById('req-report-dept');
        const requestUser = app.getRequestModalTargetUser() || app.currentUser;
        const reportType = ['잔업', '특근'].includes(t);

        if (reportType) {
            isMultiDay.checked = false;
            isMultiDay.disabled = true;
            isMultiDay.parentElement.style.opacity = '0.5';
            eDate.style.display = 'none';
            eDate.value = sDate.value;
        } else if (t === '연차') {
            isMultiDay.disabled = false;
            isMultiDay.parentElement.style.opacity = '1';
            if (isMultiDay.checked) {
                eDate.style.display = 'block';
                eDate.min = allowPast ? '' : sDate.value;
                if (!allowPast && moment(eDate.value).isBefore(sDate.value)) eDate.value = sDate.value;
            } else {
                eDate.style.display = 'none';
                eDate.value = sDate.value;
            }
        } else {
            isMultiDay.checked = false;
            isMultiDay.disabled = true;
            isMultiDay.parentElement.style.opacity = '0.5';
            eDate.style.display = 'none';
            eDate.value = sDate.value;
        }

        document.getElementById('div-timeoff').style.display = t === '시간차(퇴근)' ? 'block' : 'none';
        document.getElementById('div-out').style.display = t === '시간차(외출)' ? 'block' : 'none';
        if (reasonWrap) reasonWrap.style.display = reportType ? 'none' : 'block';
        if (reportWrap) reportWrap.style.display = reportType ? 'block' : 'none';
        if (reportType && reportStartEl) {
            if (t === '잔업') {
                const endHour = Number(app.getTimeoffEndHourForDate(requestUser, security.normalizeDate(sDate?.value, moment().format('YYYY-MM-DD'))));
                reportStartEl.value = String(Number.isFinite(endHour) ? endHour : 18);
                reportStartEl.disabled = true;
                reportStartEl.classList.add('bg-gray-100', 'text-gray-500');
                if (reportTimeGridEl) reportTimeGridEl.classList.remove('hidden');
            } else {
                reportStartEl.disabled = false;
                reportStartEl.classList.remove('bg-gray-100', 'text-gray-500');
                reportStartEl.value = '9';
                if (reportDurationEl) reportDurationEl.value = reportDurationEl.value || '0';
                if (reportTimeGridEl) reportTimeGridEl.classList.add('hidden');
            }
        }
        if (reportType && reportDeptEl && !reportDeptEl.value) {
            reportDeptEl.value = security.cleanText((requestUser && requestUser.dept) || '');
        }
        app.syncRequestTypeDefaults();

        const titleEl = document.getElementById('req-modal-title');
        const btnEl = document.getElementById('req-modal-btn');
        if (titleEl && btnEl && !app.adminRequestMode && !app.adminRequestEditMode) {
            if (t === '잔업') {
                titleEl.innerText = '잔업 보고';
                btnEl.innerText = '보고 저장';
            } else if (t === '특근') {
                titleEl.innerText = '특근 보고';
                btnEl.innerText = '보고 저장';
            } else {
                titleEl.innerText = '연차 신청';
                btnEl.innerText = '신청하기';
            }
        }

        if (t === '시간차(외출)') updateOutPreview();
        if (reportType) app.updateReportPreview();
        else app.renderRequestReportWeeklyLimitSummary();
    }
