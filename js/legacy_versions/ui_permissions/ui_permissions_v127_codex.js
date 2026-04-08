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
        { label: '寃고샎(蹂몄씤)', typeKey: 'celebration_5', grantHours: 40, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'emerald' },
        { label: '寃고샎(?먮?/?뺤젣?먮ℓ)', typeKey: 'celebration_2', grantHours: 16, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'emerald' },
        { label: '怨좏씗(遺紐?', typeKey: 'celebration_1', grantHours: 8, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'emerald' },
        { label: '異쒖궛', typeKey: 'celebration_20', grantHours: 160, requestMode: 'same_as_annual', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'rose' },
        { label: '議곗쓽(諛곗슦??遺紐??먮? 諛??먮???諛곗슦??', typeKey: 'condolence_5', grantHours: 40, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'slate' },
        { label: '議곗쓽(?뺤젣?먮ℓ)', typeKey: 'condolence_4', grantHours: 32, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'slate' },
        { label: '議곗쓽(議??몄“遺紐?', typeKey: 'condolence_3', grantHours: 24, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'slate' },
        { label: '議곗쓽(諛깆닕遺紐?', typeKey: 'condolence_1', grantHours: 8, requestMode: 'day_only', allowHolidayRequest: true, dayCountMode: 'calendar_days', color: 'slate' }
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
            alert('寃쎌“?닿? 湲곕낯 ?명듃媛 ?대? ?ㅼ뼱 ?덉뒿?덈떎.');
            return;
        }
        alert(`寃쎌“?닿? 湲곕낯 ?명듃 ${addedCount}媛쒕? 異붽??덉뒿?덈떎.`);
    },
    addSpecialLeaveTypeFromInput: () => {
        app.specialLeaveSettingsOpen = true;
        const input = document.getElementById('special-leave-new-type-label');
        if (!input) return;
        const label = security.cleanText(input.value);
        if (!label) return alert('?밸퀎?닿? ?대쫫???낅젰?댁＜?몄슂.');
        const wrap = document.getElementById('special-leave-type-settings-list');
        if (!wrap) return;
        const exists = [...wrap.querySelectorAll('[data-special-type-label]')].some((el) => security.cleanText(el.value) === label);
        if (exists) return alert('?대? 異붽????밸퀎?닿? ?대쫫?낅땲??');
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
                    <label class="block text-xs font-bold text-gray-500 mb-1">?밸퀎?닿? ?대쫫</label>
                    <input type="text" data-special-type-label value="${draft.label}" placeholder="?? 異쒖궛?닿?, 蹂묎?, 寃쎌“?닿?" class="w-full border bg-white p-2.5 rounded">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">湲곕낯 ?쇱닔</label>
                    <input type="number" min="0" step="0.5" data-special-type-grant-days value="${draft.grantHours > 0 ? app.formatDayCount(draft.grantHours) : ''}" class="w-full border bg-white p-2.5 rounded">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">?ъ슜 ???/label>
                    <select data-special-type-request-mode class="w-full border bg-white p-2.5 rounded">
                        <option value="same_as_annual" ${draft.requestMode === 'same_as_annual' ? 'selected' : ''}>?곗감?숈씪</option>
                        <option value="day_only" ${draft.requestMode === 'day_only' ? 'selected' : ''}>day ?꾩슜</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">李④컧 諛⑹떇</label>
                    <select data-special-type-day-count-mode class="w-full border bg-white p-2.5 rounded">
                        <option value="business_days" ${draft.dayCountMode === 'business_days' ? 'selected' : ''}>?곸뾽??湲곗?</option>
                        <option value="calendar_days" ${draft.dayCountMode === 'calendar_days' ? 'selected' : ''}>?щ젰??湲곗?</option>
                    </select>
                </div>
                <label class="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5">
                    <input type="checkbox" data-special-type-allow-holiday class="accent-indigo-600" ${draft.allowHolidayRequest ? 'checked' : ''}>
                    <span class="text-sm font-bold text-gray-700">二쇰쭚/怨듯쑕???좎껌 ?덉슜</span>
                </label>
                <label class="inline-flex items-center justify-end cursor-pointer">
                    <input type="checkbox" data-special-type-enabled class="sr-only peer" ${draft.enabled ? 'checked' : ''}>
                    <div class="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-4 after:h-4 after:bg-white after:border after:border-gray-300 after:rounded-full after:transition-all"></div>
                    <span class="ml-2 text-sm font-bold ${draft.enabled ? 'text-indigo-700' : 'text-gray-500'}">?ъ슜</span>
                </label>
                <button type="button" onclick="app.deleteSpecialLeaveTypeSettingRow('${draft.typeKey}')" class="justify-self-end px-3 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50">??젣</button>
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
            alert('?ㅼ젙 ??μ? 留덉뒪?곕쭔 媛?ν빀?덈떎.');
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
            return alert('?밸퀎?닿? 醫낅쪟媛 鍮꾩뼱 ?덉뼱 ??ν븷 ???놁뒿?덈떎. 湲곕낯 ?밸퀎?닿?瑜?癒쇱? ?뺤씤??二쇱꽭??');
        }
        const labelSet = new Set();
        for (const type of specialLeaveTypes) {
            const labelKey = security.cleanText(type.label);
            if (labelSet.has(labelKey)) {
                return alert(`?밸퀎?닿? ?대쫫??以묐났?섏뿀?듬땲?? ${type.label}`);
            }
            labelSet.add(labelKey);
        }
        const invalidGrantType = specialLeaveTypes.find((type) => Number(type.grantHours || 0) <= 0);
        if (invalidGrantType) {
            return alert(`${invalidGrantType.label || '?밸퀎?닿?'} 湲곕낯 ?쇱닔瑜??낅젰?댁＜?몄슂.`);
        }
        const masterUser = appData.users.find(u => u.role === 'master');
        if (!masterUser) {
            alert('留덉뒪??怨꾩젙??李얠쓣 ???놁뒿?덈떎.');
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
                loadingText: '?ㅼ젙 ???以묒엯?덈떎...'
            });
            await db.saveSpecialLeaveTypes(specialLeaveTypes, {
                keepOverlayOnSuccess: true,
                loadingText: '?ㅼ젙 ???以묒엯?덈떎...'
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
                console.warn('?ㅼ젙 ???濡쒓렇 ?ㅽ뙣:', e);
            }
            alert('?ㅼ젙 ????꾨즺');
        } finally {
            document.getElementById('loading-overlay').style.display = 'none';
            if (settingSaveOk) {
                app.renderNav();
                app.renderMasterPermissionPage();
            }
        }
    },
    getMailRoleGroupLabel: (roleGroup) => roleGroup === 'leader' ? '?由щ뜑 ?좎껌' : '吏곸썝/?뚰듃由щ뜑 ?좎껌',
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
        { dept: '留ㅻ돱?쇳?', roleGroup: 'staff' },
        { dept: '留ㅻ돱?쇳?', roleGroup: 'leader' },
        { dept: '?뚯툩遺곹?', roleGroup: 'staff' },
        { dept: '?뚯툩遺곹?', roleGroup: 'leader' }
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
                <p class="text-xs text-gray-500">?좎껌, ?뱀씤, 諛섎젮, 痍⑥냼 硫붿씪 紐⑤몢 媛숈? ??곸뿉寃?諛쒖넚?⑸땲??</p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-xs font-bold text-gray-500">?섏떊??(To)</p>
                        <span class="text-[11px] font-bold text-indigo-600">${toCount}紐??좏깮</span>
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
                        <p class="text-xs font-bold text-gray-500">李멸퀬??(CC)</p>
                        <span class="text-[11px] font-bold text-indigo-600">${ccCount}紐??좏깮</span>
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
            alert('硫붿씪 ?ㅼ젙 ??μ? 留덉뒪?곕쭔 媛?ν빀?덈떎.');
            return;
        }
        const routes = app.collectMailRoutesFromSettings();
        const missingTargets = app.getMailRouteTargets().filter((target) => !routes.find((route) => route.dept === target.dept && route.roleGroup === target.roleGroup));
        if (missingTargets.length) {
            const first = missingTargets[0];
            return alert(`${first.dept} / ${app.getMailRoleGroupLabel(first.roleGroup)} ?섏떊??To)???좏깮?댁＜?몄슂.`);
        }
        let saveOk = false;
        try {
            await db.saveMailRoutes(routes, {
                keepOverlayOnSuccess: true,
                loadingText: '硫붿씪 ?ㅼ젙 ???以묒엯?덈떎...'
            });
            saveOk = true;
            await app.logUserAction('MailSettingSave', routes.map((route) => `${route.dept}:${route.roleGroup}`).join('|'));
            alert('硫붿씪 ?ㅼ젙 ????꾨즺');
        } finally {
            document.getElementById('loading-overlay').style.display = 'none';
            if (saveOk) app.renderMasterPermissionPage();
        }
    },
    saveMasterPermissionTable: async () => {
        if (!app.hasMasterPermissionAccess()) {
            alert('沅뚰븳/?ㅼ젙 沅뚰븳???놁뒿?덈떎.');
            return;
        }

        appData.users = appData.users.map((user) => {
            const safeId = security.cleanInlineValue(user.id);
            if (user.role === 'master') {
                return security.sanitizeUser({
                    ...user,
                    permissions: security.sanitizePermissions({}, 'master', user.dept)
                });
            }
            const existingPerms = security.sanitizePermissions(user.permissions || {}, user.role, user.dept);
            const getCheckedOrExisting = (elementId, fallbackValue) => {
                const el = document.getElementById(elementId);
                return el ? !!el.checked : !!fallbackValue;
            };

            const permissions = {
                calendarSelf: getCheckedOrExisting(`perm-cal-self-${safeId}`, existingPerms.calendarSelf),
                calendarManual: getCheckedOrExisting(`perm-cal-manual-${safeId}`, existingPerms.calendarManual),
                calendarParts: getCheckedOrExisting(`perm-cal-parts-${safeId}`, existingPerms.calendarParts),
                calendarAll: getCheckedOrExisting(`perm-cal-all-${safeId}`, existingPerms.calendarAll),
                calendarRejected: getCheckedOrExisting(`perm-cal-rejected-${safeId}`, existingPerms.calendarRejected),
                calendarWorkReport: getCheckedOrExisting(`perm-cal-workreport-${safeId}`, existingPerms.calendarWorkReport),
                boardRead: getCheckedOrExisting(`perm-board-read-${safeId}`, existingPerms.boardRead),
                boardWrite: getCheckedOrExisting(`perm-board-write-${safeId}`, existingPerms.boardWrite),
                workReportViewManual: getCheckedOrExisting(`perm-workreport-view-manual-${safeId}`, existingPerms.workReportViewManual),
                workReportViewParts: getCheckedOrExisting(`perm-workreport-view-parts-${safeId}`, existingPerms.workReportViewParts),
                workReportViewAll: getCheckedOrExisting(`perm-workreport-view-all-${safeId}`, existingPerms.workReportViewAll),
                approveScope: existingPerms.approveScope,
                memberStatusScope: existingPerms.memberStatusScope,
                canAccessSituationBoard: existingPerms.canAccessSituationBoard,
                canAccessSituationBoardDesktop: getCheckedOrExisting(`perm-situation-desktop-${safeId}`, existingPerms.canAccessSituationBoardDesktop),
                canAccessSituationBoardMobile: getCheckedOrExisting(`perm-situation-mobile-${safeId}`, existingPerms.canAccessSituationBoardMobile),
                canAccessMasterSettings: existingPerms.canAccessMasterSettings,
                canManageUsers: existingPerms.canManageUsers,
                canAccessMasterSettingsDesktop: getCheckedOrExisting(`perm-master-access-desktop-${safeId}`, existingPerms.canAccessMasterSettingsDesktop),
                canManageUsersDesktop: getCheckedOrExisting(`perm-manage-desktop-${safeId}`, existingPerms.canManageUsersDesktop),
                canAccessMasterSettingsMobile: getCheckedOrExisting(`perm-master-access-mobile-${safeId}`, existingPerms.canAccessMasterSettingsMobile),
                canManageUsersMobile: getCheckedOrExisting(`perm-manage-mobile-${safeId}`, existingPerms.canManageUsersMobile),
                canAccessAdminOps: existingPerms.canAccessAdminOps,
                canAccessAdminOpsDesktop: getCheckedOrExisting(`perm-admin-ops-desktop-${safeId}`, existingPerms.canAccessAdminOpsDesktop),
                canAccessAdminOpsMobile: getCheckedOrExisting(`perm-admin-ops-mobile-${safeId}`, existingPerms.canAccessAdminOpsMobile)
            };

            const approveAllEl = document.getElementById(`perm-approve-all-${safeId}`);
            const approveManualEl = document.getElementById(`perm-approve-manual-${safeId}`);
            const approvePartsEl = document.getElementById(`perm-approve-parts-${safeId}`);
            if (approveAllEl || approveManualEl || approvePartsEl) {
                if (approveAllEl?.checked) permissions.approveScope = 'all';
                else if (approveManualEl?.checked) permissions.approveScope = 'manual';
                else if (approvePartsEl?.checked) permissions.approveScope = 'parts';
                else permissions.approveScope = 'none';
            }

            const memberAllEl = document.getElementById(`perm-member-status-all-${safeId}`);
            const memberManualEl = document.getElementById(`perm-member-status-manual-${safeId}`);
            const memberPartsEl = document.getElementById(`perm-member-status-parts-${safeId}`);
            if (memberAllEl || memberManualEl || memberPartsEl) {
                if (memberAllEl?.checked) permissions.memberStatusScope = 'all';
                else if (memberManualEl?.checked) permissions.memberStatusScope = 'manual';
                else if (memberPartsEl?.checked) permissions.memberStatusScope = 'parts';
                else permissions.memberStatusScope = 'none';
            }

            if (!permissions.calendarSelf && !permissions.calendarManual && !permissions.calendarParts && !permissions.calendarAll && !permissions.calendarRejected && !permissions.calendarWorkReport) {
                permissions.calendarSelf = true;
            }
            permissions.canAccessSituationBoard = !!(permissions.canAccessSituationBoardDesktop || permissions.canAccessSituationBoardMobile);
            permissions.canAccessMasterSettings = !!(permissions.canAccessMasterSettingsDesktop || permissions.canAccessMasterSettingsMobile);
            permissions.canManageUsers = !!(permissions.canManageUsersDesktop || permissions.canManageUsersMobile);
            permissions.canAccessAdminOps = !!(permissions.canAccessAdminOpsDesktop || permissions.canAccessAdminOpsMobile);

            return security.sanitizeUser({
                ...user,
                permissions
            });
        });

        let permissionSaveOk = false;
        try {
            await db.saveUsers({
                keepOverlayOnSuccess: true,
                throwOnError: true,
                loadingText: '沅뚰븳 ???以묒엯?덈떎...'
            });
            permissionSaveOk = true;
            const freshMe = appData.users.find((u) => String(u.id) === String(app.currentUser.id));
            if (freshMe) {
                app.currentUser = {
                    ...app.currentUser,
                    permissions: freshMe.permissions,
                    featureMemberCard: freshMe.featureMemberCard,
                    featureHomepage: freshMe.featureHomepage,
                    featureBoard: freshMe.featureBoard,
                    featureOvertime: freshMe.featureOvertime,
                    featureHolidayWork: freshMe.featureHolidayWork
                };
            }
            try {
                await app.logUserAction('PermissionSave', 'permissions_with_board');
            } catch (e) {
                console.warn('沅뚰븳 ???濡쒓렇 ?ㅽ뙣:', e);
            }
            alert('沅뚰븳 ????꾨즺');
        } finally {
            document.getElementById('loading-overlay').style.display = 'none';
            if (permissionSaveOk) {
                app.renderNav();
                app.renderMasterPermissionPage();
            }
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
        const safeGroup = ['calendar', 'approve', 'memberStatus', 'situation', 'workreport', 'board', 'detail'].includes(group) ? group : 'calendar';
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
            alert('沅뚰븳/?ㅼ젙 沅뚰븳???놁뒿?덈떎.');
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
        const openGroup = ['calendar', 'approve', 'memberStatus', 'situation', 'workreport', 'board', 'detail'].includes(app.permissionColumnOpen) ? app.permissionColumnOpen : 'calendar';
        const deptFilter = ['all', 'manual', 'parts'].includes(app.permissionDeptFilter) ? app.permissionDeptFilter : 'all';
        const isCalendarOpen = openGroup === 'calendar';
        const isApproveOpen = openGroup === 'approve';
        const isMemberStatusOpen = openGroup === 'memberStatus';
        const isSituationOpen = openGroup === 'situation';
        const isWorkReportOpen = openGroup === 'workreport';
        const isBoardOpen = openGroup === 'board';
        const isDetailOpen = openGroup === 'detail';
        const users = [...appData.users].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ko'));
        const filteredUsers = users.filter((user) => {
            if (deptFilter === 'manual') return user.dept === '留ㅻ돱?쇳?';
            if (deptFilter === 'parts') return user.dept === '?뚯툩遺곹?';
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
            const boardStripeClass = isOddRow ? 'bg-cyan-100/55' : 'bg-cyan-50';
            const detailDesktopStripeClass = isOddRow ? 'bg-fuchsia-100/55' : 'bg-fuchsia-50';
            const detailMobileStripeClass = isOddRow ? 'bg-sky-100/55' : 'bg-sky-50';
            const rowClass = `border-b last:border-0 ${rowToneClass ? 'hover:brightness-95' : 'hover:bg-slate-50/80'}`;
            const nameBorderClass = isCeoRow
                ? 'border-l-4 border-amber-400'
                : (isManagerRow ? 'border-l-4 border-blue-500' : (isPartLeaderRow ? 'border-l-4 border-rose-500' : ''));
            const roleBadges = [
                isCeoRow ? '<span class="ml-2 px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-700 font-bold">???/span>' : '',
                isManagerRow ? '<span class="ml-1 px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-800 font-bold">?由щ뜑</span>' : '',
                isPartLeaderRow ? '<span class="ml-1 px-2 py-0.5 rounded-full text-[11px] bg-rose-100 text-rose-800 font-bold">?뚰듃由щ뜑</span>' : ''
            ].join('');
            const infoCellBgClass = rowToneClass || infoStripeClass;
            const calCellBgClass = rowToneClass || calStripeClass;
            const approveCellBgClass = rowToneClass || approveStripeClass;
            const memberStatusCellBgClass = rowToneClass || memberStatusStripeClass;
            const situationDesktopCellBgClass = rowToneClass || situationDesktopStripeClass;
            const situationMobileCellBgClass = rowToneClass || situationMobileStripeClass;
            const boardCellBgClass = rowToneClass || boardStripeClass;
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
                renderCalendarPermissionPair(`perm-cal-self-${safeId}`, perms.calendarSelf, '?먭린?곗감', `perm-cal-all-${safeId}`, perms.calendarAll, '紐⑤몢', true, false),
                renderCalendarPermissionPair(`perm-cal-manual-${safeId}`, perms.calendarManual, '留ㅻ돱?쇳?', `perm-cal-rejected-${safeId}`, perms.calendarRejected, '諛섎젮', false, false),
                renderCalendarPermissionPair(`perm-cal-parts-${safeId}`, perms.calendarParts, '?뚯툩遺곹?', `perm-cal-workreport-${safeId}`, perms.calendarWorkReport, '?붿뾽/?밴렐', false, true)
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
            const boardCells = `<td class="p-3 align-middle text-center border-l-2 border-cyan-100 ${boardCellBgClass}"><input class="w-4 h-4 align-middle accent-cyan-600 border-gray-300 rounded" type="checkbox" id="perm-board-read-${safeId}" ${perms.boardRead ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="p-3 align-middle text-center border-r-2 border-cyan-100 ${boardCellBgClass}"><input class="w-4 h-4 align-middle accent-sky-600 border-gray-300 rounded" type="checkbox" id="perm-board-write-${safeId}" ${perms.boardWrite ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>`;
            const detailCells = `<td class="px-2 py-3 align-middle text-center border-l-2 border-fuchsia-100 ${detailDesktopCellBgClass}"><input class="w-4 h-4 align-middle accent-fuchsia-600 border-gray-300 rounded" type="checkbox" id="perm-master-access-desktop-${safeId}" ${perms.canAccessMasterSettingsDesktop ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="px-2 py-3 align-middle text-center ${detailDesktopCellBgClass}"><input class="w-4 h-4 align-middle accent-amber-600 border-gray-300 rounded" type="checkbox" id="perm-manage-desktop-${safeId}" ${perms.canManageUsersDesktop ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="px-2 py-3 align-middle text-center border-r-4 border-fuchsia-200 ${detailDesktopCellBgClass}"><input class="w-4 h-4 align-middle accent-emerald-600 border-gray-300 rounded" type="checkbox" id="perm-admin-ops-desktop-${safeId}" ${perms.canAccessAdminOpsDesktop ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="px-2 py-3 align-middle text-center border-l-4 border-sky-200 ${detailMobileCellBgClass}"><input class="w-4 h-4 align-middle accent-fuchsia-600 border-gray-300 rounded" type="checkbox" id="perm-master-access-mobile-${safeId}" ${perms.canAccessMasterSettingsMobile ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="px-2 py-3 align-middle text-center ${detailMobileCellBgClass}"><input class="w-4 h-4 align-middle accent-amber-600 border-gray-300 rounded" type="checkbox" id="perm-manage-mobile-${safeId}" ${perms.canManageUsersMobile ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                <td class="px-2 py-3 align-middle text-center border-r-2 border-sky-100 ${detailMobileCellBgClass}"><input class="w-4 h-4 align-middle accent-emerald-600 border-gray-300 rounded" type="checkbox" id="perm-admin-ops-mobile-${safeId}" ${perms.canAccessAdminOpsMobile ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>`;
            const activeGroupCells = isCalendarOpen ? calendarCells : (isApproveOpen ? approveCells : (isMemberStatusOpen ? memberStatusCells : (isSituationOpen ? situationCells : (isWorkReportOpen ? workReportCells : (isBoardOpen ? boardCells : detailCells)))));

            return `<tr class="${rowClass}">
                <td class="p-3 align-middle font-bold ${nameBorderClass} ${infoCellBgClass}">${user.name}${isMasterRow ? ' (MASTER)' : ''}${roleBadges}</td>
                <td class="p-3 align-middle text-sm text-gray-600 ${infoCellBgClass}">${user.dept || '-'}</td>
                <td class="p-3 align-middle text-sm text-gray-600 ${infoCellBgClass}">${user.rank || '-'}</td>
                <td class="p-3 align-middle text-sm text-gray-600 ${infoCellBgClass}">${app.getRoleLabelKo(user)}</td>
                ${activeGroupCells}
            </tr>`;
        }).join('');

        const settingsPanel = `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
            <p class="text-sm font-bold text-gray-700 mb-2">?ㅼ젙 ?뚯씠釉?/p>
            <p class="text-xs text-gray-500">湲곕뒫 耳쒓린/?꾧린瑜?愿由ы빀?덈떎.</p>
            <div class="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-bold text-gray-700">吏곸썝 移대뱶 湲곕뒫</p>
                    <p class="text-xs text-gray-500">?곗감?꾪솴 ?대쫫 ?곸뿭 ?대┃ ??吏곸썝 移대뱶(?곕씫泥??щ쾲/遺꾧린 洹쇰Т?쒓컙) ?쒖떆</p>
                </div>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="global-member-card-toggle" class="sr-only peer" ${memberCardEnabled ? 'checked' : ''}>
                    <div class="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-4 after:h-4 after:bg-white after:border after:border-gray-300 after:rounded-full after:transition-all"></div>
                    <span class="ml-2 text-sm font-bold ${memberCardEnabled ? 'text-indigo-700' : 'text-gray-500'}">${memberCardEnabled ? '耳쒖쭚' : '爰쇱쭚'}</span>
                </label>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-bold text-gray-700">?덊럹?댁? 湲곕뒫</p>
                    <p class="text-xs text-gray-500">異뷀썑 媛쒕컻 媛?ν븳 ?뚯궗 ?덊럹?댁? 硫붾돱 ?쒖떆 ?덉슜</p>
                </div>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="global-homepage-toggle" class="sr-only peer" ${homepageEnabled ? 'checked' : ''}>
                    <div class="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-4 after:h-4 after:bg-white after:border after:border-gray-300 after:rounded-full after:transition-all"></div>
                    <span class="ml-2 text-sm font-bold ${homepageEnabled ? 'text-indigo-700' : 'text-gray-500'}">${homepageEnabled ? '耳쒖쭚' : '爰쇱쭚'}</span>
                </label>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-bold text-gray-700">寃뚯떆??湲곕뒫</p>
                    <p class="text-xs text-gray-500">?곷떒 硫붾돱??寃뚯떆??踰꾪듉 ?쒖떆 諛?寃뚯떆???ъ슜 ?덉슜</p>
                </div>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="global-board-toggle" class="sr-only peer" ${boardEnabled ? 'checked' : ''}>
                    <div class="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-4 after:h-4 after:bg-white after:border after:border-gray-300 after:rounded-full after:transition-all"></div>
                    <span class="ml-2 text-sm font-bold ${boardEnabled ? 'text-indigo-700' : 'text-gray-500'}">${boardEnabled ? '耳쒖쭚' : '爰쇱쭚'}</span>
                </label>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-100">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <p class="text-sm font-bold text-gray-700">?밸퀎?닿? 醫낅쪟</p>
                        <p class="text-xs text-gray-500">?ш린??醫낅쪟瑜?留뚮뱾怨?耳쒕㈃ 吏곸썝 ?섏젙李쎌뿉??泥댄겕諛뺤뒪濡?遺?ы븷 ???덉뒿?덈떎.</p>
                    </div>
                    <button type="button" onclick="app.toggleSpecialLeaveSettings()" class="px-3 py-1.5 rounded-lg border border-indigo-100 text-indigo-700 text-sm font-bold hover:bg-indigo-50">${app.specialLeaveSettingsOpen ? '닫기' : '펼치기'}</button>
                </div>
                ${app.specialLeaveSettingsOpen ? `<div class="flex flex-col md:flex-row gap-2 mb-3">
                    <input id="special-leave-new-type-label" type="text" placeholder="?? 蹂묎?, 異쒖궛?닿?, 寃쎌“?닿?" class="flex-1 border bg-gray-50 p-2.5 rounded-lg">
<button type="button" onclick="app.addSpecialLeaveTypeFromInput()" class="px-4 py-2.5 rounded-lg text-sm font-bold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 shrink-0">異붽?</button>
                </div>
                <div id="special-leave-type-settings-list" class="space-y-3">
                    ${app.getSortedSpecialLeaveTypes({ enabledOnly: false }).map((type, index) => app.renderSpecialLeaveTypeSettingRow(type, index)).join('')}
                </div>` : `<div class="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-400 text-center">?밸퀎?닿? 醫낅쪟媛 ?묓? ?덉뒿?덈떎. ?꾩슂?????쇱퀜???섏젙?섏꽭??</div>`}
            </div>
        </div>`;
        const workReportSettingsPanel = `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
            <p class="text-sm font-bold text-gray-700 mb-2">?붿뾽/?밴렐 ?ㅼ젙</p>
            <p class="text-xs text-gray-500">?붿뾽/?밴렐 ?좎껌 湲곕뒫怨??댁쁺 洹쒖튃??愿由ы빀?덈떎.</p>
            <div class="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-bold text-gray-700">?붿뾽 ?좎껌 湲곕뒫</p>
                    <p class="text-xs text-gray-500">吏곸썝??媛쒖씤 ?λ????붿뾽??湲곕줉?섍퀬 ?뱀씤 ?붿껌?????덉뒿?덈떎.</p>
                </div>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="global-overtime-toggle" class="sr-only peer" ${overtimeEnabled ? 'checked' : ''}>
                    <div class="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-4 after:h-4 after:bg-white after:border after:border-gray-300 after:rounded-full after:transition-all"></div>
                    <span class="ml-2 text-sm font-bold ${overtimeEnabled ? 'text-indigo-700' : 'text-gray-500'}">${overtimeEnabled ? '耳쒖쭚' : '爰쇱쭚'}</span>
                </label>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-bold text-gray-700">?밴렐 ?좎껌 湲곕뒫</p>
                    <p class="text-xs text-gray-500">吏곸썝??媛쒖씤 ?λ????밴렐??湲곕줉?섍퀬 ?뱀씤 ?붿껌?????덉뒿?덈떎.</p>
                </div>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="global-holiday-work-toggle" class="sr-only peer" ${holidayWorkEnabled ? 'checked' : ''}>
                    <div class="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-4 after:h-4 after:bg-white after:border after:border-gray-300 after:rounded-full after:transition-all"></div>
                    <span class="ml-2 text-sm font-bold ${holidayWorkEnabled ? 'text-indigo-700' : 'text-gray-500'}">${holidayWorkEnabled ? '耳쒖쭚' : '爰쇱쭚'}</span>
                </label>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-100 rounded-xl bg-slate-50 px-4 py-3 text-xs text-gray-600 space-y-1">
                <p>?뺤궛 湲곌컙? 留ㅼ썡 16??~ ?ㅼ쓬??15?쇱엯?덈떎.</p>
                <p>?뱀씤 ?붿껌? 16?? ?댁씪??寃쎌슦 李⑥＜ ?붿슂?쇰???媛?ν빀?덈떎.</p>
                <p>?쒖텧 ?꾩뿉???섏젙???좉린怨? 諛섎젮?섎㈃ ?ㅼ떆 ?섏젙?????덉뒿?덈떎.</p>
            </div>
        </div>`;
        const mailPanel = `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
            <p class="text-sm font-bold text-gray-700 mb-2">硫붿씪 ?ㅼ젙</p>
            <p class="text-xs text-gray-500 mb-4">?좎껌, ?뱀씤, 諛섎젮, 痍⑥냼 硫붿씪 紐⑤몢 媛숈? To/CC ?ㅼ젙???ъ슜?⑸땲??</p>
            <div class="space-y-4">
                ${app.getMailRouteTargets().map((target) => app.renderMailRouteSection(target.dept, target.roleGroup)).join('')}
            </div>
        </div>`;

        const deptFilterButtons = `
            <div class="inline-flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200 shadow-inner">
                <button onclick="app.setPermissionDeptFilter('all')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${deptFilter === 'all' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-gray-600 hover:text-slate-800'}">?꾨?</button>
                <button onclick="app.setPermissionDeptFilter('manual')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${deptFilter === 'manual' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-600 hover:text-indigo-700'}">留ㅻ돱?쇳?</button>
                <button onclick="app.setPermissionDeptFilter('parts')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${deptFilter === 'parts' ? 'bg-white text-sky-700 shadow-sm border border-sky-100' : 'text-gray-600 hover:text-sky-700'}">?뚯툩遺곹?</button>
            </div>`;
        const groupButtons = `<div class="px-4 pt-4 pb-2 bg-white">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div class="inline-flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200 shadow-inner">
                    <button onclick="app.setPermissionColumnOpen('calendar')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isCalendarOpen ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-600 hover:text-indigo-700'}">달력정보</button>
                    <button onclick="app.setPermissionColumnOpen('approve')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isApproveOpen ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' : 'text-gray-600 hover:text-emerald-700'}">승인권한</button>
                    <button onclick="app.setPermissionColumnOpen('memberStatus')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isMemberStatusOpen ? 'bg-white text-violet-700 shadow-sm border border-violet-100' : 'text-gray-600 hover:text-violet-700'}">팀원 연차현황</button>
                    <button onclick="app.setPermissionColumnOpen('situation')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isSituationOpen ? 'bg-white text-rose-700 shadow-sm border border-rose-100' : 'text-gray-600 hover:text-rose-700'}">전체 상황판</button>
                    <button onclick="app.setPermissionColumnOpen('workreport')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isWorkReportOpen ? 'bg-white text-slate-700 shadow-sm border border-slate-200' : 'text-gray-600 hover:text-slate-700'}">잔업/특근</button>
                    <button onclick="app.setPermissionColumnOpen('board')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isBoardOpen ? 'bg-white text-cyan-700 shadow-sm border border-cyan-100' : 'text-gray-600 hover:text-cyan-700'}">게시판</button>
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
                ? `<th class="p-3 bg-emerald-50 border-b border-gray-200 text-center border-l border-emerald-100">留ㅻ돱??/th>
                    <th class="p-3 bg-emerald-50 border-b border-gray-200 text-center">?뚯툩遺?/th>
                    <th class="p-3 bg-emerald-50 border-b border-gray-200 text-center border-r border-emerald-100">紐⑤몢</th>`
                : (isMemberStatusOpen
                    ? `<th class="p-3 bg-violet-50 border-b border-gray-200 text-center border-l border-violet-100">留ㅻ돱??/th>
                        <th class="p-3 bg-violet-50 border-b border-gray-200 text-center">?뚯툩遺?/th>
                        <th class="p-3 bg-violet-50 border-b border-gray-200 text-center border-r border-violet-100">紐⑤몢</th>`
                    : (isSituationOpen
                        ? `<th class="px-2 py-2.5 bg-rose-50 border-b border-gray-200 text-center border-l border-rose-100">
                                <div class="flex flex-col items-center gap-0.5 leading-tight">
                                    <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700">PC</span>
                                    <span class="text-[12px]">?꾩껜 ?곹솴??/span>
                                </div>
                            </th>
                            <th class="px-2 py-2.5 bg-orange-50 border-b border-gray-200 text-center border-r border-rose-100">
                                <div class="flex flex-col items-center gap-0.5 leading-tight">
                                    <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-orange-700">紐⑤컮??/span>
                                    <span class="text-[12px]">?꾩껜 ?곹솴??/span>
                                </div>
                            </th>`
                    : (isWorkReportOpen
                        ? `<th class="p-3 bg-slate-50 border-b border-gray-200 text-center border-l border-slate-200">留ㅻ돱?쇳?</th>
                            <th class="p-3 bg-slate-50 border-b border-gray-200 text-center">?뚯툩遺곹?</th>
                            <th class="p-3 bg-slate-50 border-b border-gray-200 text-center border-r border-slate-200">紐⑤몢</th>`
                    : `<th class="px-2 py-2.5 bg-fuchsia-50 border-b border-gray-200 text-center border-l border-fuchsia-100">
                            <div class="flex flex-col items-center gap-0.5 leading-tight">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-fuchsia-100 text-fuchsia-700">PC</span>
                                <span class="text-[12px]">沅뚰븳/?ㅼ젙<br>?묎렐</span>
                            </div>
                        </th>
                        <th class="px-2 py-2.5 bg-amber-50 border-b border-gray-200 text-center">
                            <div class="flex flex-col items-center gap-0.5 leading-tight">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-fuchsia-100 text-fuchsia-700">PC</span>
                                <span class="text-[12px]">援ъ꽦??愿由?/span>
                            </div>
                        </th>
                        <th class="px-2 py-2.5 bg-emerald-50 border-b border-r-4 border-fuchsia-200 border-gray-200 text-center">
                            <div class="flex flex-col items-center gap-0.5 leading-tight">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-fuchsia-100 text-fuchsia-700">PC</span>
                                <span class="text-[12px]">?댁쁺???묎렐</span>
                            </div>
                        </th>
                        <th class="px-2 py-2.5 bg-sky-50 border-b border-l-4 border-sky-200 border-gray-200 text-center">
                            <div class="flex flex-col items-center gap-0.5 leading-tight">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-700">紐⑤컮??/span>
                                <span class="text-[12px]">沅뚰븳/?ㅼ젙<br>?묎렐</span>
                            </div>
                        </th>
                        <th class="px-2 py-2.5 bg-cyan-50 border-b border-gray-200 text-center">
                            <div class="flex flex-col items-center gap-0.5 leading-tight">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-700">紐⑤컮??/span>
                                <span class="text-[12px]">援ъ꽦??愿由?/span>
                            </div>
                        </th>
                        <th class="px-2 py-2.5 bg-teal-50 border-b border-gray-200 text-center border-r border-sky-100">
                            <div class="flex flex-col items-center gap-0.5 leading-tight">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-700">紐⑤컮??/span>
                                <span class="text-[12px]">?댁쁺???묎렐</span>
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
        const resolvedActiveGroupTitle = isBoardOpen ? '寃뚯떆??沅뚰븳' : activeGroupTitle;
        const resolvedActiveGroupHeaderClass = isBoardOpen ? 'bg-cyan-50 text-cyan-700 border-l border-cyan-100 border-r' : activeGroupHeaderClass;
        const resolvedActiveGroupSubHeader = isBoardOpen
            ? `<th class="p-3 bg-cyan-50 border-b border-gray-200 text-center border-l border-cyan-100">?쎄린</th>
                <th class="p-3 bg-cyan-50 border-b border-gray-200 text-center border-r border-cyan-100">?곌린</th>`
            : activeGroupSubHeader;
        const resolvedActiveGroupColSpan = isBoardOpen ? 2 : activeGroupColSpan;
        const resolvedPermissionColGroup = isBoardOpen
            ? `<colgroup>
                <col style="width: 190px;">
                <col style="width: 120px;">
                <col style="width: 100px;">
                <col style="width: 100px;">
                <col style="width: 118px;">
                <col style="width: 118px;">
            </colgroup>`
            : permissionColGroup;
        const permissionTableMinWidth = isBoardOpen
            ? 'min-w-[930px]'
            : (isCalendarOpen ? 'min-w-[980px]' : (isDetailOpen ? 'min-w-[1190px]' : (isSituationOpen ? 'min-w-[930px]' : (isWorkReportOpen ? 'min-w-[980px]' : 'min-w-[1140px]'))));
        const permissionPanel = `<div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div class="p-4 border-b border-gray-200">
                <p class="text-sm font-bold text-gray-700">沅뚰븳 ??/p>
                <p class="text-sm text-gray-600">吏곸썝蹂꾨줈 泥댄겕諛뺤뒪瑜??좏깮?섏꽭??</p>
                <p class="text-sm text-gray-600">?뱀씤 沅뚰븳? 留ㅻ돱?쇳?/?뚯툩遺곹?/紐⑤몢 以??섎굹留?泥댄겕?섏꽭??</p>
                <p class="text-sm text-gray-600">????곗감?꾪솴 沅뚰븳??留ㅻ돱?쇳?/?뚯툩遺곹?/紐⑤몢 以??섎굹留?泥댄겕?섏꽭??</p>
                <p class="text-sm text-gray-600">?몃??ㅼ젙?먯꽌??PC? 紐⑤컮??沅뚰븳??媛곴컖 遺꾨━??愿由ы빀?덈떎.</p>
                <p class="text-sm text-gray-600">??踰덉뿉 1媛?洹몃９留??쇱퀜吏묐땲?? ?ㅻⅨ 洹몃９? ?먮룞?쇰줈 ?ロ옓?덈떎.</p>
                <div class="mt-2 text-xs text-gray-500 flex flex-wrap gap-2 items-center">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">?由щ뜑 ??媛뺤“</span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">?????媛뺤“</span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">?뚰듃由щ뜑 ??媛뺤“</span>
                </div>
            </div>
            <div class="overflow-x-auto">
                ${groupButtons}
                <table id="master-perm-table" class="w-full text-sm table-fixed ${permissionTableMinWidth}">
                    ${resolvedPermissionColGroup}
                    <thead class="bg-gray-50">
                        <tr>
                            <th rowspan="2" class="p-3 text-left bg-gray-50 border-b border-gray-200">?대쫫</th>
                            <th rowspan="2" class="p-3 text-left bg-gray-50 border-b border-gray-200">遺??/th>
                            <th rowspan="2" class="p-3 text-left bg-gray-50 border-b border-gray-200">吏곴툒</th>
                            <th rowspan="2" class="p-3 text-left bg-gray-50 border-b border-gray-200">?좏삎</th>
                            <th colspan="${resolvedActiveGroupColSpan}" class="p-3 text-center border-b border-gray-200 ${resolvedActiveGroupHeaderClass}">${resolvedActiveGroupTitle}</th>
                        </tr>
                        <tr>
                            ${resolvedActiveGroupSubHeader}
                        </tr>
                    </thead>
                    <tbody>${rows || `<tr><td colspan="${4 + resolvedActiveGroupColSpan}" class="p-6 text-center text-sm text-gray-400 bg-white">?좏깮??????대떦?섎뒗 吏곸썝???놁뒿?덈떎.</td></tr>`}</tbody>
                </table>
            </div>
        </div>`;
        const saveButton = activeTab === 'permissions'
            ? `<button onclick="app.saveMasterPermissionTable()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700">沅뚰븳 ???/button>`
            : ((activeTab === 'settings' || activeTab === 'workreport')
                ? `<button onclick="app.saveMasterSettings()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700">?ㅼ젙 ???/button>`
                : (activeTab === 'mail'
                    ? `<button onclick="app.saveMailSettings()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700">硫붿씪 ?ㅼ젙 ???/button>`
                    : ''));
        const topTabs = `<div class="px-4 pt-3 bg-gray-100/80 border-b border-gray-200">
            <div class="flex items-end gap-1">
                ${hasFullMasterAccess ? `<button onclick="app.setMasterPermissionTab('permissions')" class="px-4 py-2 rounded-t-xl font-bold border transition ${activeTab === 'permissions' ? 'bg-white text-gray-900 border-gray-300 border-b-white -mb-px shadow-sm' : 'bg-gray-200 text-gray-600 border-transparent hover:bg-gray-100'}">沅뚰븳 ??/button>
                <button onclick="app.setMasterPermissionTab('settings')" class="px-4 py-2 rounded-t-xl font-bold border transition ${activeTab === 'settings' ? 'bg-white text-gray-900 border-gray-300 border-b-white -mb-px shadow-sm' : 'bg-gray-200 text-gray-600 border-transparent hover:bg-gray-100'}">?ㅼ젙 ?뚯씠釉?/button>
                <button onclick="app.setMasterPermissionTab('mail')" class="px-4 py-2 rounded-t-xl font-bold border transition ${activeTab === 'mail' ? 'bg-white text-gray-900 border-gray-300 border-b-white -mb-px shadow-sm' : 'bg-gray-200 text-gray-600 border-transparent hover:bg-gray-100'}">硫붿씪 ?ㅼ젙</button>
                <button onclick="app.setMasterPermissionTab('workreport')" class="px-4 py-2 rounded-t-xl font-bold border transition ${activeTab === 'workreport' ? 'bg-white text-gray-900 border-gray-300 border-b-white -mb-px shadow-sm' : 'bg-gray-200 text-gray-600 border-transparent hover:bg-gray-100'}">?붿뾽/?밴렐 ?ㅼ젙</button>` : ''}
                <button onclick="app.setMasterPermissionTab('ops')" class="px-4 py-2 rounded-t-xl font-bold border transition ${activeTab === 'ops' ? 'bg-white text-gray-900 border-gray-300 border-b-white -mb-px shadow-sm' : 'bg-gray-200 text-gray-600 border-transparent hover:bg-gray-100'}">?댁쁺??/button>
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
        ${appData.meta.permissionsFromDb ? '' : `<div class="mt-3 mb-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">?꾩옱 DB媛 沅뚰븳 而щ읆???꾩쭅 ?쎌? 紐삵븯怨??덉뒿?덈떎. 理쒖떊 ?쒕쾭 踰꾩쟾?쇰줈 ?ㅼ떆 諛고룷?댁＜?몄슂.</div>`}
                </div>
                <div class="px-4 py-4 border-t border-gray-200 bg-gray-50/70 flex justify-end">
                    ${saveButton}
                </div>
            </div>
        </div>${app.getModal()}`;
    },
});

