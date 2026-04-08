"use strict";

Object.assign(app, {
    buildSpecialLeaveTypeDraft: (item = {}, index = 0) => {
        const palette = ['rose', 'sky', 'emerald', 'amber', 'violet', 'indigo', 'slate'];
        const safeKey = security.normalizeSpecialLeaveTypeKey(item.typeKey) || `special${Date.now()}${index}${Math.random().toString(36).slice(2, 5)}`;
        const safeColor = security.normalizeSpecialLeaveColor(item.color || palette[index % palette.length]);
        return {
            typeKey: safeKey,
            label: security.cleanText(item.label || ''),
            enabled: item.enabled !== false,
            sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : (index + 1) * 10,
            color: safeColor,
            grantHours: Math.max(0, Number(item.grantHours || 0)),
            requestMode: security.normalizeSpecialLeaveRequestMode(item.requestMode),
            allowHolidayRequest: !!item.allowHolidayRequest,
            dayCountMode: security.normalizeSpecialLeaveDayCountMode(item.dayCountMode)
        };
    },
    getCeremonialPresetTypes: () => ([
        { label: '결혼(본인)', typeKey: 'celebration_5', grantHours: 40, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'emerald' },
        { label: '결혼(자녀/형제자매)', typeKey: 'celebration_2', grantHours: 16, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'emerald' },
        { label: '고희(부모)', typeKey: 'celebration_1', grantHours: 8, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'emerald' },
        { label: '출산', typeKey: 'celebration_20', grantHours: 160, requestMode: 'same_as_annual', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'rose' },
        { label: '조의(배우자/부모/자녀 및 자녀의 배우자)', typeKey: 'condolence_5', grantHours: 40, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'slate' },
        { label: '조의(형제자매)', typeKey: 'condolence_4', grantHours: 32, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'slate' },
        { label: '조의(조/외조부모)', typeKey: 'condolence_3', grantHours: 24, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'slate' },
        { label: '조의(백숙부모)', typeKey: 'condolence_1', grantHours: 8, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'slate' }
    ]),
    applyCeremonialPresetTypes: () => {
        app.specialLeaveSettingsOpen = true;
        const wrap = document.getElementById('special-leave-type-settings-list');
        if (!wrap) return;
        const existingKeys = new Set([...wrap.querySelectorAll('[data-special-type-key]')].map((row) => security.normalizeSpecialLeaveTypeKey(row.getAttribute('data-special-type-key'))).filter(Boolean));
        const existingLabels = new Set([...wrap.querySelectorAll('[data-special-type-label]')].map((el) => security.cleanText(el.value)).filter(Boolean));
        let nextIndex = wrap.querySelectorAll('[data-special-type-key]').length;
        let addedCount = 0;
        app.getCeremonialPresetTypes().forEach((item) => {
            const draft = app.buildSpecialLeaveTypeDraft(item, nextIndex);
            if (existingKeys.has(draft.typeKey) || existingLabels.has(draft.label)) return;
            wrap.insertAdjacentHTML('beforeend', app.renderSpecialLeaveTypeSettingRow(draft, nextIndex));
            existingKeys.add(draft.typeKey);
            existingLabels.add(draft.label);
            nextIndex += 1;
            addedCount += 1;
        });
        if (addedCount === 0) {
            alert('경조휴가 기본 세트가 이미 들어 있습니다.');
            return;
        }
        alert(`경조휴가 기본 세트 ${addedCount}개를 추가했습니다.`);
    },
    addSpecialLeaveTypeFromInput: () => {
        app.specialLeaveSettingsOpen = true;
        const input = document.getElementById('special-leave-new-type-label');
        if (!input) return;
        const label = security.cleanText(input.value);
        if (!label) return alert('특별휴가 이름을 입력해주세요.');
        const wrap = document.getElementById('special-leave-type-settings-list');
        if (!wrap) return;
        const exists = [...wrap.querySelectorAll('[data-special-type-label]')].some((el) => security.cleanText(el.value) === label);
        if (exists) return alert('이미 추가된 특별휴가 이름입니다.');
        const nextIndex = wrap.querySelectorAll('[data-special-type-key]').length;
        wrap.insertAdjacentHTML('beforeend', app.renderSpecialLeaveTypeSettingRow({ label, enabled: true }, nextIndex));
        input.value = '';
        input.focus();
    },
    toggleSpecialLeaveSettings: () => {
        app.specialLeaveSettingsOpen = !app.specialLeaveSettingsOpen;
        app.renderMasterPermissionPage();
    },
    renderSpecialLeaveTypeSettingRow: (type, index = 0) => {
        const draft = app.buildSpecialLeaveTypeDraft(type, index);
        const colorClass = app.getSpecialLeaveColorClasses(draft.color);
        return `<div class="rounded-xl border px-4 py-3 ${colorClass}" data-special-type-key="${draft.typeKey}" data-special-type-color="${draft.color}">
            <div class="grid grid-cols-1 lg:grid-cols-[1.2fr_120px_160px_170px_170px_auto_auto] gap-3 items-end">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">특별휴가 이름</label>
                    <input type="text" data-special-type-label value="${draft.label}" placeholder="예: 출산휴가, 병가, 경조휴가" class="w-full border bg-white p-2.5 rounded">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">기본 일수</label>
                    <input type="number" min="0" step="0.5" data-special-type-grant-days value="${draft.grantHours > 0 ? app.formatDayCount(draft.grantHours) : ''}" class="w-full border bg-white p-2.5 rounded">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">사용 타입</label>
                    <select data-special-type-request-mode class="w-full border bg-white p-2.5 rounded">
                        <option value="same_as_annual" ${draft.requestMode === 'same_as_annual' ? 'selected' : ''}>연차동일</option>
                        <option value="day_only" ${draft.requestMode === 'day_only' ? 'selected' : ''}>day 전용</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">차감 방식</label>
                    <select data-special-type-day-count-mode class="w-full border bg-white p-2.5 rounded">
                        <option value="business_days" ${draft.dayCountMode === 'business_days' ? 'selected' : ''}>영업일 기준</option>
                        <option value="calendar_days" ${draft.dayCountMode === 'calendar_days' ? 'selected' : ''}>달력일 기준</option>
                    </select>
                </div>
                <label class="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5">
                    <input type="checkbox" data-special-type-allow-holiday class="accent-indigo-600" ${draft.allowHolidayRequest ? 'checked' : ''}>
                    <span class="text-sm font-bold text-gray-700">주말/공휴일 신청 허용</span>
                </label>
                <label class="inline-flex items-center justify-end cursor-pointer">
                    <input type="checkbox" data-special-type-enabled class="sr-only peer" ${draft.enabled ? 'checked' : ''}>
                    <div class="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-4 after:h-4 after:bg-white after:border after:border-gray-300 after:rounded-full after:transition-all"></div>
                    <span class="ml-2 text-sm font-bold ${draft.enabled ? 'text-indigo-700' : 'text-gray-500'}">사용</span>
                </label>
                <button type="button" onclick="app.deleteSpecialLeaveTypeSettingRow('${draft.typeKey}')" class="justify-self-end px-3 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50">삭제</button>
            </div>
        </div>`;
    },
    addSpecialLeaveTypeSettingRow: () => {
        const wrap = document.getElementById('special-leave-type-settings-list');
        if (!wrap) return;
        const nextIndex = wrap.querySelectorAll('[data-special-type-key]').length;
        wrap.insertAdjacentHTML('beforeend', app.renderSpecialLeaveTypeSettingRow({}, nextIndex));
    },
    collectSpecialLeaveTypesFromSettings: () => {
        const rows = [...document.querySelectorAll('[data-special-type-key]')];
        return rows.map((row, index) => {
            const typeKey = security.normalizeSpecialLeaveTypeKey(row.getAttribute('data-special-type-key'));
            const labelInput = row.querySelector('[data-special-type-label]');
            const enabledInput = row.querySelector('[data-special-type-enabled]');
            const grantDaysInput = row.querySelector('[data-special-type-grant-days]');
            const requestModeInput = row.querySelector('[data-special-type-request-mode]');
            const allowHolidayInput = row.querySelector('[data-special-type-allow-holiday]');
            const dayCountModeInput = row.querySelector('[data-special-type-day-count-mode]');
            const label = security.cleanText(labelInput ? labelInput.value : '');
            if (!typeKey || !label) return null;
            const grantDays = Number(grantDaysInput ? grantDaysInput.value : 0);
            return app.buildSpecialLeaveTypeDraft({
                typeKey,
                label,
                enabled: !!(enabledInput && enabledInput.checked),
                sortOrder: (index + 1) * 10,
                color: row.getAttribute('data-special-type-color') || '',
                grantHours: Number.isFinite(grantDays) && grantDays >= 0 ? grantDays * 8 : 0,
                requestMode: requestModeInput ? requestModeInput.value : 'same_as_annual',
                allowHolidayRequest: !!(allowHolidayInput && allowHolidayInput.checked),
                dayCountMode: dayCountModeInput ? dayCountModeInput.value : 'business_days'
            }, index);
        }).filter(Boolean);
    },
    saveMasterSettings: async () => {
        if (!app.currentUser || app.currentUser.role !== 'master') {
            alert('설정 저장은 마스터만 가능합니다.');
            return;
        }
        const memberCardToggle = document.getElementById('global-member-card-toggle');
        const homepageToggle = document.getElementById('global-homepage-toggle');
        const boardToggle = document.getElementById('global-board-toggle');
        const overtimeToggle = document.getElementById('global-overtime-toggle');
        const holidayWorkToggle = document.getElementById('global-holiday-work-toggle');
        const memberCardEnabled = memberCardToggle ? memberCardToggle.checked : app.isMemberCardFeatureEnabled();
        const homepageEnabled = homepageToggle ? homepageToggle.checked : app.isHomepageFeatureEnabled();
        const boardEnabled = boardToggle ? boardToggle.checked : app.isBoardFeatureEnabled();
        const overtimeEnabled = overtimeToggle ? overtimeToggle.checked : app.isOvertimeFeatureEnabled();
        const holidayWorkEnabled = holidayWorkToggle ? holidayWorkToggle.checked : app.isHolidayWorkFeatureEnabled();
        const collectedSpecialLeaveTypes = app.collectSpecialLeaveTypesFromSettings();
        const fallbackSpecialLeaveTypes = security.mergeSpecialLeaveTypes(appData.specialLeaveTypes || []);
        const specialLeaveTypes = (!app.specialLeaveSettingsOpen && collectedSpecialLeaveTypes.length === 0)
            ? fallbackSpecialLeaveTypes
            : collectedSpecialLeaveTypes;
        if (!specialLeaveTypes.length) {
            return alert('특별휴가 종류가 비어 있어 저장할 수 없습니다. 기본 특별휴가를 먼저 확인해 주세요.');
        }
        const labelSet = new Set();
        for (const type of specialLeaveTypes) {
            const labelKey = security.cleanText(type.label);
            if (labelSet.has(labelKey)) {
                return alert(`특별휴가 이름이 중복되었습니다: ${type.label}`);
            }
            labelSet.add(labelKey);
        }
        const invalidGrantType = specialLeaveTypes.find((type) => Number(type.grantHours || 0) <= 0);
        if (invalidGrantType) {
            return alert(`${invalidGrantType.label || '특별휴가'} 기본 일수를 입력해주세요.`);
        }
        const masterUser = appData.users.find(u => u.role === 'master');
        if (!masterUser) {
            alert('마스터 계정을 찾을 수 없습니다.');
            return;
        }

        let settingSaveOk = false;
        try {
            const savedMaster = await db.upsertUser({
                ...masterUser,
                featureMemberCard: memberCardEnabled,
                featureHomepage: homepageEnabled,
                featureBoard: boardEnabled,
                featureOvertime: overtimeEnabled,
                featureHolidayWork: holidayWorkEnabled,
                permissions: security.sanitizePermissions(masterUser.permissions || {}, 'master', masterUser.dept)
            }, {
                keepOverlayOnSuccess: true,
                loadingText: '설정 저장 중입니다...'
            });
            await db.saveSpecialLeaveTypes(specialLeaveTypes, {
                keepOverlayOnSuccess: true,
                loadingText: '설정 저장 중입니다...'
            });
            settingSaveOk = true;

            const masterIndex = appData.users.findIndex(u => String(u.id) === String(savedMaster.id));
            if (masterIndex > -1) appData.users[masterIndex] = security.sanitizeUser(savedMaster);
            if (String(app.currentUser.id) === String(savedMaster.id)) {
                app.currentUser = {
                    ...app.currentUser,
                    permissions: savedMaster.permissions,
                    featureMemberCard: savedMaster.featureMemberCard,
                    featureHomepage: savedMaster.featureHomepage,
                    featureBoard: savedMaster.featureBoard,
                    featureOvertime: savedMaster.featureOvertime,
                    featureHolidayWork: savedMaster.featureHolidayWork
                };
            }
            try {
                const specialSummary = specialLeaveTypes.map((type) => `${type.typeKey}:${type.enabled ? 'on' : 'off'}`).join(',');
                await app.logUserAction('SettingSave', `memberCard:${memberCardEnabled}|homepage:${homepageEnabled}|board:${boardEnabled}|overtime:${overtimeEnabled}|holidayWork:${holidayWorkEnabled}|special:${specialSummary}`);
            } catch (e) {
                console.warn('설정 저장 로그 실패:', e);
            }
            alert('설정 저장 완료');
        } finally {
            document.getElementById('loading-overlay').style.display = 'none';
            if (settingSaveOk) {
                app.renderNav();
                app.renderMasterPermissionPage();
            }
        }
    },
    getMailRoleGroupLabel: (roleGroup) => roleGroup === 'leader' ? '팀리더 신청' : '직원/파트리더 신청',
    getMailRouteCandidates: () => (Array.isArray(appData.users) ? appData.users : [])
        .filter((user) => security.isValidEmail(user.email))
        .sort((a, b) => {
            const priority = (user) => {
                const role = security.normalizeRole(String(user && user.role || ''));
                if (role === 'ceo') return 0;
                if (role === 'team_leader') return 1;
                if (role === 'part_leader') return 2;
                return 3;
            };
            const pA = priority(a);
            const pB = priority(b);
            if (pA !== pB) return pA - pB;
            return String(a.name || '').localeCompare(String(b.name || ''), 'ko');
        }),
    getMailRouteTargets: () => ([
        { dept: '매뉴얼팀', roleGroup: 'staff' },
        { dept: '매뉴얼팀', roleGroup: 'leader' },
        { dept: '파츠북팀', roleGroup: 'staff' },
        { dept: '파츠북팀', roleGroup: 'leader' }
    ]),
    getMailRouteSectionId: (dept, roleGroup) => `${security.cleanInlineValue(dept)}-${roleGroup}`,
    renderMailRouteSection: (dept, roleGroup) => {
        const route = app.getMailRouteConfig(dept, roleGroup);
        const sectionId = app.getMailRouteSectionId(dept, roleGroup);
        const candidates = app.getMailRouteCandidates();
        const toCount = route.toUserId ? 1 : 0;
        const ccCount = Array.isArray(route.ccUserIds) ? route.ccUserIds.length : 0;
        return `<div class="rounded-xl border border-gray-200 p-4 bg-white">
            <div class="mb-3">
                <p class="text-sm font-bold text-gray-800">${dept} / ${app.getMailRoleGroupLabel(roleGroup)}</p>
                <p class="text-xs text-gray-500">신청, 승인, 반려, 취소 메일 모두 같은 대상에게 발송됩니다.</p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-xs font-bold text-gray-500">수신인 (To)</p>
                        <span class="text-[11px] font-bold text-indigo-600">${toCount}명 선택</span>
                    </div>
                    <div class="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        ${candidates.map((user) => {
                            const safeId = security.cleanInlineValue(user.id);
                            const checked = String(route.toUserId) === String(safeId);
                            return `<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input type="radio" name="mail-to-${sectionId}" value="${safeId}" ${checked ? 'checked' : ''} class="accent-indigo-600">
                                <span class="font-medium">${user.name}</span>
                                <span class="text-xs text-gray-400">${user.dept} / ${app.getUserTitleText(user)}</span>
                            </label>`;
                        }).join('')}
                    </div>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-xs font-bold text-gray-500">참고인 (CC)</p>
                        <span class="text-[11px] font-bold text-indigo-600">${ccCount}명 선택</span>
                    </div>
                    <div class="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        ${candidates.map((user) => {
                            const safeId = security.cleanInlineValue(user.id);
                            const checked = (route.ccUserIds || []).includes(safeId);
                            return `<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input type="checkbox" data-mail-cc="${sectionId}" value="${safeId}" ${checked ? 'checked' : ''} class="accent-indigo-600">
                                <span class="font-medium">${user.name}</span>
                                <span class="text-xs text-gray-400">${user.dept} / ${app.getUserTitleText(user)}</span>
                            </label>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>`;
    },
    collectMailRoutesFromSettings: () => {
        return app.getMailRouteTargets().map((target) => {
            const sectionId = app.getMailRouteSectionId(target.dept, target.roleGroup);
            const toInput = document.querySelector(`input[name="mail-to-${sectionId}"]:checked`);
            const ccInputs = [...document.querySelectorAll(`input[data-mail-cc="${sectionId}"]:checked`)];
            return {
                dept: target.dept,
                roleGroup: target.roleGroup,
                toUserId: security.cleanInlineValue(toInput ? toInput.value : ''),
                ccUserIds: ccInputs.map((el) => security.cleanInlineValue(el.value)).filter(Boolean)
            };
        }).filter((route) => route.toUserId);
    },
    saveMailSettings: async () => {
        if (!app.currentUser || app.currentUser.role !== 'master') {
            alert('메일 설정 저장은 마스터만 가능합니다.');
            return;
        }
        const routes = app.collectMailRoutesFromSettings();
        const missingTargets = app.getMailRouteTargets().filter((target) => !routes.find((route) => route.dept === target.dept && route.roleGroup === target.roleGroup));
        if (missingTargets.length) {
            const first = missingTargets[0];
            return alert(`${first.dept} / ${app.getMailRoleGroupLabel(first.roleGroup)} 수신인(To)을 선택해주세요.`);
        }
        let saveOk = false;
        try {
            await db.saveMailRoutes(routes, {
                keepOverlayOnSuccess: true,
                loadingText: '메일 설정 저장 중입니다...'
            });
            saveOk = true;
            await app.logUserAction('MailSettingSave', routes.map((route) => `${route.dept}:${route.roleGroup}`).join('|'));
            alert('메일 설정 저장 완료');
        } finally {
            document.getElementById('loading-overlay').style.display = 'none';
            if (saveOk) app.renderMasterPermissionPage();
        }
    },
    saveMasterPermissions: async () => {
        if (app.masterPermissionTab === 'settings' || app.masterPermissionTab === 'workreport') return app.saveMasterSettings();
        if (app.masterPermissionTab === 'mail') return app.saveMailSettings();
        if (app.masterPermissionTab === 'ops') return;
        return app.saveMasterPermissionTable();
    },
    setMasterPermissionTab: (tab) => {
        const safeTab = ['permissions', 'settings', 'mail', 'workreport', 'ops'].includes(tab) ? tab : 'permissions';
        app.masterPermissionTab = safeTab;
        if (safeTab === 'ops') {
            app.loadAdminOpsPanelData({ resetLogPanels: true }).finally(() => app.renderMasterPermissionPage());
            return;
        }
        app.renderMasterPermissionPage();
    },
    setPermissionColumnOpen: (group) => {
        const safeGroup = ['calendar', 'approve', 'memberStatus', 'situation', 'workreport', 'detail'].includes(group) ? group : 'calendar';
        app.permissionColumnOpen = safeGroup;
        app.renderMasterPermissionPage();
    },
    setPermissionDeptFilter: (filter) => {
        const safeFilter = ['all', 'manual', 'parts'].includes(filter) ? filter : 'all';
        app.permissionDeptFilter = safeFilter;
        app.renderMasterPermissionPage();
    },
    renderMasterPermissionPage: () => {
        if (!app.hasMasterPermissionAccess() && !app.hasAdminOpsAccess()) {
            alert('권한/설정 권한이 없습니다.');
            return app.refreshDashboard();
        }
        app.currentView = 'master-permissions';
        app.renderNav();

        const hasFullMasterAccess = app.hasMasterPermissionAccess();
        let activeTab = ['permissions', 'settings', 'mail', 'workreport', 'ops'].includes(app.masterPermissionTab) ? app.masterPermissionTab : 'permissions';
        if (!hasFullMasterAccess) activeTab = 'ops';
        if (activeTab === 'ops' && !app.adminOpsLoaded) {
            app.loadAdminOpsPanelData({ silent: true, resetLogPanels: true }).finally(() => app.renderMasterPermissionPage());
            return;
        }
        const memberCardEnabled = app.isMemberCardFeatureEnabled();
        const homepageEnabled = app.isHomepageFeatureEnabled();
        const boardEnabled = app.isBoardFeatureEnabled();
        const overtimeEnabled = app.isOvertimeFeatureEnabled();
        const holidayWorkEnabled = app.isHolidayWorkFeatureEnabled();
        const openGroup = ['calendar', 'approve', 'memberStatus', 'situation', 'workreport', 'detail'].includes(app.permissionColumnOpen) ? app.permissionColumnOpen : 'calendar';
        const deptFilter = ['all', 'manual', 'parts'].includes(app.permissionDeptFilter) ? app.permissionDeptFilter : 'all';
        const isCalendarOpen = openGroup === 'calendar';
        const isApproveOpen = openGroup === 'approve';
        const isMemberStatusOpen = openGroup === 'memberStatus';
        const isSituationOpen = openGroup === 'situation';
        const isWorkReportOpen = openGroup === 'workreport';
        const isDetailOpen = openGroup === 'detail';
        const users = [...appData.users].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ko'));
        const filteredUsers = users.filter((user) => {
            if (deptFilter === 'manual') return user.dept === '매뉴얼팀';
            if (deptFilter === 'parts') return user.dept === '파츠북팀';
            return true;
        });
        const rows = filteredUsers.map((user, rowIndex) => {
            const safeId = security.cleanInlineValue(user.id);
            const perms = security.sanitizePermissions(user.permissions || {}, user.role, user.dept);
            const isMasterRow = user.role === 'master';
            const isCeoRow = user.role === 'ceo';
            const isManagerRow = user.role === 'team_leader';
            const isPartLeaderRow = user.role === 'part_leader';
            const rowToneClass = isCeoRow
                ? 'bg-amber-100/70'
                : (isManagerRow ? 'bg-blue-100/70' : (isPartLeaderRow ? 'bg-rose-100/70' : ''));
            const isOddRow = rowIndex % 2 === 1;
            const infoStripeClass = isOddRow ? 'bg-slate-50/70' : 'bg-white';
            const calStripeClass = isOddRow ? 'bg-indigo-100/55' : 'bg-indigo-50';
            const approveStripeClass = isOddRow ? 'bg-emerald-100/55' : 'bg-emerald-50';
            const memberStatusStripeClass = isOddRow ? 'bg-violet-100/55' : 'bg-violet-50';
            const situationDesktopStripeClass = isOddRow ? 'bg-rose-100/55' : 'bg-rose-50';
            const situationMobileStripeClass = isOddRow ? 'bg-orange-100/55' : 'bg-orange-50';
            const detailDesktopStripeClass = isOddRow ? 'bg-fuchsia-100/55' : 'bg-fuchsia-50';
            const detailMobileStripeClass = isOddRow ? 'bg-sky-100/55' : 'bg-sky-50';
            const rowClass = `border-b last:border-0 ${rowToneClass ? 'hover:brightness-95' : 'hover:bg-slate-50/80'}`;
            const nameBorderClass = isCeoRow
                ? 'border-l-4 border-amber-400'
                : (isManagerRow ? 'border-l-4 border-blue-500' : (isPartLeaderRow ? 'border-l-4 border-rose-500' : ''));
            const roleBadges = [
                isCeoRow ? '<span class="ml-2 px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-700 font-bold">대표</span>' : '',
                isManagerRow ? '<span class="ml-1 px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-800 font-bold">팀리더</span>' : '',
                isPartLeaderRow ? '<span class="ml-1 px-2 py-0.5 rounded-full text-[11px] bg-rose-100 text-rose-800 font-bold">파트리더</span>' : ''
            ].join('');
            const infoCellBgClass = rowToneClass || infoStripeClass;
            const calCellBgClass = rowToneClass || calStripeClass;
            const approveCellBgClass = rowToneClass || approveStripeClass;
            const memberStatusCellBgClass = rowToneClass || memberStatusStripeClass;
            const situationDesktopCellBgClass = rowToneClass || situationDesktopStripeClass;
            const situationMobileCellBgClass = rowToneClass || situationMobileStripeClass;
            const detailDesktopCellBgClass = rowToneClass || detailDesktopStripeClass;
            const detailMobileCellBgClass = rowToneClass || detailMobileStripeClass;
            const renderCalendarPermissionPair = (topId, topChecked, topLabel, bottomId, bottomChecked, bottomLabel, isFirst = false, isLast = false) => `
                <td class="p-2 align-middle ${isFirst ? 'border-l-2 border-indigo-100' : ''} ${isLast ? 'border-r-2 border-indigo-100' : ''} ${calCellBgClass}">
                    <div class="grid grid-rows-2 gap-2 min-h-[86px]">
                        <label class="flex items-center justify-center gap-2 rounded-lg border border-indigo-100 bg-white/70 px-2 py-2 text-xs font-bold text-gray-700">
                            <input class="w-4 h-4 accent-indigo-600 border-gray-300 rounded" type="checkbox" id="${topId}" ${topChecked ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}>
                            <span>${topLabel}</span>
                        </label>
                        <label class="flex items-center justify-center gap-2 rounded-lg border border-indigo-100 bg-white/70 px-2 py-2 text-xs font-bold text-gray-700">
                            <input class="w-4 h-4 accent-indigo-600 border-gray-300 rounded" type="checkbox" id="${bottomId}" ${bottomChecked ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}>
                            <span>${bottomLabel}</span>
                        </label>
                    </div>
                </td>`;
            const calendarCells = [
                renderCalendarPermissionPair(`perm-cal-self-${safeId}`, perms.calendarSelf, '자기연차', `perm-cal-all-${safeId}`, perms.calendarAll, '모두', true, false),
                renderCalendarPermissionPair(`perm-cal-manual-${safeId}`, perms.calendarManual, '매뉴얼팀', `perm-cal-rejected-${safeId}`, perms.calendarRejected, '반려', false, false),
                renderCalendarPermissionPair(`perm-cal-parts-${safeId}`, perms.calendarParts, '파츠북팀', `perm-cal-workreport-${safeId}`, perms.calendarWorkReport, '잔업/특근', false, true)
            ].join('');
            const approveCells = `<td class="p-3 align-middle text-center border-l-2 border-emerald-100 ${approveCellBgClass}"><input class="w-4 h-4 align-middle accent-emerald-600 border-gray-300 rounded" type="checkbox" id="perm-approve-manual-${safeId}" ${perms.approveScope==='manual' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleApproveScopeCheckbox('${safeId}','manual',this.checked)"></td>
                <td class="p-3 align-middle text-center ${approveCellBgClass}"><input class="w-4 h-4 align-middle accent-emerald-600 border-gray-300 rounded" type="checkbox" id="perm-approve-parts-${safeId}" ${perms.approveScope==='parts' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleApproveScopeCheckbox('${safeId}','parts',this.checked)"></td>
                <td class="p-3 align-middle text-center border-r-2 border-emerald-100 ${approveCellBgClass}"><input class="w-4 h-4 align-middle accent-emerald-600 border-gray-300 rounded" type="checkbox" id="perm-approve-all-${safeId}" ${perms.approveScope==='all' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleApproveScopeCheckbox('${safeId}','all',this.checked)"></td>`;
            const memberStatusCells = `<td class="p-3 align-middle text-center border-l-2 border-violet-100 ${memberStatusCellBgClass}"><input class="w-4 h-4 align-middle accent-violet-600 border-gray-300 rounded" type="checkbox" id="perm-member-status-manual-${safeId}" ${perms.memberStatusScope==='manual' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleMemberStatusScopeCheckbox('${safeId}','manual',this.checked)"></td>
                <td class="p-3 align-middle text-center ${memberStatusCellBgClass}"><input class="w-4 h-4 align-middle accent-violet-600 border-gray-300 rounded" type="checkbox" id="perm-member-status-parts-${safeId}" ${perms.memberStatusScope==='parts' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleMemberStatusScopeCheckbox('${safeId}','parts',this.checked)"></td>
                <td class="p-3 align-middle text-center border-r-2 border-violet-100 ${memberStatusCellBgClass}"><input class="w-4 h-4 align-middle accent-violet-600 border-gray-300 rounded" type="checkbox" id="perm-member-status-all-${safeId}" ${perms.memberStatusScope==='all' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleMemberStatusScopeCheckbox('${safeId}','all',this.checked)"></td>`;
            const workReportCells = `<td class="p-3 align-middle text-center border-l-2 border-slate-100 ${detailDesktopCellBgClass}"><input class="w-4 h-4 align-middle accent-slate-600 border-gray-300 rounded" type="checkbox" id="perm-workreport-view-manual-${safeId}" ${perms.workReportViewManual ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="p-3 align-middle text-center ${detailDesktopCellBgClass}"><input class="w-4 h-4 align-middle accent-slate-600 border-gray-300 rounded" type="checkbox" id="perm-workreport-view-parts-${safeId}" ${perms.workReportViewParts ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="p-3 align-middle text-center border-r-2 border-slate-100 ${detailDesktopCellBgClass}"><input class="w-4 h-4 align-middle accent-slate-600 border-gray-300 rounded" type="checkbox" id="perm-workreport-view-all-${safeId}" ${perms.workReportViewAll ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>`;
            const situationCells = `<td class="px-2 py-3 align-middle text-center border-l-2 border-rose-100 ${situationDesktopCellBgClass}"><input class="w-4 h-4 align-middle accent-rose-600 border-gray-300 rounded" type="checkbox" id="perm-situation-desktop-${safeId}" ${perms.canAccessSituationBoardDesktop ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="px-2 py-3 align-middle text-center border-r-4 border-rose-200 ${situationDesktopCellBgClass}"><input class="w-4 h-4 align-middle accent-orange-600 border-gray-300 rounded" type="checkbox" id="perm-situation-mobile-${safeId}" ${perms.canAccessSituationBoardMobile ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>`;
            const detailCells = `<td class="px-2 py-3 align-middle text-center border-l-2 border-fuchsia-100 ${detailDesktopCellBgClass}"><input class="w-4 h-4 align-middle accent-fuchsia-600 border-gray-300 rounded" type="checkbox" id="perm-master-access-desktop-${safeId}" ${perms.canAccessMasterSettingsDesktop ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="px-2 py-3 align-middle text-center ${detailDesktopCellBgClass}"><input class="w-4 h-4 align-middle accent-amber-600 border-gray-300 rounded" type="checkbox" id="perm-manage-desktop-${safeId}" ${perms.canManageUsersDesktop ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="px-2 py-3 align-middle text-center border-r-4 border-fuchsia-200 ${detailDesktopCellBgClass}"><input class="w-4 h-4 align-middle accent-emerald-600 border-gray-300 rounded" type="checkbox" id="perm-admin-ops-desktop-${safeId}" ${perms.canAccessAdminOpsDesktop ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="px-2 py-3 align-middle text-center border-l-4 border-sky-200 ${detailMobileCellBgClass}"><input class="w-4 h-4 align-middle accent-fuchsia-600 border-gray-300 rounded" type="checkbox" id="perm-master-access-mobile-${safeId}" ${perms.canAccessMasterSettingsMobile ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="px-2 py-3 align-middle text-center ${detailMobileCellBgClass}"><input class="w-4 h-4 align-middle accent-amber-600 border-gray-300 rounded" type="checkbox" id="perm-manage-mobile-${safeId}" ${perms.canManageUsersMobile ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="px-2 py-3 align-middle text-center border-r-2 border-sky-100 ${detailMobileCellBgClass}"><input class="w-4 h-4 align-middle accent-emerald-600 border-gray-300 rounded" type="checkbox" id="perm-admin-ops-mobile-${safeId}" ${perms.canAccessAdminOpsMobile ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>`;
            const activeGroupCells = isCalendarOpen ? calendarCells : (isApproveOpen ? approveCells : (isMemberStatusOpen ? memberStatusCells : (isSituationOpen ? situationCells : (isWorkReportOpen ? workReportCells : detailCells))));

            return `<tr class="${rowClass}">
                <td class="p-3 align-middle font-bold ${nameBorderClass} ${infoCellBgClass}">${user.name}${isMasterRow ? ' (MASTER)' : ''}${roleBadges}</td>
                <td class="p-3 align-middle text-sm text-gray-600 ${infoCellBgClass}">${user.dept || '-'}</td>
                <td class="p-3 align-middle text-sm text-gray-600 ${infoCellBgClass}">${user.rank || '-'}</td>
                <td class="p-3 align-middle text-sm text-gray-600 ${infoCellBgClass}">${app.getRoleLabelKo(user)}</td>
                ${activeGroupCells}
            </tr>`;
        }).join('');

        const settingsPanel = `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
            <p class="text-sm font-bold text-gray-700 mb-2">설정 테이블</p>
            <p class="text-xs text-gray-500">기능 켜기/끄기를 관리합니다.</p>
            <div class="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-bold text-gray-700">직원 카드 기능</p>
                    <p class="text-xs text-gray-500">연차현황 이름 영역 클릭 시 직원 카드(연락처/사번/분기 근무시간) 표시</p>
                </div>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="global-member-card-toggle" class="sr-only peer" ${memberCardEnabled ? 'checked' : ''}>
                    <div class="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-4 after:h-4 after:bg-white after:border after:border-gray-300 after:rounded-full after:transition-all"></div>
                    <span class="ml-2 text-sm font-bold ${memberCardEnabled ? 'text-indigo-700' : 'text-gray-500'}">${memberCardEnabled ? '켜짐' : '꺼짐'}</span>
                </label>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-bold text-gray-700">홈페이지 기능</p>
                    <p class="text-xs text-gray-500">추후 개발 가능한 회사 홈페이지 메뉴 표시 허용</p>
                </div>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="global-homepage-toggle" class="sr-only peer" ${homepageEnabled ? 'checked' : ''}>
                    <div class="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-4 after:h-4 after:bg-white after:border after:border-gray-300 after:rounded-full after:transition-all"></div>
                    <span class="ml-2 text-sm font-bold ${homepageEnabled ? 'text-indigo-700' : 'text-gray-500'}">${homepageEnabled ? '켜짐' : '꺼짐'}</span>
                </label>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-bold text-gray-700">게시판 기능</p>
                    <p class="text-xs text-gray-500">상단 메뉴의 게시판 버튼 표시 및 게시판 사용 허용</p>
                </div>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="global-board-toggle" class="sr-only peer" ${boardEnabled ? 'checked' : ''}>
                    <div class="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-4 after:h-4 after:bg-white after:border after:border-gray-300 after:rounded-full after:transition-all"></div>
                    <span class="ml-2 text-sm font-bold ${boardEnabled ? 'text-indigo-700' : 'text-gray-500'}">${boardEnabled ? '켜짐' : '꺼짐'}</span>
                </label>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-100">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <p class="text-sm font-bold text-gray-700">특별휴가 종류</p>
                        <p class="text-xs text-gray-500">여기서 종류를 만들고 켜면 직원 수정창에서 체크박스로 부여할 수 있습니다.</p>
                    </div>
                    <button type="button" onclick="app.toggleSpecialLeaveSettings()" class="px-3 py-1.5 rounded-lg border border-indigo-100 text-indigo-700 text-sm font-bold hover:bg-indigo-50">${app.specialLeaveSettingsOpen ? '닫기' : '펼치기'}</button>
                </div>
                ${app.specialLeaveSettingsOpen ? `<div class="flex flex-col md:flex-row gap-2 mb-3">
                    <input id="special-leave-new-type-label" type="text" placeholder="예: 병가, 출산휴가, 경조휴가" class="flex-1 border bg-gray-50 p-2.5 rounded-lg">
<button type="button" onclick="app.addSpecialLeaveTypeFromInput()" class="px-4 py-2.5 rounded-lg text-sm font-bold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 shrink-0">추가</button>
                </div>
                <div id="special-leave-type-settings-list" class="space-y-3">
                    ${app.getSortedSpecialLeaveTypes({ enabledOnly: false }).map((type, index) => app.renderSpecialLeaveTypeSettingRow(type, index)).join('')}
                </div>` : `<div class="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-400 text-center">특별휴가 종류가 접혀 있습니다. 필요할 때 펼쳐서 수정하세요.</div>`}
            </div>
        </div>`;
        const workReportSettingsPanel = `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
            <p class="text-sm font-bold text-gray-700 mb-2">잔업/특근 설정</p>
            <p class="text-xs text-gray-500">잔업/특근 신청 기능과 운영 규칙을 관리합니다.</p>
            <div class="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-bold text-gray-700">잔업 신청 기능</p>
                    <p class="text-xs text-gray-500">직원이 개인 장부에 잔업을 기록하고 승인 요청할 수 있습니다.</p>
                </div>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="global-overtime-toggle" class="sr-only peer" ${overtimeEnabled ? 'checked' : ''}>
                    <div class="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-4 after:h-4 after:bg-white after:border after:border-gray-300 after:rounded-full after:transition-all"></div>
                    <span class="ml-2 text-sm font-bold ${overtimeEnabled ? 'text-indigo-700' : 'text-gray-500'}">${overtimeEnabled ? '켜짐' : '꺼짐'}</span>
                </label>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-bold text-gray-700">특근 신청 기능</p>
                    <p class="text-xs text-gray-500">직원이 개인 장부에 특근을 기록하고 승인 요청할 수 있습니다.</p>
                </div>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="global-holiday-work-toggle" class="sr-only peer" ${holidayWorkEnabled ? 'checked' : ''}>
                    <div class="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-4 after:h-4 after:bg-white after:border after:border-gray-300 after:rounded-full after:transition-all"></div>
                    <span class="ml-2 text-sm font-bold ${holidayWorkEnabled ? 'text-indigo-700' : 'text-gray-500'}">${holidayWorkEnabled ? '켜짐' : '꺼짐'}</span>
                </label>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-100 rounded-xl bg-slate-50 px-4 py-3 text-xs text-gray-600 space-y-1">
                <p>정산 기간은 매월 16일 ~ 다음달 15일입니다.</p>
                <p>승인 요청은 16일, 휴일인 경우 차주 월요일부터 가능합니다.</p>
                <p>제출 후에는 수정이 잠기고, 반려되면 다시 수정할 수 있습니다.</p>
            </div>
        </div>`;
        const mailPanel = `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
            <p class="text-sm font-bold text-gray-700 mb-2">메일 설정</p>
            <p class="text-xs text-gray-500 mb-4">신청, 승인, 반려, 취소 메일 모두 같은 To/CC 설정을 사용합니다.</p>
            <div class="space-y-4">
                ${app.getMailRouteTargets().map((target) => app.renderMailRouteSection(target.dept, target.roleGroup)).join('')}
            </div>
        </div>`;

        const deptFilterButtons = `
            <div class="inline-flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200 shadow-inner">
                <button onclick="app.setPermissionDeptFilter('all')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${deptFilter === 'all' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-gray-600 hover:text-slate-800'}">전부</button>
                <button onclick="app.setPermissionDeptFilter('manual')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${deptFilter === 'manual' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-600 hover:text-indigo-700'}">매뉴얼팀</button>
                <button onclick="app.setPermissionDeptFilter('parts')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${deptFilter === 'parts' ? 'bg-white text-sky-700 shadow-sm border border-sky-100' : 'text-gray-600 hover:text-sky-700'}">파츠북팀</button>
            </div>`;
        const groupButtons = `<div class="px-4 pt-4 pb-2 bg-white">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div class="inline-flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200 shadow-inner">
                    <button onclick="app.setPermissionColumnOpen('calendar')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isCalendarOpen ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-600 hover:text-indigo-700'}">달력정보</button>
                    <button onclick="app.setPermissionColumnOpen('approve')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isApproveOpen ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' : 'text-gray-600 hover:text-emerald-700'}">승인권한</button>
                    <button onclick="app.setPermissionColumnOpen('memberStatus')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isMemberStatusOpen ? 'bg-white text-violet-700 shadow-sm border border-violet-100' : 'text-gray-600 hover:text-violet-700'}">팀원 연차현황</button>
                    <button onclick="app.setPermissionColumnOpen('situation')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isSituationOpen ? 'bg-white text-rose-700 shadow-sm border border-rose-100' : 'text-gray-600 hover:text-rose-700'}">전체 상황판</button>
                    <button onclick="app.setPermissionColumnOpen('workreport')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isWorkReportOpen ? 'bg-white text-slate-700 shadow-sm border border-slate-200' : 'text-gray-600 hover:text-slate-700'}">잔업/특근</button>
                    <button onclick="app.setPermissionColumnOpen('detail')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isDetailOpen ? 'bg-white text-fuchsia-700 shadow-sm border border-fuchsia-100' : 'text-gray-600 hover:text-fuchsia-700'}">세부설정</button>
                </div>
                ${deptFilterButtons}
            </div>
        </div>`;
        const activeGroupTitle = isCalendarOpen ? '달력정보' : (isApproveOpen ? '승인권한' : (isMemberStatusOpen ? '팀원 연차현황' : (isSituationOpen ? '전체 상황판' : (isWorkReportOpen ? '잔업/특근 현황' : '세부설정'))));
        const activeGroupHeaderClass = isCalendarOpen
            ? 'bg-indigo-50 text-indigo-700 border-l border-indigo-100 border-r'
            : (isApproveOpen ? 'bg-emerald-50 text-emerald-700 border-l border-emerald-100 border-r' : (isMemberStatusOpen ? 'bg-violet-50 text-violet-700 border-l border-violet-100 border-r' : (isSituationOpen ? 'bg-rose-50 text-rose-700 border-l border-rose-100 border-r' : (isWorkReportOpen ? 'bg-slate-50 text-slate-700 border-l border-slate-200 border-r' : 'bg-fuchsia-50 text-fuchsia-700 border-l border-fuchsia-100 border-r'))));
        const activeGroupSubHeader = isCalendarOpen
            ? `<th class="py-1 bg-indigo-50 border-b border-gray-200 border-l border-indigo-100"></th>
                <th class="py-1 bg-indigo-50 border-b border-gray-200"></th>
                <th class="py-1 bg-indigo-50 border-b border-gray-200 border-r border-indigo-100"></th>`
            : (isApproveOpen
                ? `<th class="p-3 bg-emerald-50 border-b border-gray-200 text-center border-l border-emerald-100">매뉴얼</th>
                    <th class="p-3 bg-emerald-50 border-b border-gray-200 text-center">파츠북</th>
                    <th class="p-3 bg-emerald-50 border-b border-gray-200 text-center border-r border-emerald-100">모두</th>`
                : (isMemberStatusOpen
                    ? `<th class="p-3 bg-violet-50 border-b border-gray-200 text-center border-l border-violet-100">매뉴얼</th>
                        <th class="p-3 bg-violet-50 border-b border-gray-200 text-center">파츠북</th>
                        <th class="p-3 bg-violet-50 border-b border-gray-200 text-center border-r border-violet-100">모두</th>`
                    : (isSituationOpen
                        ? `<th class="px-2 py-2.5 bg-rose-50 border-b border-gray-200 text-center border-l border-rose-100">
                                <div class="flex flex-col items-center gap-0.5 leading-tight">
                                    <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700">PC</span>
                                    <span class="text-[12px]">전체 상황판</span>
                                </div>
                            </th>
                            <th class="px-2 py-2.5 bg-orange-50 border-b border-gray-200 text-center border-r border-rose-100">
                                <div class="flex flex-col items-center gap-0.5 leading-tight">
                                    <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-orange-700">모바일</span>
                                    <span class="text-[12px]">전체 상황판</span>
                                </div>
                            </th>`
                    : (isWorkReportOpen
                        ? `<th class="p-3 bg-slate-50 border-b border-gray-200 text-center border-l border-slate-200">매뉴얼팀</th>
                            <th class="p-3 bg-slate-50 border-b border-gray-200 text-center">파츠북팀</th>
                            <th class="p-3 bg-slate-50 border-b border-gray-200 text-center border-r border-slate-200">모두</th>`
                    : `<th class="px-2 py-2.5 bg-fuchsia-50 border-b border-gray-200 text-center border-l border-fuchsia-100">
                            <div class="flex flex-col items-center gap-0.5 leading-tight">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-fuchsia-100 text-fuchsia-700">PC</span>
                                <span class="text-[12px]">권한/설정<br>접근</span>
                            </div>
                        </th>
                        <th class="px-2 py-2.5 bg-amber-50 border-b border-gray-200 text-center">
                            <div class="flex flex-col items-center gap-0.5 leading-tight">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-fuchsia-100 text-fuchsia-700">PC</span>
                                <span class="text-[12px]">구성원 관리</span>
                            </div>
                        </th>
                        <th class="px-2 py-2.5 bg-emerald-50 border-b border-r-4 border-fuchsia-200 border-gray-200 text-center">
                            <div class="flex flex-col items-center gap-0.5 leading-tight">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-fuchsia-100 text-fuchsia-700">PC</span>
                                <span class="text-[12px]">운영실 접근</span>
                            </div>
                        </th>
                        <th class="px-2 py-2.5 bg-sky-50 border-b border-l-4 border-sky-200 border-gray-200 text-center">
                            <div class="flex flex-col items-center gap-0.5 leading-tight">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-700">모바일</span>
                                <span class="text-[12px]">권한/설정<br>접근</span>
                            </div>
                        </th>
                        <th class="px-2 py-2.5 bg-cyan-50 border-b border-gray-200 text-center">
                            <div class="flex flex-col items-center gap-0.5 leading-tight">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-700">모바일</span>
                                <span class="text-[12px]">구성원 관리</span>
                            </div>
                        </th>
                        <th class="px-2 py-2.5 bg-teal-50 border-b border-gray-200 text-center border-r border-sky-100">
                            <div class="flex flex-col items-center gap-0.5 leading-tight">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-700">모바일</span>
                                <span class="text-[12px]">운영실 접근</span>
                            </div>
                        </th>`))));
        const activeGroupColSpan = isCalendarOpen ? 3 : (isDetailOpen ? 6 : (isSituationOpen ? 2 : 3));
        const permissionColGroup = isCalendarOpen
            ? `<colgroup>
                <col style="width: 190px;">
                <col style="width: 120px;">
                <col style="width: 100px;">
                <col style="width: 100px;">
                <col style="width: 156px;">
                <col style="width: 156px;">
                <col style="width: 156px;">
            </colgroup>`
            : (isDetailOpen
                ? `<colgroup>
                    <col style="width: 190px;">
                    <col style="width: 112px;">
                    <col style="width: 88px;">
                    <col style="width: 88px;">
                    <col style="width: 108px;">
                    <col style="width: 96px;">
                    <col style="width: 100px;">
                    <col style="width: 108px;">
                    <col style="width: 96px;">
                    <col style="width: 100px;">
                </colgroup>`
                : (isSituationOpen
                    ? `<colgroup>
                        <col style="width: 190px;">
                        <col style="width: 120px;">
                        <col style="width: 100px;">
                        <col style="width: 100px;">
                        <col style="width: 118px;">
                        <col style="width: 118px;">
                    </colgroup>`
                : (isWorkReportOpen
                    ? `<colgroup>
                        <col style="width: 190px;">
                        <col style="width: 120px;">
                        <col style="width: 100px;">
                        <col style="width: 100px;">
                        <col style="width: 118px;">
                        <col style="width: 118px;">
                        <col style="width: 118px;">
                    </colgroup>`
                : `<colgroup>
                <col style="width: 190px;">
                <col style="width: 120px;">
                <col style="width: 100px;">
                <col style="width: 100px;">
                <col style="width: 96px;">
                <col style="width: 96px;">
                <col style="width: 96px;">
            </colgroup>`)));
        const permissionPanel = `<div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div class="p-4 border-b border-gray-200">
                <p class="text-sm font-bold text-gray-700">권한 탭</p>
                <p class="text-sm text-gray-600">직원별로 체크박스를 선택하세요.</p>
                <p class="text-sm text-gray-600">승인 권한은 매뉴얼팀/파츠북팀/모두 중 하나만 체크하세요.</p>
                <p class="text-sm text-gray-600">팀원 연차현황 권한도 매뉴얼팀/파츠북팀/모두 중 하나만 체크하세요.</p>
                <p class="text-sm text-gray-600">세부설정에서는 PC와 모바일 권한을 각각 분리해 관리합니다.</p>
                <p class="text-sm text-gray-600">한 번에 1개 그룹만 펼쳐집니다. 다른 그룹은 자동으로 닫힙니다.</p>
                <div class="mt-2 text-xs text-gray-500 flex flex-wrap gap-2 items-center">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">팀리더 행 강조</span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">대표 행 강조</span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">파트리더 행 강조</span>
                </div>
            </div>
            <div class="overflow-x-auto">
                ${groupButtons}
                <table id="master-perm-table" class="w-full text-sm table-fixed ${isCalendarOpen ? 'min-w-[980px]' : (isDetailOpen ? 'min-w-[1190px]' : (isSituationOpen ? 'min-w-[930px]' : (isWorkReportOpen ? 'min-w-[980px]' : 'min-w-[1140px]')))}">
                    ${permissionColGroup}
                    <thead class="bg-gray-50">
                        <tr>
                            <th rowspan="2" class="p-3 text-left bg-gray-50 border-b border-gray-200">이름</th>
                            <th rowspan="2" class="p-3 text-left bg-gray-50 border-b border-gray-200">부서</th>
                            <th rowspan="2" class="p-3 text-left bg-gray-50 border-b border-gray-200">직급</th>
                            <th rowspan="2" class="p-3 text-left bg-gray-50 border-b border-gray-200">유형</th>
                            <th colspan="${activeGroupColSpan}" class="p-3 text-center border-b border-gray-200 ${activeGroupHeaderClass}">${activeGroupTitle}</th>
                        </tr>
                        <tr>
                            ${activeGroupSubHeader}
                        </tr>
                    </thead>
                    <tbody>${rows || `<tr><td colspan="${4 + activeGroupColSpan}" class="p-6 text-center text-sm text-gray-400 bg-white">선택한 팀에 해당하는 직원이 없습니다.</td></tr>`}</tbody>
                </table>
            </div>
        </div>`;
        const saveButton = activeTab === 'permissions'
            ? `<button onclick="app.saveMasterPermissionTable()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700">권한 저장</button>`
            : (activeTab === 'settings'
                ? `<button onclick="app.saveMasterSettings()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700">설정 저장</button>`
                : (activeTab === 'mail'
                    ? `<button onclick="app.saveMailSettings()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700">메일 설정 저장</button>`
                    : ''));
        const topTabs = `<div class="px-4 pt-3 bg-gray-100/80 border-b border-gray-200">
            <div class="flex items-end gap-1">
                ${hasFullMasterAccess ? `<button onclick="app.setMasterPermissionTab('permissions')" class="px-4 py-2 rounded-t-xl font-bold border transition ${activeTab === 'permissions' ? 'bg-white text-gray-900 border-gray-300 border-b-white -mb-px shadow-sm' : 'bg-gray-200 text-gray-600 border-transparent hover:bg-gray-100'}">권한 탭</button>
                <button onclick="app.setMasterPermissionTab('settings')" class="px-4 py-2 rounded-t-xl font-bold border transition ${activeTab === 'settings' ? 'bg-white text-gray-900 border-gray-300 border-b-white -mb-px shadow-sm' : 'bg-gray-200 text-gray-600 border-transparent hover:bg-gray-100'}">설정 테이블</button>
                <button onclick="app.setMasterPermissionTab('mail')" class="px-4 py-2 rounded-t-xl font-bold border transition ${activeTab === 'mail' ? 'bg-white text-gray-900 border-gray-300 border-b-white -mb-px shadow-sm' : 'bg-gray-200 text-gray-600 border-transparent hover:bg-gray-100'}">메일 설정</button>
                <button onclick="app.setMasterPermissionTab('workreport')" class="px-4 py-2 rounded-t-xl font-bold border transition ${activeTab === 'workreport' ? 'bg-white text-gray-900 border-gray-300 border-b-white -mb-px shadow-sm' : 'bg-gray-200 text-gray-600 border-transparent hover:bg-gray-100'}">잔업/특근 설정</button>` : ''}
                <button onclick="app.setMasterPermissionTab('ops')" class="px-4 py-2 rounded-t-xl font-bold border transition ${activeTab === 'ops' ? 'bg-white text-gray-900 border-gray-300 border-b-white -mb-px shadow-sm' : 'bg-gray-200 text-gray-600 border-transparent hover:bg-gray-100'}">운영실</button>
            </div>
        </div>`;
        const activePanel = activeTab === 'permissions'
            ? permissionPanel
            : (activeTab === 'settings'
                ? settingsPanel
                : (activeTab === 'mail' ? mailPanel : (activeTab === 'workreport' ? workReportSettingsPanel : app.renderAdminOpsPanel())));

        document.getElementById('app-container').innerHTML = `<div class="w-full max-w-7xl mx-auto px-4 pt-8 pb-12 fade-in">
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800">${activeTab === 'ops' && !hasFullMasterAccess ? '관리자 운영실' : '마스터 권한 관리'}</h2>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                ${topTabs}
                <div class="p-4">
                    ${activePanel}
        ${appData.meta.permissionsFromDb ? '' : `<div class="mt-3 mb-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">현재 DB가 권한 컬럼을 아직 읽지 못하고 있습니다. 최신 서버 버전으로 다시 배포해주세요.</div>`}
                </div>
                <div class="px-4 py-4 border-t border-gray-200 bg-gray-50/70 flex justify-end">
                    ${saveButton}
                </div>
            </div>
        </div>${app.getModal()}`;
    },
});
