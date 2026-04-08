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

        fmtDate: (dateStr) => new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }),
        setLoginScreenLayout: (enabled) => {
            document.body.classList.toggle('login-screen-active', !!enabled);
        },
        fmtTime: function(h) { const d = Math.floor(h / 8), r = h % 8; if (d > 0) return r > 0 ? d + "일 " + r + "시간" : d + "일"; return r + "시간"; },
        formatDayCount: (hours) => {
            const day = Number(hours || 0) / 8;
            if (!Number.isFinite(day)) return '0';
            if (Number.isInteger(day)) return String(day);
            return String(day.toFixed(2).replace(/\.?0+$/, ''));
        },
        getUsageGaugePercent: (usedHours, totalHours) => {
            const total = Number(totalHours || 0);
            const used = Number(usedHours || 0);
            if (!Number.isFinite(total) || total <= 0) return 0;
            if (!Number.isFinite(used) || used <= 0) return 0;
            return Math.max(0, Math.min(100, (used / total) * 100));
        },
        getRoleLabelKo: (user) => {
            if (!user) return '직원';
            const role = security.normalizeRole(String(user.role || ''));
            if (role === 'master') return '마스터';
            if (role === 'ceo') return '대표';
            if (role === 'team_leader') return '팀리더';
            if (role === 'part_leader') return '파트리더';
            return '직원';
        },
        getEnglishRoleLabel: (user) => {
            if (!user) return '';
            const role = security.normalizeRole(String(user.role || ''));
            if (role === 'master') return 'MASTER';
            if (role === 'ceo') return 'CEO';
            if (role === 'team_leader') return 'TEAM LEADER';
            if (role === 'part_leader') return 'PART LEADER';
            return 'EMPLOYEE';
        },
        getUserTitleText: (user) => {
            if (!user) return '-';
            const role = security.normalizeRole(String(user.role || ''));
            if (role === 'team_leader') return user.rank && user.rank !== '팀장' ? `팀리더 / ${user.rank}` : '팀리더';
            if (role === 'part_leader') return user.rank ? `파트리더 / ${user.rank}` : '파트리더';
            if (role === 'master') return user.rank || '마스터';
            if (role === 'ceo') return user.rank || '대표';
            return user.rank || '직원';
        },
        getSpecialLeaveColorClasses: (color) => {
            const safe = security.normalizeSpecialLeaveColor(color);
            if (safe === 'rose') return 'text-rose-700 bg-rose-50 border-rose-100';
            if (safe === 'sky') return 'text-sky-700 bg-sky-50 border-sky-100';
            if (safe === 'emerald') return 'text-emerald-700 bg-emerald-50 border-emerald-100';
            if (safe === 'amber') return 'text-amber-700 bg-amber-50 border-amber-100';
            if (safe === 'violet') return 'text-violet-700 bg-violet-50 border-violet-100';
            if (safe === 'indigo') return 'text-indigo-700 bg-indigo-50 border-indigo-100';
            return 'text-slate-700 bg-slate-50 border-slate-100';
        },
        getSortedSpecialLeaveTypes: (options = {}) => {
            const enabledOnly = !!options.enabledOnly;
            const types = Array.isArray(appData.specialLeaveTypes) ? appData.specialLeaveTypes : [];
            return types
                .filter((item) => item && item.typeKey)
                .filter((item) => !enabledOnly || item.enabled)
                .sort((a, b) =>
                    Number(a.sortOrder || 0) - Number(b.sortOrder || 0) ||
                    String(a.label || '').localeCompare(String(b.label || ''), 'ko')
                );
        },
        getSpecialLeaveTypeMeta: (typeKey) => {
            const safeTypeKey = security.normalizeSpecialLeaveTypeKey(typeKey);
            return app.getSortedSpecialLeaveTypes({ enabledOnly: false }).find((item) => item.typeKey === safeTypeKey) || null;
        },
        getSpecialLeaveRequestMode: (typeKey) => {
            const meta = app.getSpecialLeaveTypeMeta(typeKey);
            return security.normalizeSpecialLeaveRequestMode(meta && meta.requestMode);
        },
        getSpecialLeaveDayCountMode: (typeKey) => {
            const meta = app.getSpecialLeaveTypeMeta(typeKey);
            return security.normalizeSpecialLeaveDayCountMode(meta && meta.dayCountMode);
        },
        canRequestSpecialLeaveOnHoliday: (typeKey) => {
            const meta = app.getSpecialLeaveTypeMeta(typeKey);
            return !!(meta && meta.allowHolidayRequest);
        },
        getSpecialLeaveRawEntry: (userId, typeKey) => {
            const safeUserId = security.cleanInlineValue(userId);
            const safeTypeKey = security.normalizeSpecialLeaveTypeKey(typeKey);
            return (Array.isArray(appData.userSpecialLeaves) ? appData.userSpecialLeaves : []).find((item) =>
                String(item.userId) === String(safeUserId) && String(item.typeKey) === String(safeTypeKey)
            ) || null;
        },
        isSpecialLeaveRequest: (req) => !!security.normalizeSpecialLeaveTypeKey(req && req.specialLeaveTypeKey),
        getWorkReportCategory: (req) => {
            const safeCategory = security.cleanInlineValue(req && req.reportCategory || '');
            if (safeCategory === 'overtime' || safeCategory === 'holiday_work') return safeCategory;
            const safeType = security.normalizeType((req && req.type) || '');
            if (safeType === '잔업') return 'overtime';
            if (safeType === '특근') return 'holiday_work';
            return '';
        },
        isWorkReportRequest: (req) => ['overtime', 'holiday_work'].includes(app.getWorkReportCategory(req)),
        getRequestDisplayType: (req) => {
            if (!req) return '연차';
            if (app.isSpecialLeaveRequest(req)) {
                const meta = app.getSpecialLeaveTypeMeta(req.specialLeaveTypeKey);
                const label = security.cleanText(req.specialLeaveTypeLabel || (meta && meta.label) || '');
                const baseType = security.normalizeType(req.type);
                if (label && baseType && baseType !== '연차') return `특별연차(${label}/${baseType})`;
                return label ? `특별연차(${label})` : '특별연차';
            }
            return security.normalizeType(req.type);
        },
        formatRequestPeriodText: (req) => {
            if (!req) return '-';
            const start = security.normalizeDate(req.startDate, '');
            const end = security.normalizeDate(req.endDate, start);
            const dateRange = start && end
                ? (start === end ? start : `${start} ~ ${end}`)
                : '-';
            const timeRange = security.cleanText(req.timeRange || '');
            return timeRange ? `${dateRange} (${timeRange})` : dateRange;
        },
        buildRequestChangeSummary: (oldReq, newReq) => {
            const changes = [
                { label: '종류', oldValue: app.getRequestDisplayType(oldReq), newValue: app.getRequestDisplayType(newReq) },
                { label: '기간', oldValue: app.formatRequestPeriodText(oldReq), newValue: app.formatRequestPeriodText(newReq) },
                { label: '사유', oldValue: security.cleanText((oldReq && oldReq.reason) || '-') || '-', newValue: security.cleanText((newReq && newReq.reason) || '-') || '-' },
                { label: '차감', oldValue: app.formatDeductionText(oldReq), newValue: app.formatDeductionText(newReq) }
            ].filter((item) => String(item.oldValue) !== String(item.newValue));

            if (!changes.length) {
                return '- 변경된 항목 없음';
            }

            return changes.map((item) => `- ${item.label}: ${item.oldValue} -> ${item.newValue}`).join('\n');
        },
        getRequestTypePriority: (req) => {
            if (app.isSpecialLeaveRequest(req)) return 1;
            const type = security.normalizeType((req && req.type) || '');
            const typePriority = { '연차': 1, '반차': 2, '반차(오전)': 2, '반차(오후)': 2, '시간차(퇴근)': 3, '시간차(외출)': 4, '잔업': 5, '특근': 6 };
            return typePriority[type] || 99;
        },
        getRequestBadgeClass: (req) => {
            if (app.isSpecialLeaveRequest(req)) {
                const meta = app.getSpecialLeaveTypeMeta(req.specialLeaveTypeKey);
                const safe = security.normalizeSpecialLeaveColor(meta && meta.color);
                if (safe === 'rose') return 'bg-rose-100 text-rose-700';
                if (safe === 'sky') return 'bg-sky-100 text-sky-700';
                if (safe === 'emerald') return 'bg-emerald-100 text-emerald-700';
                if (safe === 'amber') return 'bg-amber-100 text-amber-700';
                if (safe === 'violet') return 'bg-violet-100 text-violet-700';
                if (safe === 'indigo') return 'bg-indigo-100 text-indigo-700';
                return 'bg-slate-100 text-slate-700';
            }
            const displayType = security.normalizeType((req && req.type) || '');
            if (displayType === '연차') return 'bg-lime-200 text-lime-900';
            if (app.isHalfDayType(displayType)) return 'bg-orange-100 text-orange-800';
            if (displayType === '시간차(퇴근)') return 'bg-cyan-100 text-cyan-800';
            if (displayType === '시간차(외출)') return 'bg-violet-100 text-violet-800';
            if (displayType === '잔업') return 'bg-slate-100 text-slate-800';
            if (displayType === '특근') return 'bg-rose-100 text-rose-800';
            return 'bg-gray-100 text-gray-700';
        },
        getRequestStatusText: (status) => {
            const safe = security.normalizeStatus(status);
            if (safe === 'reported') return '보고 완료';
            if (safe === 'approved') return '승인 완료';
            if (safe === 'pending') return '승인 대기';
            if (safe === 'rejected') return '반려됨';
            if (safe === 'cancel_requested') return '취소 요청중';
            if (safe === 'cancelled') return '취소됨';
            return '상태 없음';
        },
        getRequestStatusClasses: (status) => {
            const safe = security.normalizeStatus(status);
            if (safe === 'reported') return 'bg-sky-100 text-sky-700';
            if (safe === 'approved') return 'bg-green-100 text-green-700';
            if (safe === 'pending') return 'bg-yellow-100 text-yellow-700';
            if (safe === 'rejected') return 'bg-red-100 text-red-700';
            if (safe === 'cancel_requested') return 'bg-amber-100 text-amber-800';
            if (safe === 'cancelled') return 'bg-gray-200 text-gray-500';
            return 'bg-gray-100 text-gray-500';
        },
        getSpecialRequestOptionValue: (typeKey) => `special:${security.normalizeSpecialLeaveTypeKey(typeKey)}`,
        parseRequestTypeSelection: (value) => {
            const raw = String(value || '').trim();
            if (raw.startsWith('special:')) {
                const typeKey = security.normalizeSpecialLeaveTypeKey(raw.slice('special:'.length));
                const meta = app.getSpecialLeaveTypeMeta(typeKey);
                return {
                    uiValue: app.getSpecialRequestOptionValue(typeKey),
                    baseType: '연차',
                    isSpecial: true,
                    specialLeaveTypeKey: typeKey,
                    specialLeaveTypeLabel: meta ? meta.label : '',
                    requestMode: security.normalizeSpecialLeaveRequestMode(meta && meta.requestMode),
                    grantHours: Number(meta && meta.grantHours || 0),
                    allowHolidayRequest: !!(meta && meta.allowHolidayRequest),
                    dayCountMode: security.normalizeSpecialLeaveDayCountMode(meta && meta.dayCountMode)
                };
            }
            const normalized = security.normalizeType(raw);
            return {
                uiValue: normalized,
                baseType: normalized,
                isSpecial: false,
                specialLeaveTypeKey: '',
                specialLeaveTypeLabel: '',
                requestMode: 'same_as_annual',
                grantHours: 0,
                allowHolidayRequest: false,
                dayCountMode: 'business_days'
            };
        },
        getSpecialModeOptionsHtml: (selectedValue = '연차') => {
            const safeSelected = security.normalizeType(selectedValue || '연차');
            const options = [
                { value: '연차', label: '연차' },
                { value: '반차(오전)', label: '반차 (4시간/오전)' },
                { value: '반차(오후)', label: '반차 (4시간/오후)' },
                { value: '시간차(퇴근)', label: '시간차(퇴근)' },
                { value: '시간차(외출)', label: '시간차(외출)' }
            ];
            return options.map((option) => `<option value="${option.value}" ${option.value === safeSelected ? 'selected' : ''}>${option.label}</option>`).join('');
        },
        getCurrentRequestSelection: () => {
            const typeEl = document.getElementById('req-type');
            const specialModeEl = document.getElementById('req-special-mode');
            const selection = app.parseRequestTypeSelection(typeEl ? typeEl.value : '연차');
            if (selection.isSpecial && selection.requestMode === 'same_as_annual') {
                selection.baseType = security.normalizeType(specialModeEl ? specialModeEl.value : '연차');
            } else if (selection.isSpecial) {
                selection.baseType = '연차';
            }
            return selection;
        },
        getRequestEditSelectionValue: (req) => {
            if (app.isSpecialLeaveRequest(req)) {
                return app.getSpecialRequestOptionValue(req.specialLeaveTypeKey);
            }
            return security.normalizeType((req && req.type) || '연차');
        },
        getUserSpecialLeaveEntries: (userId, options = {}) => {
            const safeUserId = security.cleanInlineValue(userId);
            const enabledOnly = !!options.enabledOnly;
            const includeZero = !!options.includeZero;
            const types = app.getSortedSpecialLeaveTypes({ enabledOnly });
            const userMap = new Map(
                (Array.isArray(appData.userSpecialLeaves) ? appData.userSpecialLeaves : [])
                    .filter((item) => String(item.userId) === String(safeUserId))
                    .map((item) => [item.typeKey, item])
            );
            return types
                .map((type) => {
                    const saved = userMap.get(type.typeKey) || {};
                    const totalHours = Number(saved.totalHours || 0);
                    const manualUsedHours = Number(saved.usedHours || 0);
                    const relatedRequests = (Array.isArray(appData.requests) ? appData.requests : []).filter((req) =>
                        String(req.userId) === String(safeUserId) &&
                        security.normalizeSpecialLeaveTypeKey(req.specialLeaveTypeKey) === type.typeKey
                    );
                    let requestUsedHours = 0;
                    let pendingHours = 0;
                    relatedRequests.forEach((req) => {
                        const hours = Number(req.hours || 0);
                        if (['approved', 'cancel_requested'].includes(req.status)) requestUsedHours += hours;
                        else if (req.status === 'pending') pendingHours += hours;
                    });
                    const usedHours = manualUsedHours + requestUsedHours;
                    const remainingHours = totalHours - usedHours;
                    const availableHours = totalHours - usedHours - pendingHours;
                    return {
                        ...type,
                        userId: safeUserId,
                        totalHours,
                        manualUsedHours,
                        requestUsedHours,
                        pendingHours,
                        usedHours,
                        remainingHours,
                        availableHours,
                        granted: totalHours > 0 || usedHours > 0 || pendingHours > 0,
                        note: saved.note || ''
                    };
                })
                .filter((item) => includeZero || item.granted);
        },
        getAvailableSpecialLeaveEntries: (userId, options = {}) => {
            const includeTypeKey = security.normalizeSpecialLeaveTypeKey(options.includeTypeKey);
            return app.getUserSpecialLeaveEntries(userId, { enabledOnly: false, includeZero: false })
                .filter((item) => item.granted)
                .filter((item) => item.availableHours > 0 || item.typeKey === includeTypeKey);
        },
        getRequestTypeOptionsHtml: (selectedValue = '연차') => {
            const safeSelected = String(selectedValue || '연차');
            const requestUser = app.getRequestModalTargetUser();
            const regularOptions = [
                { value: '연차', label: '연차' },
                { value: '반차(오전)', label: '반차 (4시간/오전)' },
                { value: '반차(오후)', label: '반차 (4시간/오후)' },
                { value: '시간차(퇴근)', label: '시간차(퇴근)' },
                { value: '시간차(외출)', label: '시간차(외출)' }
            ];
            const selection = app.parseRequestTypeSelection(safeSelected);
            const specialOptions = requestUser
                ? app.getAvailableSpecialLeaveEntries(requestUser.id, { includeTypeKey: selection.specialLeaveTypeKey }).map((entry) => ({
                    value: app.getSpecialRequestOptionValue(entry.typeKey),
                    label: `특별연차(${entry.label})`
                }))
                : [];
            const shouldIncludeWorkReportOptions =
                !!app.adminRequestMode ||
                !!app.adminRequestEditMode ||
                ['잔업', '특근'].includes(selection.baseType);
            const workReportOptions = shouldIncludeWorkReportOptions
                ? app.getAvailableWorkReportTypes().map((type) => ({
                    value: type,
                    label: type
                }))
                : [];
            return [...regularOptions, ...specialOptions, ...workReportOptions]
                .map((option) => `<option value="${option.value}" ${option.value === safeSelected ? 'selected' : ''}>${option.label}</option>`)
                .join('');
        },
        refreshRequestTypeOptions: (selectedValue = '') => {
            const selectEl = document.getElementById('req-type');
            if (!selectEl) return;
            const nextValue = String(selectedValue || selectEl.value || '연차');
            selectEl.innerHTML = app.getRequestTypeOptionsHtml(nextValue);
            selectEl.value = nextValue;
        },
        getRequestBucketSummary: (user, selection, editingReq = null) => {
            if (!user) {
                return { ok: false, availableHours: 0, message: '사용자 정보가 없습니다.' };
            }
            if (selection && ['잔업', '특근'].includes(selection.baseType)) {
                return { ok: true, availableHours: Number.MAX_SAFE_INTEGER, bucket: 'report', label: selection.baseType };
            }
            if (selection && selection.isSpecial) {
                const entry = app.getUserSpecialLeaveEntries(user.id, { enabledOnly: false, includeZero: true })
                    .find((item) => item.typeKey === selection.specialLeaveTypeKey);
                if (!entry || !entry.granted) {
                    return { ok: false, availableHours: 0, message: '부여된 특별연차가 아닙니다.' };
                }
                let availableHours = Number(entry.availableHours || 0);
                if (
                    editingReq &&
                    editingReq.status === 'pending' &&
                    security.normalizeSpecialLeaveTypeKey(editingReq.specialLeaveTypeKey) === selection.specialLeaveTypeKey
                ) {
                    availableHours += Number(editingReq.hours || 0);
                }
                return {
                    ok: true,
                    bucket: 'special',
                    availableHours,
                    label: entry.label || selection.specialLeaveTypeLabel || '특별연차'
                };
            }

            const totalUsedAndPending = Number(user.usedHours || 0) + Number(user.pendingHours || 0);
            let availableHours = Number(user.totalHours || 0) - totalUsedAndPending;
            if (editingReq && editingReq.status === 'pending' && !app.isSpecialLeaveRequest(editingReq)) {
                availableHours += Number(editingReq.hours || 0);
            }
            return { ok: true, bucket: 'default', availableHours, label: '연차' };
        },
        renderSpecialLeaveSummary: (user, options = {}) => {
            const compact = !!options.compact;
            const entries = app.getUserSpecialLeaveEntries(user && user.id, { enabledOnly: true, includeZero: false });
            if (!entries.length) return '';
            return entries.map((entry) => {
                const colorClass = app.getSpecialLeaveColorClasses(entry.color);
                const remainClass = entry.remainingHours < 0 ? 'text-red-600' : 'text-gray-700';
                const percent = app.getUsageGaugePercent(entry.usedHours, entry.totalHours);
                const percentText = percent.toFixed(0).replace(/\.0$/, '');
                const gaugeWidth = percent <= 0 ? '0%' : (percent < 2 ? '2%' : `${percent}%`);
                const pendingText = entry.pendingHours > 0 ? `<div class="text-[11px] font-bold text-orange-500 mt-1">(승인 대기: ${app.fmtTime(entry.pendingHours)})</div>` : '';
                if (compact) {
                    return `<div class="rounded border px-2 py-1.5 ${colorClass}">
                        <div class="flex items-center justify-between gap-2 text-[10px]">
                            <span class="font-bold truncate">+ ${entry.label}</span>
                            <span class="font-bold ${remainClass}">${app.fmtTime(entry.remainingHours)} / ${app.fmtTime(entry.totalHours)}</span>
                        </div>
                        <div class="mt-1 h-1.5 rounded-full bg-white/70 border border-white/60 overflow-hidden">
                            <div class="h-full rounded-full bg-current opacity-70" style="width:${gaugeWidth}; ${percent <= 0 ? 'display:none;' : ''}"></div>
                        </div>
                    </div>`;
                }
                return `<div class="rounded-xl border px-4 py-3 ${colorClass}">
                    <div class="flex items-center justify-between gap-3">
                        <div class="text-sm font-bold">+ ${entry.label}</div>
                        <div class="text-sm font-bold ${entry.remainingHours < 0 ? 'text-red-600' : ''}">${app.fmtTime(entry.remainingHours)} <span class="text-xs text-gray-400 font-normal">/ ${app.fmtTime(entry.totalHours)}</span></div>
                    </div>
                    ${pendingText}
                    <div class="mt-2">
                        <div class="flex items-center justify-between text-[11px] font-bold text-gray-400 mb-1">
                            <span>사용 ${app.fmtTime(entry.usedHours)}</span>
                            <span>${percentText}%</span>
                        </div>
                        <div class="h-2.5 rounded-full bg-white/70 border border-white/80 overflow-hidden">
                            <div class="h-full rounded-full bg-current opacity-70" style="width:${gaugeWidth}; ${percent <= 0 ? 'display:none;' : ''}"></div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        },
        renderMyStatusCard: (user, options = {}) => {
            const titleClass = String(options.titleClass || 'text-2xl');
            const remainClass = String(options.remainClass || 'text-4xl');
            const totalClass = String(options.totalClass || 'text-lg');
            const subtitle = String(options.subtitle || '');
            const percent = app.getUsageGaugePercent(user.usedHours, user.totalHours);
            const percentText = percent.toFixed(0).replace(/\.0$/, '');
            const gaugeWidth = percent <= 0 ? '0%' : (percent < 2 ? '2%' : `${percent}%`);
            const specialLeaveHtml = app.renderSpecialLeaveSummary(user, { compact: false });
            return `<div class="bg-white p-6 rounded-2xl shadow-sm border mb-8">
                <div class="flex justify-between items-center gap-4">
                    <div>
                        <h2 class="${titleClass} font-bold whitespace-nowrap leading-tight">내 연차 현황</h2>
                        <p class="text-sm text-gray-500 mt-1">${subtitle}</p>
                    </div>
                    <div class="text-right">
                        <div class="${remainClass} font-bold text-indigo-600 whitespace-nowrap leading-none">${app.fmtTime(user.totalHours-user.usedHours)} <span class="${totalClass} text-gray-400 font-normal">/ ${app.fmtTime(user.totalHours)}</span></div>
                        ${user.pendingHours > 0 ? `<div class="text-sm font-bold text-orange-500 mt-1">(승인 대기: ${app.fmtTime(user.pendingHours)})</div>` : ''}
                    </div>
                </div>
                <div class="mt-5">
                    <div class="flex items-center justify-between text-xs font-bold text-gray-400 mb-2">
                        <span>사용 ${app.fmtTime(user.usedHours)}</span>
                        <span>${percentText}%</span>
                    </div>
                    <div class="h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                        <div class="h-full rounded-full bg-indigo-500 transition-all duration-300" style="width:${gaugeWidth}; ${percent <= 0 ? 'display:none;' : ''}"></div>
                    </div>
                </div>
                ${specialLeaveHtml ? `<div class="mt-4 pt-4 border-t border-gray-100 space-y-2">${specialLeaveHtml}</div>` : ''}
            </div>`;
        },
        isHalfDayType: (type) => ['반차', '반차(오전)', '반차(오후)'].includes(security.normalizeType(type)),
        isTimeOffType: (type) => ['시간차(퇴근)', '시간차(외출)'].includes(security.normalizeType(type)),
        getSituationBoardRequestCategory: (req) => {
            if (!req) return 'none';
            if (app.isWorkReportRequest(req)) return 'none';
            if (app.isSituationBoardLongAbsence(req)) return 'long';
            if (app.isSpecialLeaveRequest(req) || security.normalizeType(req.type) === '연차') return 'annual';
            if (app.isHalfDayType(req.type)) return 'halfday';
            if (security.normalizeType(req.type) === '시간차(퇴근)') return 'timeoff_leave';
            if (security.normalizeType(req.type) === '시간차(외출)') return 'timeoff_out';
            return 'other';
        },
        getSituationBoardRequestPresenceState: (req, dateStr, nowMoment = moment()) => {
            const safeDate = security.normalizeDate(dateStr, '');
            if (!req || !safeDate || !app.shouldRenderRequestOnDate(req, safeDate)) return { absent: false };
            const targetDay = moment(safeDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
            const isToday = targetDay.isValid() && targetDay.isSame(nowMoment.clone().startOf('day'), 'day');
            const status = String(req.status || '');
            const category = app.getSituationBoardRequestCategory(req);

            if (!isToday) {
                return { absent: !['rejected', 'cancelled'].includes(status), category };
            }

            if (!['approved', 'cancel_requested'].includes(status)) {
                return { absent: false, category };
            }

            if (category === 'annual' || category === 'long') {
                return { absent: true, category };
            }

            const currentMinutes = (nowMoment.hours() * 60) + nowMoment.minutes();
            if (category === 'halfday') {
                const member = (appData.users || []).find((user) => String(user.id) === String(req.userId));
                const range = app.buildHalfDayTimeRange(member, safeDate, req.type);
                if (!range) return { absent: false, category };
                return {
                    absent: currentMinutes >= range.startMinutes && currentMinutes < range.endMinutes,
                    category
                };
            }

            if (category === 'timeoff_leave' || category === 'timeoff_out') {
                const range = app.parseRequestTimeRange(req.timeRange);
                if (!range) return { absent: false, category };
                return {
                    absent: currentMinutes >= range.startMinutes && currentMinutes < range.endMinutes,
                    category
                };
            }

            return { absent: false, category };
        },
        getWorkShiftKeyByDate: (dateStr) => {
            const m = moment(dateStr, ['YYYY-MM-DD', moment.ISO_8601], true);
            const month = m.isValid() ? m.month() + 1 : (new Date().getMonth() + 1);
            if (month <= 3) return 'workQ1';
            if (month <= 6) return 'workQ2';
            if (month <= 9) return 'workQ3';
            return 'workQ4';
        },
        parseWorkShiftRange: (shiftText) => {
            const match = String(shiftText || '').trim().match(/^(\d{2}):00\s*~\s*(\d{2}):00$/);
            if (!match) return null;
            const startHour = Number(match[1]);
            const endHour = Number(match[2]);
            if (!Number.isFinite(startHour) || !Number.isFinite(endHour) || startHour >= endHour) return null;
            return { startHour, endHour };
        },
        getWorkShiftForDate: (user, dateStr) => {
            if (!user) return '09:00 ~ 18:00';
            const quarterKey = app.getWorkShiftKeyByDate(dateStr);
            return security.normalizeWorkShift(user[quarterKey])
                || security.normalizeWorkShift(user.workQ1)
                || security.normalizeWorkShift(user.workQ2)
                || security.normalizeWorkShift(user.workQ3)
                || security.normalizeWorkShift(user.workQ4)
                || '09:00 ~ 18:00';
        },
        getWorkShiftRangeForDate: (user, dateStr) => app.parseWorkShiftRange(app.getWorkShiftForDate(user, dateStr)) || { startHour: 9, endHour: 18 },
        getTimeoffEndHourForDate: (user, dateStr) => app.getWorkShiftRangeForDate(user, dateStr).endHour,
        getDailyActualWorkHoursForDate: (user, dateStr) => {
            const shift = app.getWorkShiftRangeForDate(user, dateStr);
            const grossHours = Math.max(0, Number(shift.endHour) - Number(shift.startHour));
            const breakHours = grossHours > 4 ? 1 : 0;
            const actualHours = Math.max(0, grossHours - breakHours);
            return Number.isFinite(actualHours) ? actualHours : 8;
        },
        getWeekRangeByDate: (dateStr) => {
            const base = moment(dateStr, ['YYYY-MM-DD', moment.ISO_8601], true);
            const safeBase = base.isValid() ? base : moment();
            return {
                start: safeBase.clone().startOf('isoWeek'),
                end: safeBase.clone().endOf('isoWeek')
            };
        },
        isScheduledBasicWorkday: (dateStr) => {
            const m = moment(dateStr, ['YYYY-MM-DD', moment.ISO_8601], true);
            if (!m.isValid()) return false;
            if (m.isoWeekday() > 5) return false;
            if (holidayLogic.isRedDay(m.format('YYYY-MM-DD'))) return false;
            return true;
        },
        getCurrentWorkReportHoursCandidate: ({ user, dateStr, type, duration }) => {
            const safeType = security.normalizeType(type);
            if (!dateStr) return 0;
            if (safeType === '특근') {
                return app.getDailyActualWorkHoursForDate(user, dateStr);
            }
            const safeDuration = Number(duration);
            return Number.isFinite(safeDuration) && safeDuration > 0 ? safeDuration : 0;
        },
        getWeeklyWorkLimitSummary: ({ user, dateStr, type, duration, excludeRequestId = '' }) => {
            const safeDate = security.normalizeDate(dateStr, '');
            const safeUser = user || app.currentUser;
            if (!safeUser || !safeDate) return null;
            const weekRange = app.getWeekRangeByDate(safeDate);
            const excludeId = security.cleanInlineValue(excludeRequestId || '');
            let basicHours = 0;
            const cursor = weekRange.start.clone();
            while (cursor.isSameOrBefore(weekRange.end, 'day')) {
                const cursorDate = cursor.format('YYYY-MM-DD');
                if (app.isScheduledBasicWorkday(cursorDate)) {
                    basicHours += app.getDailyActualWorkHoursForDate(safeUser, cursorDate);
                }
                cursor.add(1, 'day');
            }

            const existingReportHours = (appData.requests || []).reduce((sum, req) => {
                if (!app.isWorkReportRequest(req)) return sum;
                if (!app.requestBelongsToUser(req, safeUser)) return sum;
                if (excludeId && String(req.id) === String(excludeId)) return sum;
                const status = String(req.status || '').trim();
                if (['cancelled', 'rejected'].includes(status)) return sum;
                if (String(req.settlementStatus || '').trim() === 'rejected') return sum;
                const reqDate = security.normalizeDate(req.startDate, '');
                if (!reqDate) return sum;
                const m = moment(reqDate, 'YYYY-MM-DD', true);
                if (!m.isValid() || m.isBefore(weekRange.start, 'day') || m.isAfter(weekRange.end, 'day')) return sum;
                if (app.getWorkReportCategory(req) === 'holiday_work') {
                    return sum + app.getDailyActualWorkHoursForDate(safeUser, reqDate);
                }
                const hours = Number(req.reportedHours || req.hours || 0);
                return sum + (Number.isFinite(hours) ? hours : 0);
            }, 0);

            const currentRequestHours = app.getCurrentWorkReportHoursCandidate({
                user: safeUser,
                dateStr: safeDate,
                type,
                duration
            });
            const totalHours = basicHours + existingReportHours + currentRequestHours;
            const remainingHours = 52 - totalHours;
            return {
                weekStart: weekRange.start.format('YYYY-MM-DD'),
                weekEnd: weekRange.end.format('YYYY-MM-DD'),
                basicHours,
                existingReportHours,
                currentRequestHours,
                totalHours,
                remainingHours,
                overLimit: totalHours > 52
            };
        },
        renderWorkReportWeeklyLimitSummary: () => {
            const box = document.getElementById('work-report-weekly-limit');
            const typeEl = document.getElementById('work-report-type');
            const dateEl = document.getElementById('work-report-date');
            const durationEl = document.getElementById('work-report-duration');
            if (!box || !typeEl || !dateEl || !durationEl) return;
            const summary = app.getWeeklyWorkLimitSummary({
                user: app.currentUser,
                dateStr: dateEl.value,
                type: typeEl.value,
                duration: durationEl.value,
                excludeRequestId: app.workReportEditingId
            });
            if (!summary) {
                box.className = 'hidden';
                box.innerHTML = '';
                return;
            }
            const toneClass = summary.overLimit
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : (summary.totalHours >= 48
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700');
            const remainText = summary.overLimit ? `${Math.abs(summary.remainingHours)}시간 초과` : `${summary.remainingHours}시간`;
            box.className = `rounded-lg border px-3 py-3 text-[11px] leading-5 ${toneClass}`;
            box.innerHTML = `
                <div class="font-bold">이번 주 잔여 가능시간: ${remainText}</div>
                <div class="mt-1">주간 기준: ${summary.weekStart} ~ ${summary.weekEnd}</div>
                <div>기본근로시간: ${summary.basicHours}시간 · 기존 잔업/특근: ${summary.existingReportHours}시간 · 이번 신청: ${summary.currentRequestHours}시간</div>
                <div class="mt-1 font-semibold">이번 신청 반영 후 예정 총 근로시간: ${summary.totalHours}시간</div>
                ${summary.overLimit ? `<div class="mt-1 font-bold">주간 예정 근로시간이 52시간을 초과하여 저장할 수 없습니다.</div>` : ''}
            `;
        },
        renderRequestReportWeeklyLimitSummary: () => {
            const box = document.getElementById('req-report-weekly-limit');
            const typeEl = document.getElementById('req-type');
            const dateEl = document.getElementById('req-start-date');
            const durationEl = document.getElementById('req-report-duration');
            if (!box || !typeEl || !dateEl || !durationEl) return;
            const type = security.normalizeType(typeEl.value || '');
            if (!['잔업', '특근'].includes(type)) {
                box.className = 'hidden';
                box.innerHTML = '';
                return;
            }
            const summary = app.getWeeklyWorkLimitSummary({
                user: app.getRequestModalTargetUser() || app.currentUser,
                dateStr: dateEl.value,
                type,
                duration: durationEl.value,
                excludeRequestId: app.editingId || ''
            });
            if (!summary) {
                box.className = 'hidden';
                box.innerHTML = '';
                return;
            }
            const toneClass = summary.overLimit
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : (summary.totalHours >= 48
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700');
            const remainText = summary.overLimit ? `${Math.abs(summary.remainingHours)}시간 초과` : `${summary.remainingHours}시간`;
            box.className = `rounded-lg border px-3 py-3 text-[11px] leading-5 ${toneClass}`;
            box.innerHTML = `
                <div class="font-bold">이번 주 잔여 가능시간: ${remainText}</div>
                <div class="mt-1">주간 기준: ${summary.weekStart} ~ ${summary.weekEnd}</div>
                <div>기본근로시간: ${summary.basicHours}시간 · 기존 잔업/특근: ${summary.existingReportHours}시간 · 이번 신청: ${summary.currentRequestHours}시간</div>
                <div class="mt-1 font-semibold">이번 신청 반영 후 예정 총 근로시간: ${summary.totalHours}시간</div>
                ${summary.overLimit ? `<div class="mt-1 font-bold">주간 예정 근로시간이 52시간을 초과하여 저장할 수 없습니다.</div>` : ''}
            `;
        },
        buildHalfDayTimeRange: (user, dateStr, type) => {
            const normalizedType = security.normalizeType(type);
            const shift = app.getWorkShiftRangeForDate(user, dateStr);
            const duration = 4;

            if (normalizedType === '반차(오전)') {
                const endHour = calcOutEndTime(shift.startHour, duration);
                if (endHour === null) return null;
                return {
                    startHour: shift.startHour,
                    endHour,
                    startMinutes: shift.startHour * 60,
                    endMinutes: endHour * 60,
                    label: '오전 반차'
                };
            }

            const endHour = shift.endHour;
            const startHour = timeLogic.calcStart(duration, endHour);
            return {
                startHour,
                endHour,
                startMinutes: startHour * 60,
                endMinutes: endHour * 60,
                label: normalizedType === '반차(오후)' ? '오후 반차' : '반차중'
            };
        },
        syncRequestTypeDefaults: () => {
            const typeEl = document.getElementById('req-type');
            const dateEl = document.getElementById('req-start-date');
            const timeoffEndEl = document.getElementById('req-end-time-timeoff');
            const specialModeWrap = document.getElementById('div-special-mode');
            const specialModeEl = document.getElementById('req-special-mode');
            if (!typeEl || !timeoffEndEl) return;

            const selection = app.getCurrentRequestSelection();
            const type = selection.baseType;
            const dateStr = security.normalizeDate(dateEl?.value, moment().format('YYYY-MM-DD'));
            const isTimeoff = type === '시간차(퇴근)';
            const showSpecialMode = selection.isSpecial && selection.requestMode === 'same_as_annual';
            const requestUser = app.getRequestModalTargetUser() || app.currentUser;

            if (specialModeWrap) specialModeWrap.style.display = showSpecialMode ? 'block' : 'none';
            if (specialModeEl && showSpecialMode && !specialModeEl.value) specialModeEl.value = '연차';

            timeoffEndEl.disabled = isTimeoff;
            timeoffEndEl.classList.toggle('bg-gray-100', isTimeoff);
            timeoffEndEl.classList.toggle('text-gray-500', isTimeoff);
            if (isTimeoff) {
                const endHour = Number(app.getTimeoffEndHourForDate(requestUser, dateStr));
                const endValue = String(Number.isFinite(endHour) ? endHour : 18);
                if (![...timeoffEndEl.options].some((option) => String(option.value) === endValue)) {
                    const dynamicOption = document.createElement('option');
                    dynamicOption.value = endValue;
                    dynamicOption.text = `${endValue}:00`;
                    timeoffEndEl.appendChild(dynamicOption);
                }
                timeoffEndEl.value = endValue;
            }
        },
        formatDeductionText: (req) => {
            const type = security.normalizeType((req && req.type) || '');
            const hours = Number((req && req.hours) || 0);
            const hoursText = Number.isInteger(hours)
                ? String(hours)
                : String(hours.toFixed(2).replace(/\.?0+$/, ''));
            if (app.isWorkReportRequest(req) || ['잔업', '특근'].includes(type)) {
                return `차감 없음 · 보고 ${hoursText}h`;
            }
            if (type === '연차' || app.isHalfDayType(type)) {
                return `${hoursText}h(${app.formatDayCount(hours)}일) 차감`;
            }
            return `${hoursText}h 차감`;
        },
        shouldRenderRequestOnDate: (req, dateStr) => {
            if (app.isWorkReportRequest(req)) return ['workreport', 'self'].includes(app.calendarMode);
            if (app.isSpecialLeaveRequest(req) && (app.getSpecialLeaveRequestMode(req.specialLeaveTypeKey) === 'day_only' || app.canRequestSpecialLeaveOnHoliday(req.specialLeaveTypeKey))) {
                return true;
            }
            const type = security.normalizeType((req && req.type) || '');
            if (type === '연차' || app.isHalfDayType(type)) {
                if (holidayLogic.isRedDay(dateStr) || holidayLogic.isSat(dateStr)) return false;
            }
            return true;
        },
        getCurrentPermissions: () => {
            if (!app.currentUser) return security.defaultPermissions();
            return security.sanitizePermissions(
                app.currentUser.permissions || {},
                app.currentUser.role,
                app.currentUser.dept
            );
        },
        getAllowedCalendarModes: () => {
            const p = app.getCurrentPermissions();
            const modes = [];
            if (p.calendarSelf) modes.push('self');
            if (p.calendarManual) modes.push('manual');
            if (p.calendarParts) modes.push('parts');
            if (p.calendarAll) modes.push('all');
            if (p.calendarRejected) modes.push('rejected');
            if (p.calendarWorkReport || app.canAccessAnyWorkReportView()) modes.push('workreport');
            if (modes.length === 0) modes.push('self');
            return modes;
        },
        canApproveRequest: (req) => {
            if (!req || !app.currentUser) return false;
            const isSelfRequest = app.requestBelongsToUser(req, app.currentUser);
            if (isSelfRequest && app.currentUser.role === 'master') return true;
            if (isSelfRequest) return false;
            const scope = app.getCurrentPermissions().approveScope;
            if (scope === 'all') return true;
            if (scope === 'manual') return req.dept === '매뉴얼팀';
            if (scope === 'parts') return req.dept === '파츠북팀';
            return false;
        },
        canCancelApprovedRequest: (req) => {
            if (!req || req.status !== 'approved') return false;
            const today = moment().startOf('day');
            const end = moment(req.endDate, 'YYYY-MM-DD');
            if (!end.isValid()) return false;
            return end.isSameOrAfter(today, 'day');
        },
        canRequestCancel: (req) => {
            if (!req) return false;
            if (req.status === 'pending') return true;
            if (req.status === 'approved') return app.canCancelApprovedRequest(req);
            return false;
        },
        hasApprovalPermission: () => app.getCurrentPermissions().approveScope !== 'none',
        hasMasterPermissionAccess: () => {
            if (!app.currentUser) return false;
            if (app.currentUser.role === 'master') return true;
            const perms = app.getCurrentPermissions();
            return app.isMobileViewport ? !!perms.canAccessMasterSettingsMobile : !!perms.canAccessMasterSettingsDesktop;
        },
        hasUserManagePermission: () => {
            const perms = app.getCurrentPermissions();
            return app.isMobileViewport ? !!perms.canManageUsersMobile : !!perms.canManageUsersDesktop;
        },
        hasAdminOpsAccess: () => {
            if (!app.currentUser) return false;
            if (app.hasMasterPermissionAccess()) return true;
            const perms = app.getCurrentPermissions();
            return app.isMobileViewport ? !!perms.canAccessAdminOpsMobile : !!perms.canAccessAdminOpsDesktop;
        },
        getWorkReportViewScopeFlags: () => {
            if (!app.currentUser) return { all: false, manual: false, parts: false };
            const role = security.normalizeRole(String(app.currentUser.role || ''));
            const perms = app.getCurrentPermissions();
            const flags = { all: false, manual: false, parts: false };
            if (role === 'master' || role === 'ceo') {
                flags.all = true;
                flags.manual = true;
                flags.parts = true;
                return flags;
            }
            if (perms.workReportViewAll) {
                flags.all = true;
                flags.manual = true;
                flags.parts = true;
            }
            if (perms.workReportViewManual) flags.manual = true;
            if (perms.workReportViewParts) flags.parts = true;
            if (perms.approveScope === 'all') {
                flags.all = true;
                flags.manual = true;
                flags.parts = true;
            } else if (perms.approveScope === 'manual') {
                flags.manual = true;
            } else if (perms.approveScope === 'parts') {
                flags.parts = true;
            }
            return flags;
        },
        canAccessAnyWorkReportView: () => {
            if (!app.currentUser || !app.isAnyWorkReportFeatureEnabled()) return false;
            const flags = app.getWorkReportViewScopeFlags();
            return !!(flags.all || flags.manual || flags.parts);
        },
        canUseWorkReportApply: () => {
            if (!app.currentUser || !app.isAnyWorkReportFeatureEnabled()) return false;
            return security.normalizeRole(String(app.currentUser.role || '')) !== 'ceo';
        },
        canViewAdminWorkReportBoard: () => {
            return app.canAccessAnyWorkReportView();
        },
        isMemberCardFeatureEnabled: () => {
            const masterUser = appData.users.find(user => user.role === 'master');
            if (masterUser) return !!masterUser.featureMemberCard;
            return !!(app.currentUser && app.currentUser.featureMemberCard);
        },
        isBoardFeatureEnabled: () => {
            const masterUser = appData.users.find(user => user.role === 'master');
            if (masterUser) return masterUser.featureBoard !== false;
            return !(app.currentUser && app.currentUser.featureBoard === false);
        },
        isHomepageFeatureEnabled: () => {
            const masterUser = appData.users.find(user => user.role === 'master');
            if (masterUser) return !!masterUser.featureHomepage;
            return !!(app.currentUser && app.currentUser.featureHomepage);
        },
        isOvertimeFeatureEnabled: () => {
            const masterUser = appData.users.find(user => user.role === 'master');
            if (masterUser) return !!masterUser.featureOvertime;
            return !!(app.currentUser && app.currentUser.featureOvertime);
        },
        isHolidayWorkFeatureEnabled: () => {
            const masterUser = appData.users.find(user => user.role === 'master');
            if (masterUser) return !!masterUser.featureHolidayWork;
            return !!(app.currentUser && app.currentUser.featureHolidayWork);
        },
        isAnyWorkReportFeatureEnabled: () => app.isOvertimeFeatureEnabled() || app.isHolidayWorkFeatureEnabled(),
        getAvailableWorkReportTypes: () => {
            const items = [];
            if (app.isOvertimeFeatureEnabled()) items.push('잔업');
            if (app.isHolidayWorkFeatureEnabled()) items.push('특근');
            return items;
        },
        getWorkShiftText: (value) => {
            const safe = security.normalizeWorkShift(value);
            return safe || '미등록';
        },
        getMemberCardData: (user) => {
            return [
                { label: '이름', value: user.name || '-' },
                { label: '유형', value: app.getRoleLabelKo(user) },
                { label: '직급', value: user.rank || '-' },
                { label: '전화번호', value: user.phone || '-' },
                { label: '이메일', value: user.email || '-' },
                { label: '사번', value: user.employeeNo || user.id || '-' },
                { label: '1분기 근무시간', value: app.getWorkShiftText(user.workQ1) },
                { label: '2분기 근무시간', value: app.getWorkShiftText(user.workQ2) },
                { label: '3분기 근무시간', value: app.getWorkShiftText(user.workQ3) },
                { label: '4분기 근무시간', value: app.getWorkShiftText(user.workQ4) }
            ];
        },
        getManageScopeUsers: () => {
            if (!app.currentUser) return [];
            if (app.currentUser.role === 'master') return appData.users;
            const nonMasterUsers = appData.users.filter(u => u.role !== 'master');
            // 구성원 관리 권한이 있으면 전 직원(마스터 제외) 관리 가능
            if (app.hasUserManagePermission()) return nonMasterUsers;
            const scope = app.getCurrentPermissions().approveScope;
            if (scope === 'all') return nonMasterUsers;
            if (scope === 'manual') return nonMasterUsers.filter(u => u.dept === '매뉴얼팀');
            if (scope === 'parts') return nonMasterUsers.filter(u => u.dept === '파츠북팀');
            return nonMasterUsers.filter(u => String(u.id) === String(app.currentUser.id));
        },
        canManageTargetUser: (targetId) => {
            if (!app.currentUser || !app.hasUserManagePermission()) return false;
            const safeId = security.cleanInlineValue(targetId);
            const target = appData.users.find(u => String(u.id) === String(safeId));
            if (!target) return false;
            if (target.role === 'master' && app.currentUser.role !== 'master') return false;
            if (app.currentUser.role === 'master') return true;
            const scopeUsers = app.getManageScopeUsers();
            return scopeUsers.some(u => String(u.id) === String(safeId));
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
        openAdminProxyRequestModal: (presetDate = '') => {
            if (!app.hasAdminOpsAccess()) return alert('운영실 접근 권한이 없습니다.');
            const targetUser = app.ensureAdminOpsTargetUser();
            if (!targetUser) return alert('관리 가능한 직원이 없습니다.');
            app.openRequestModal(presetDate, { adminMode: true, targetUserId: targetUser.id });
        },
        loadAdminOpsPanelData: async (options = {}) => {
            const force = !!options.force;
            if (app.adminOpsLoaded && !force) return true;
            try {
                await db.loadAdminOpsData();
                app.adminOpsLoaded = true;
                return true;
            } catch (e) {
                if (!options.silent) alert('운영실 데이터 로드 실패: ' + e.message);
                return false;
            }
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
        renderAdminOpsLogPanel: () => {
            const logs = Array.isArray(appData.accessLogs) ? appData.accessLogs.slice(0, 20) : [];
            return `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <p class="text-sm font-bold text-gray-800">최근 접속 로그</p>
                        <p class="text-xs text-gray-500">최근 20건만 표시합니다.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="app.downloadAccessLogsCsv()" class="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-900">CSV 다운로드</button>
                        <span class="text-[11px] font-bold text-slate-500">${logs.length}건</span>
                    </div>
                </div>
                <div class="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                    ${logs.length ? logs.map((log) => `
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
                            표시할 접속 로그가 없습니다.
                        </div>`}
                </div>
            </div>`;
        },
        getSecuritySeverityTone: (severity = '') => {
            const safe = String(severity || '').toLowerCase();
            if (safe === 'high') return 'bg-rose-100 text-rose-700 border-rose-200';
            if (safe === 'warn') return 'bg-amber-100 text-amber-700 border-amber-200';
            return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        },
        renderAdminOpsSecurityLogPanel: () => {
            const logs = Array.isArray(appData.securityLogs) ? appData.securityLogs.slice(0, 20) : [];
            return `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <p class="text-sm font-bold text-gray-800">최근 보안 로그</p>
                        <p class="text-xs text-gray-500">최근 20건만 표시합니다.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="app.downloadSecurityLogsCsv()" class="px-3 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-bold hover:bg-rose-800">CSV 다운로드</button>
                        <span class="text-[11px] font-bold text-slate-500">${logs.length}건</span>
                    </div>
                </div>
                <div class="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                    ${logs.length ? logs.map((log) => `
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
                            표시할 보안 로그가 없습니다.
                        </div>`}
                </div>
            </div>`;
        },
        downloadAccessLogsCsv: async () => {
            try {
                const result = await db.downloadAccessLogsCsv();
                const csv = String(result.csv || '');
                if (!csv) throw new Error('CSV 내용이 비어 있습니다.');
                const blob = new Blob([csv], { type: result.mimeType || 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = result.fileName || `accessLogs_${moment().format('YYYY-MM-DD_HHmmss')}.csv`;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                URL.revokeObjectURL(url);
                alert(`접속 로그 CSV 다운로드 완료 (${result.rowCount || 0}건)`);
            } catch (e) {
                console.error(e);
                alert('접속 로그 CSV 다운로드 오류: ' + e.message);
            }
        },
        downloadSecurityLogsCsv: async () => {
            try {
                const result = await db.downloadSecurityLogsCsv();
                const csv = String(result.csv || '');
                if (!csv) throw new Error('CSV 내용이 비어 있습니다.');
                const blob = new Blob([csv], { type: result.mimeType || 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = result.fileName || `securityLogs_${moment().format('YYYY-MM-DD_HHmmss')}.csv`;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                URL.revokeObjectURL(url);
                alert(`보안 로그 CSV 다운로드 완료 (${result.rowCount || 0}건)`);
            } catch (e) {
                console.error(e);
                alert('보안 로그 CSV 다운로드 오류: ' + e.message);
            }
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
                const nextId = security.cleanInlineValue(date);
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
                await app.logUserAction('AdminPublicHolidaySync', `${result.startYear}-${result.endYear}|auto:${result.autoCount}|company:${result.companyFixedCount}`);
                alert(`공휴일 동기화 완료\n- 범위: ${result.startYear}~${result.endYear}\n- 자동 공휴일: ${result.autoCount}건\n- 창립기념일: ${result.companyFixedCount}건`);
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
                        <p class="text-sm font-bold text-gray-800">수동 휴일 설정</p>
                        <p class="text-xs text-gray-500">공공데이터 공휴일과 창립기념일을 제외한 회사 휴일만 수정합니다.</p>
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
                        <span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">창립 ${summary.companyFixed || 0}</span>
                        <span class="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-bold">수동 ${summary.manual || 0}</span>
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
                        <span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">접속 로그 ${(appData.accessLogs || []).length}건 로드</span>
                        <span class="px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-bold">보안 로그 ${(appData.securityLogs || []).length}건 로드</span>
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
        getApproverUser: (requester = app.currentUser) => {
            if (!requester) return null;
            if (requester.role === 'master') return null;

            const candidates = appData.users.filter(u => String(u.id) !== String(requester.id));
            const ceoUser = candidates.find(u => u.role === 'ceo') || null;

            // 팀리더 신청 -> 대표
            if (requester.role === 'team_leader') {
                if (ceoUser) return ceoUser;
                return appData.users.find(u => u.role === 'master') || null;
            }

            // 직원/파트리더 신청 -> 같은 부서 팀리더
            if (requester.role === 'employee' || requester.role === 'part_leader') {
                const deptLeader = candidates.find(u => u.role === 'team_leader' && u.dept === requester.dept);
                if (deptLeader) return deptLeader;
                if (ceoUser) return ceoUser;
                return appData.users.find(u => u.role === 'master') || null;
            }

            // 대표 신청 -> 마스터(없으면 없음)
            if (requester.role === 'ceo') {
                return appData.users.find(u => u.role === 'master') || null;
            }

            return ceoUser || appData.users.find(u => u.role === 'master') || null;
        },
        getApproverEmail: (requester = app.currentUser) => {
            const approver = app.getApproverUser(requester);
            if (!approver) return "";
            return security.isValidEmail(approver.email) ? approver.email : "";
        },
        getMailRoleGroupByUser: (user) => {
            if (!user) return 'staff';
            return security.normalizeRole(String(user.role || '')) === 'team_leader' ? 'leader' : 'staff';
        },
        getDefaultMailRoute: (dept, roleGroup) => {
            const users = Array.isArray(appData.users) ? appData.users : [];
            const safeDept = security.cleanText(dept || '');
            const safeRoleGroup = String(roleGroup || '').trim().toLowerCase() === 'leader' ? 'leader' : 'staff';
            let toUserId = '';
            if (safeRoleGroup === 'leader') {
                const ceo = users.find((user) => security.normalizeRole(String(user.role || '')) === 'ceo');
                const master = users.find((user) => security.normalizeRole(String(user.role || '')) === 'master');
                toUserId = security.cleanInlineValue((ceo && ceo.id) || (master && master.id) || '');
            } else {
                const teamLeader = users.find((user) => security.normalizeRole(String(user.role || '')) === 'team_leader' && String(user.dept || '') === safeDept);
                const ceo = users.find((user) => security.normalizeRole(String(user.role || '')) === 'ceo');
                const master = users.find((user) => security.normalizeRole(String(user.role || '')) === 'master');
                toUserId = security.cleanInlineValue((teamLeader && teamLeader.id) || (ceo && ceo.id) || (master && master.id) || '');
            }
            return { dept: safeDept, roleGroup: safeRoleGroup, toUserId, ccUserIds: [] };
        },
        getMailRouteConfig: (dept, roleGroup) => {
            const safeDept = security.cleanText(dept || '');
            const safeRoleGroup = String(roleGroup || '').trim().toLowerCase() === 'leader' ? 'leader' : 'staff';
            const saved = (Array.isArray(appData.mailRoutes) ? appData.mailRoutes : []).find((route) =>
                String(route.dept || '') === safeDept && String(route.roleGroup || '') === safeRoleGroup
            );
            return saved || app.getDefaultMailRoute(safeDept, safeRoleGroup);
        },
        getMailRouteForRequester: (requester = app.currentUser) => {
            if (!requester) return { dept: '', roleGroup: 'staff', toUserId: '', ccUserIds: [] };
            return app.getMailRouteConfig(requester.dept, app.getMailRoleGroupByUser(requester));
        },
        getUsersByIds: (ids = []) => {
            const idSet = new Set((Array.isArray(ids) ? ids : []).map((id) => security.cleanInlineValue(id)).filter(Boolean));
            return (Array.isArray(appData.users) ? appData.users : []).filter((user) => idSet.has(String(user.id || '')));
        },
        getUserEmployeeKey: (user) => security.cleanInlineValue(user && user.employeeNo ? user.employeeNo : ''),
        getRequestEmployeeKey: (req) => security.cleanInlineValue(req && req.employeeNo ? req.employeeNo : ''),
        findUsersByName: (name) => {
            const safeName = security.cleanText(name);
            if (!safeName) return [];
            return (Array.isArray(appData.users) ? appData.users : []).filter((user) => security.cleanText(user && user.name) === safeName);
        },
        getRequestOwnerUser: (req) => {
            if (!req) return null;
            const requestEmployeeKey = app.getRequestEmployeeKey(req);
            if (requestEmployeeKey) {
                const byEmployeeNo = (Array.isArray(appData.users) ? appData.users : []).find((user) => app.getUserEmployeeKey(user) === requestEmployeeKey);
                if (byEmployeeNo) return byEmployeeNo;
            }
            const byId = (Array.isArray(appData.users) ? appData.users : []).find((user) => String(user.id || '') === String(req.userId || ''));
            if (byId) return byId;
            const nameMatches = app.findUsersByName(req.userName);
            return nameMatches.length === 1 ? nameMatches[0] : null;
        },
        requestBelongsToUser: (req, user) => {
            if (!req || !user) return false;
            const requestEmployeeKey = app.getRequestEmployeeKey(req);
            const userEmployeeKey = app.getUserEmployeeKey(user);
            if (requestEmployeeKey && userEmployeeKey) {
                return requestEmployeeKey === userEmployeeKey;
            }
            if (String(req.userId || '') === String(user.id || '')) return true;
            const safeRequestName = security.cleanText(req.userName);
            const safeUserName = security.cleanText(user.name);
            if (!safeRequestName || !safeUserName || safeRequestName !== safeUserName) return false;
            const nameMatches = app.findUsersByName(safeRequestName);
            return nameMatches.length === 1 && String(nameMatches[0].id || '') === String(user.id || '');
        },
        getMailRecipientsForRequester: (requester = app.currentUser) => {
            const route = app.getMailRouteForRequester(requester);
            const requesterEmail = security.cleanEmail(requester && requester.email ? requester.email : '');
            const toUsers = app.getUsersByIds([route.toUserId]).filter((user) => security.isValidEmail(user.email));
            const ccUsers = app.getUsersByIds(route.ccUserIds || []).filter((user) => security.isValidEmail(user.email));
            const toEmails = [...new Set(toUsers.map((user) => security.cleanEmail(user.email)).filter(Boolean))];
            const ccEmails = [...new Set(ccUsers.map((user) => security.cleanEmail(user.email)).filter(Boolean))]
                .filter((email) => !toEmails.includes(email))
                .filter((email) => !requesterEmail || email !== requesterEmail);
            return {
                route,
                toUsers,
                ccUsers,
                to: toEmails.join(';'),
                cc: ccEmails.join(';')
            };
        },
        openMailDraftForRequester: (requester, subject, body) => {
            const recipients = app.getMailRecipientsForRequester(requester);
            if (!recipients.to) {
                alert('메일 수신인(To) 설정 또는 이메일 정보가 없습니다.');
                return false;
            }
            openOutlookDraft(recipients.to, subject, body, recipients.cc);
            return true;
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
        logUserAction: async (logType, detail = '') => {
            if (!app.currentUser) return;
            await db.logAccess({
                userId: app.currentUser.id,
                userName: app.currentUser.name,
                logType,
                detail
                });
        },
        canDeleteSpecialLeaveType: (typeKey) => {
            const safeTypeKey = security.normalizeSpecialLeaveTypeKey(typeKey);
            if (!safeTypeKey) return false;
            const hasGranted = (Array.isArray(appData.userSpecialLeaves) ? appData.userSpecialLeaves : []).some((item) =>
                security.normalizeSpecialLeaveTypeKey(item.typeKey) === safeTypeKey &&
                (Number(item.totalHours || 0) > 0 || Number(item.usedHours || 0) > 0 || String(item.note || '').trim())
            );
            if (hasGranted) return false;
            const hasRequestHistory = (Array.isArray(appData.requests) ? appData.requests : []).some((req) =>
                security.normalizeSpecialLeaveTypeKey(req.specialLeaveTypeKey) === safeTypeKey
            );
            return !hasRequestHistory;
        },
        deleteSpecialLeaveTypeSettingRow: (typeKey) => {
            const safeTypeKey = security.normalizeSpecialLeaveTypeKey(typeKey);
            if (!safeTypeKey) return;
            if (!app.canDeleteSpecialLeaveType(safeTypeKey)) {
                alert('부여 이력 또는 신청 이력이 있는 특별휴가 항목은 삭제할 수 없습니다. 비활성화로 관리해주세요.');
                return;
            }
            const row = document.querySelector(`[data-special-type-key="${safeTypeKey}"]`);
            if (!row) return;
            row.remove();
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
            const boardBtn = boardEnabled ? `<button onclick="app.openBoardPage()" class="text-sm ${app.currentView==='board' ? 'bg-blue-700' : 'bg-blue-600'} text-white px-3 py-2 rounded-lg font-bold">게시판</button>` : '';
            const situationBtn = canAccessSituationBoard ? `<button onclick="app.openSituationBoard()" class="text-sm ${app.currentView==='situation-board' ? 'bg-slate-900' : 'bg-slate-700'} text-white px-3 py-2 rounded-lg font-bold">전체 상황판</button>` : '';
            const homeBtn = app.currentView !== 'dashboard'
                ? `<button onclick="app.backToDashboard()" class="text-sm bg-white border px-3 py-2 rounded-lg font-bold">홈</button>`
                : '';
            const masterBtn = canAccessAdminOps ? `<button onclick="app.renderMasterPermissionPage()" class="text-sm bg-purple-600 text-white px-3 py-2 rounded-lg font-bold">권한/설정</button>` : '';
            const manageBtn = canManageUsers ? `<button onclick="app.renderUserManagement()" class="text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold">구성원 관리</button>` : '';
            const pwBtn = `<button onclick="document.getElementById('pw-modal').classList.remove('hidden')" class="text-sm bg-white border px-3 py-2 rounded-lg">비번변경</button>`;
            const logoutBtn = `<button onclick="app.logout()" class="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg font-bold">로그아웃</button>`;
            const profileHtml = `<div class="text-right"><p class="text-sm font-bold">${app.currentUser.name} <span class="text-xs text-gray-500">${app.currentUser.rank||''}</span>${isMaster?'<span class="text-[10px] bg-red-600 text-white px-1 rounded ml-1">MASTER</span>':''}</p><p class="text-xs text-gray-500">${app.currentUser.dept}</p></div>`;
            const actions = [boardBtn, situationBtn, homeBtn, masterBtn, manageBtn, pwBtn, logoutBtn].filter(Boolean);
            const actionsHtml = actions.join('');

            if (app.isMobileViewport) {
                const mobileOptions = [];
                if (boardEnabled) mobileOptions.push({ value: 'board', label: '게시판' });
                if (canAccessSituationBoard) mobileOptions.push({ value: 'situation-board', label: '전체 상황판' });
                if (app.currentView !== 'dashboard') mobileOptions.push({ value: 'home', label: '홈' });
                if (canAccessAdminOps) mobileOptions.push({ value: 'master-permissions', label: '권한/설정' });
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
            if (safeAction === 'board') return app.openBoardPage();
            if (safeAction === 'situation-board') return app.openSituationBoard();
            if (safeAction === 'home') return app.backToDashboard();
            if (safeAction === 'master-permissions') return app.renderMasterPermissionPage();
            if (safeAction === 'user-management') return app.renderUserManagement();
            if (safeAction === 'password') return document.getElementById('pw-modal')?.classList.remove('hidden');
            if (safeAction === 'logout') return app.logout();
        },
        toggleMobileNavMenu: () => {
            app.mobileNavMenuOpen = !app.mobileNavMenuOpen;
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
                alert('게시판 데이터 로드 실패: ' + (e.message || '서버 상태를 확인하세요.'));
                return false;
            }
        },

        openBoardPage: async () => {
            if (!app.isBoardFeatureEnabled()) {
                alert('게시판 기능이 꺼져 있습니다.');
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
                            <h2 class="text-2xl font-bold">사내 게시판</h2>
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

        parseRequestTimeRange: (timeRange) => {
            const match = String(timeRange || '').trim().match(/^(\d{1,2}):00~(\d{1,2}):00$/);
            if (!match) return null;

            const startHour = Number(match[1]);
            const endHour = Number(match[2]);
            if (!Number.isFinite(startHour) || !Number.isFinite(endHour) || startHour >= endHour) return null;

            return {
                startMinutes: startHour * 60,
                endMinutes: endHour * 60
            };
        },
        isTimeOffConflictRequest: (req) => {
            if (!req) return false;
            return !app.isWorkReportRequest(req) && app.isTimeOffType(req.type);
        },
        hasTimeRangeOverlap: (leftRange, rightRange) => {
            if (!leftRange || !rightRange) return true;
            return leftRange.startMinutes < rightRange.endMinutes && rightRange.startMinutes < leftRange.endMinutes;
        },
        findTimeOffConflictRequest: (requestUser, candidate, options = {}) => {
            const editingId = security.cleanInlineValue(options.editingId || '');
            const candidateType = security.normalizeType(candidate.type);
            const candidateDate = security.normalizeDate(candidate.startDate, '');
            const candidateRange = app.parseRequestTimeRange(candidate.timeRange);
            if (!requestUser || !candidateDate || !app.isTimeOffType(candidateType)) return null;

            const requests = Array.isArray(appData.requests) ? appData.requests : [];
            return requests.find((req) => {
                if (!app.requestBelongsToUser(req, requestUser)) return false;
                if (['cancelled', 'rejected'].includes(security.normalizeStatus(req.status))) return false;
                if (editingId && String(req.id) === String(editingId)) return false;
                if (!app.isTimeOffConflictRequest(req)) return false;
                const existingDate = security.normalizeDate(req.startDate, '');
                if (existingDate !== candidateDate) return false;

                const existingType = security.normalizeType(req.type);
                const existingRange = app.parseRequestTimeRange(req.timeRange);
                if (candidateType === '시간차(퇴근)' && existingType === '시간차(퇴근)') return true;
                return app.hasTimeRangeOverlap(existingRange, candidateRange);
            }) || null;
        },
        getTimeOffConflictMessage: (existingReq, candidateType) => {
            const safeCandidateType = security.normalizeType(candidateType);
            const existingType = security.normalizeType(existingReq && existingReq.type);
            if (safeCandidateType === '시간차(퇴근)' && existingType === '시간차(퇴근)') {
                return '같은 날짜에는 조퇴(시간차 퇴근)를 1건만 등록할 수 있습니다.';
            }
            return '같은 날짜의 시간차 요청이 기존 시간과 겹칩니다. 시간을 다시 확인해 주세요.';
        },
        getMemberAbsenceState: (member, nowMoment = moment()) => {
            if (!member) return { absent: false, label: '' };

            const today = nowMoment.clone().startOf('day');
            const todayStr = today.format('YYYY-MM-DD');
            const currentMinutes = (nowMoment.hours() * 60) + nowMoment.minutes();
            const activeStatuses = new Set(['approved', 'cancel_requested']);
            const requests = appData.requests
                .filter((req) => String(req.userId) === String(member.id) && activeStatuses.has(req.status))
                .filter((req) => {
                    const start = moment(req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                    const end = moment(req.endDate, ['YYYY-MM-DD', moment.ISO_8601], true).endOf('day');
                    return start.isValid() && end.isValid() && nowMoment.isBetween(start, end, undefined, '[]');
                })
                .sort((a, b) => {
                    const pA = app.getRequestTypePriority(a);
                    const pB = app.getRequestTypePriority(b);
                    return pA - pB;
                });

            for (const req of requests) {
                const type = security.normalizeType(req.type);
                if (!app.shouldRenderRequestOnDate(req, todayStr)) continue;

                if (type === '연차') {
                    if (app.isSpecialLeaveRequest(req)) {
                        const meta = app.getSpecialLeaveTypeMeta(req.specialLeaveTypeKey);
                        return { absent: true, label: (meta && meta.label) || '특별연차' };
                    }
                    return { absent: true, label: '오늘 연차' };
                }

                if (app.isHalfDayType(type)) {
                    const range = app.buildHalfDayTimeRange(member, todayStr, type);
                    if (!range) continue;
                    if (currentMinutes >= range.startMinutes && currentMinutes < range.endMinutes) {
                        return { absent: true, label: range.label };
                    }
                    continue;
                }

                if (type === '시간차(퇴근)' || type === '시간차(외출)') {
                    const range = app.parseRequestTimeRange(req.timeRange);
                    if (!range) continue;
                    if (currentMinutes >= range.startMinutes && currentMinutes < range.endMinutes) {
                        return { absent: true, label: type === '시간차(퇴근)' ? '조퇴중' : '외출중' };
                    }
                }
            }

            return { absent: false, label: '' };
        },
        openRequestModal: (presetDate = '', options = {}) => {
            const modal = document.getElementById('req-modal');
            if (!modal) return;
            app.initModal(presetDate, options);
            modal.classList.remove('hidden');
        },
        updateRejectReasonCounter: () => {
            const input = document.getElementById('reject-reason-input');
            const counter = document.getElementById('reject-reason-counter');
            if (!input || !counter) return;
            if (input.value.length > 120) input.value = input.value.slice(0, 120);
            counter.innerText = `${input.value.length} / 120`;
        },
        openReasonModal: (options = {}) => new Promise((resolve) => {
            const modal = document.getElementById('reject-reason-modal');
            const input = document.getElementById('reject-reason-input');
            const title = document.getElementById('reject-reason-title');
            const subtitle = document.getElementById('reject-reason-subtitle');
            const confirmBtn = document.getElementById('reject-reason-confirm-btn');
            const defaultConfig = {
                title: '반려 사유 입력',
                subtitle: '반려 사유를 입력해 주세요.',
                placeholder: '예: 인력 공백으로 인해 해당 기간 사용이 어렵습니다.',
                confirmLabel: '반려',
                emptyMessage: '반려 사유를 입력해 주세요.',
                initialValue: ''
            };
            const config = {
                ...defaultConfig,
                ...options
            };
            if (!modal || !input || !subtitle) {
                const fallback = prompt(`${config.emptyMessage} (최대 120자)`, config.initialValue || '');
                const safeFallback = security.cleanText(fallback || '').slice(0, 120);
                resolve(safeFallback || null);
                return;
            }

            app.reasonModalConfig = config;
            app.rejectReasonResolve = resolve;
            app.rejectReasonTargetId = security.cleanInlineValue(config.targetId || '');
            if (title) title.innerText = config.title;
            subtitle.innerText = config.subtitle;
            if (confirmBtn) confirmBtn.innerText = config.confirmLabel;
            input.placeholder = config.placeholder;
            input.value = security.cleanText(config.initialValue || '').slice(0, 120);
            app.updateRejectReasonCounter();
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }, 0);
        }),
        promptRejectReason: (req) => app.openReasonModal({
            targetId: req && req.id,
            title: '반려 사유 입력',
            subtitle: `${security.cleanText((req && req.userName) || '신청자')}님의 ${app.formatRequestPeriodText(req)} 신청을 반려합니다.`,
            placeholder: '예: 인력 공백으로 인해 해당 기간 사용이 어렵습니다.',
            confirmLabel: '반려',
            emptyMessage: '반려 사유를 입력해 주세요.',
            initialValue: (req && req.rejectReason) || ''
        }),
        promptRetroDetailReason: (context = {}) => {
            const userName = security.cleanText(context.userName || '신청자');
            const displayType = security.cleanText(context.displayType || '연차');
            const periodText = security.cleanText(context.periodText || '');
            const kindLabel = security.cleanText(context.kindLabel || '지난 신청');
            const targetText = periodText ? `${periodText} ${displayType}` : displayType;
            return app.openReasonModal({
                targetId: context.targetId || '',
                title: '상세사유 입력',
                subtitle: `${userName}님의 ${targetText} 신청은 ${kindLabel}에 해당합니다. 상세사유를 입력해 주세요.`,
                placeholder: '예: 누락된 신청을 뒤늦게 보완 등록합니다.',
                confirmLabel: '확인',
                emptyMessage: '상세사유를 입력해 주세요.',
                initialValue: context.initialValue || ''
            });
        },
        buildRetroactiveRequestContext: (requestUser, requestData) => {
            const safeDate = security.normalizeDate(requestData && requestData.startDate);
            if (!safeDate) return { required: false, isPastDate: false, isPastTime: false, kindLabel: '' };
            const today = moment().startOf('day');
            const targetDay = moment(safeDate, 'YYYY-MM-DD');
            const isPastDate = targetDay.isBefore(today, 'day');
            let isPastTime = false;

            if (!isPastDate && targetDay.isSame(today, 'day')) {
                if (requestData.type === '시간차(퇴근)') {
                    const endHour = Number(app.getTimeoffEndHourForDate(requestUser, safeDate));
                    const startHour = Number(timeLogic.calcStart(Number(requestData.hours || 0), endHour));
                    if (Number.isFinite(startHour)) {
                        const startMoment = moment(`${safeDate} ${String(startHour).padStart(2, '0')}:00`, 'YYYY-MM-DD HH:mm');
                        isPastTime = moment().isSameOrAfter(startMoment);
                    }
                } else if (requestData.type === '시간차(외출)') {
                    const rangeText = security.cleanText(requestData.timeRange || '');
                    const startText = rangeText.split('~')[0] || '';
                    const startHour = parseInt(startText, 10);
                    if (Number.isFinite(startHour)) {
                        const startMoment = moment(`${safeDate} ${String(startHour).padStart(2, '0')}:00`, 'YYYY-MM-DD HH:mm');
                        isPastTime = moment().isSameOrAfter(startMoment);
                    }
                }
            }

            return {
                required: isPastDate || isPastTime,
                isPastDate,
                isPastTime,
                kindLabel: isPastDate && isPastTime
                    ? '지난 날짜 및 지난 시간'
                    : (isPastDate ? '지난 날짜' : (isPastTime ? '지난 시간' : ''))
            };
        },
        closeRejectReasonModal: (result = null) => {
            const modal = document.getElementById('reject-reason-modal');
            const input = document.getElementById('reject-reason-input');
            const title = document.getElementById('reject-reason-title');
            const subtitle = document.getElementById('reject-reason-subtitle');
            const confirmBtn = document.getElementById('reject-reason-confirm-btn');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            if (input) input.value = '';
            if (title) title.innerText = '반려 사유 입력';
            if (subtitle) subtitle.innerText = '반려 사유를 입력해 주세요.';
            if (confirmBtn) confirmBtn.innerText = '반려';
            if (input) input.placeholder = '예: 인력 공백으로 인해 해당 기간 사용이 어렵습니다.';
            app.updateRejectReasonCounter();
            app.rejectReasonTargetId = '';
            app.reasonModalConfig = null;
            const resolver = app.rejectReasonResolve;
            app.rejectReasonResolve = null;
            if (typeof resolver === 'function') resolver(result);
        },
        confirmRejectReasonModal: () => {
            const input = document.getElementById('reject-reason-input');
            const reason = security.cleanText((input && input.value) || '').slice(0, 120);
            if (!reason) {
                alert((app.reasonModalConfig && app.reasonModalConfig.emptyMessage) || '반려 사유를 입력해 주세요.');
                return;
            }
            app.closeRejectReasonModal(reason);
        },
        getConflictMessageByStatus: (status) => {
            const safe = security.normalizeStatus(status);
            if (safe === 'approved') return '이미 다른 사용자가 승인한 신청입니다. 최신 상태를 다시 확인해 주세요.';
            if (safe === 'rejected') return '이미 다른 사용자가 반려한 신청입니다. 최신 상태를 다시 확인해 주세요.';
            if (safe === 'cancel_requested') return '이미 취소 요청으로 변경된 신청입니다. 최신 상태를 다시 확인해 주세요.';
            if (safe === 'cancelled') return '이미 취소 완료된 신청입니다. 최신 상태를 다시 확인해 주세요.';
            return '이미 다른 사용자가 처리한 신청입니다. 최신 상태를 다시 확인해 주세요.';
        },
        handleRequestConflict: async (status) => {
            alert(app.getConflictMessageByStatus(status));
            await db.loadDeferred();
            app.refreshDashboard();
        },
        handleDuplicateRequestConflict: async (startDate, endDate) => {
            const safeStart = security.normalizeDate(startDate, '');
            const safeEnd = security.normalizeDate(endDate, safeStart);
            const dateText = safeStart
                ? (safeStart === safeEnd ? safeStart : `${safeStart} ~ ${safeEnd}`)
                : '동일 기간';
            alert(`이미 같은 날짜에 신청된 연차 내역이 있습니다.\n(${dateText})\n최신 상태를 다시 확인해 주세요.`);
            await db.loadDeferred();
            app.refreshDashboard();
        },


        approveAll: async (type) => {
            const targets = appData.requests.filter(r => {
                if (type === 'pending' && r.status !== 'pending') return false;
                if (type === 'cancel' && r.status !== 'cancel_requested') return false;
                if (type === 'reject' && r.status !== 'pending') return false;
                if (type === 'cancel_reject' && r.status !== 'cancel_requested') return false;
                return app.canApproveRequest(r);
            });

            if (targets.length === 0) return alert('처리할 내역이 없습니다.');
            const msg = type === 'pending' ? '승인' : (type === 'reject' ? '반려' : (type === 'cancel' ? '취소 승인' : '취소 반려'));
            if (!confirm(`총 ${targets.length}건을 일괄 ${msg} 하시겠습니까?`)) return;
            
            document.getElementById('loading-text').innerText = "일괄 처리 중...";
            document.getElementById('loading-overlay').style.display = 'flex';

            const toEmailSet = new Set();
            const ccEmailSet = new Set();
            for (const r of targets) {
                if (type === 'cancel' && moment(r.startDate).isBefore(moment().startOf('day'))) continue;
                const expectedStatus = type === 'pending' || type === 'reject' ? 'pending' : 'cancel_requested';

                if (type === 'pending') r.status = 'approved';
                else if (type === 'reject') r.status = 'rejected';
                else if (type === 'cancel') r.status = 'cancelled';
                else if (type === 'cancel_reject') r.status = 'approved';
                const saved = await db.upsertReq(r, { expectedStatus });
                if (!saved) {
                    document.getElementById('loading-overlay').style.display = 'none';
                    return;
                }
                const requester = appData.users.find(user => String(user.id) === String(r.userId));
                if (requester) {
                    const recipients = app.getMailRecipientsForRequester(requester);
                    String(recipients.to || '').split(';').map((item) => security.cleanEmail(item)).filter(Boolean).forEach((email) => toEmailSet.add(email));
                    String(recipients.cc || '').split(';').map((item) => security.cleanEmail(item)).filter(Boolean).filter((email) => !toEmailSet.has(email)).forEach((email) => ccEmailSet.add(email));
                }
            }
            document.getElementById('loading-overlay').style.display = 'none';
            if (toEmailSet.size > 0) {
                const recipients = [...toEmailSet].join(';'); 
                const cc = [...ccEmailSet].filter((email) => !toEmailSet.has(email)).join(';');
                const subject = `[NCORE 연차관리] 연차 신청 건이 일괄 ${msg}되었습니다.`;
                        const body = `안녕하세요,\n\n아래 대상자의 연차 내역이 관리자에 의해 일괄 [${msg}] 처리되었습니다.\n\n접속주소: ${window.location.origin}/`;
                openOutlookDraft(recipients, subject, body, cc);
                alert(`총 ${targets.length}건 처리 완료.\n아웃룩 창이 뜨면 [보내기]를 눌러주세요.`);
            } else { alert('처리되었습니다.'); }
            await app.logUserAction('BulkApproval', `${type}:${targets.length}`);
            app.refreshDashboard();
        },

        editReq: (id) => {
            const safeId = security.cleanInlineValue(id);
            const req = appData.requests.find(r => String(r.id) === String(safeId)); 
            if (!req) return;
            if (req.status !== 'pending') return alert('대기 상태인 항목만 수정 가능합니다.');
            app.editingId = safeId; 
            const normalizedType = security.normalizeType(req.type);
            const selectedTypeValue = app.getRequestEditSelectionValue(req);
            app.refreshRequestTypeOptions(selectedTypeValue);
            document.getElementById('req-type').value = selectedTypeValue;
            const specialMode = document.getElementById('req-special-mode');
            if (specialMode) {
                specialMode.innerHTML = app.getSpecialModeOptionsHtml(normalizedType);
                specialMode.value = normalizedType;
            }
            const sEl = document.getElementById('req-start-date'); const eEl = document.getElementById('req-end-date');
            sEl.value = moment(req.startDate).format('YYYY-MM-DD'); eEl.value = moment(req.endDate).format('YYYY-MM-DD');
            document.getElementById('req-reason').value = req.reason;
            document.getElementById('is-multi-day').checked = req.startDate !== req.endDate;
            toggleInputs();
            if (normalizedType === '시간차(퇴근)') {
                const dEl = document.getElementById('req-duration-timeoff');
                if (dEl && Number(req.hours) >= 1 && Number(req.hours) <= 7) dEl.value = String(Number(req.hours));
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
            document.getElementById('req-modal-title').innerText = "연차 수정";
            document.getElementById('req-modal-btn').innerText = "수정 완료";
            document.getElementById('req-modal').classList.remove('hidden');
        },

        submitRequest: async () => {
            try {
                if (!app.currentUser) { alert("세션이 만료되었습니다."); return; }
                const requestUser = app.getRequestModalTargetUser();
                const isAdminProxy = app.isAdminProxyRequestMode();
                if (!requestUser) return alert('대상 직원을 선택해주세요.');
                const selection = app.getCurrentRequestSelection();
                const type = selection.baseType;
                const isReportRequest = ['잔업', '특근'].includes(type);
                const rawStartDate = document.getElementById('req-start-date').value;
                if(!rawStartDate) return alert('날짜를 선택하세요');
                const sDate = security.normalizeDate(rawStartDate);
                const isMultiDay = document.getElementById('is-multi-day').checked;
                let eDate = isMultiDay ? security.normalizeDate(document.getElementById('req-end-date').value, sDate) : sDate;
                const reason = isReportRequest
                    ? security.cleanText(document.getElementById('req-report-reason')?.value || '')
                    : security.cleanText(document.getElementById('req-reason').value);
                const workDetail = security.cleanMultiline(document.getElementById('req-report-work-detail')?.value || '');
                const requestDept = security.cleanText(document.getElementById('req-report-dept')?.value || '');
                const note = security.cleanMultiline(document.getElementById('req-report-note')?.value || '');
                
                if(!sDate) return alert('날짜 형식이 올바르지 않습니다.');
                if(!reason) return alert(isReportRequest ? '사유를 입력하세요.' : '사유를 선택하세요');
                if (isReportRequest && !workDetail) return alert('업무내용을 입력하세요.');
                if (isReportRequest && !requestDept) return alert('요청 부서를 입력하세요.');
                
                const isSpecialDayOnly = selection.isSpecial && selection.requestMode === 'day_only';
                const allowHolidayRequest = !!selection.allowHolidayRequest;
                if (!isSpecialDayOnly && !allowHolidayRequest && (holidayLogic.isRedDay(sDate) || holidayLogic.isSat(sDate))) {
                    if (!isReportRequest || type === '잔업') return alert("휴일/주말에는 신청할 수 없습니다.");
                }

                const currentStart = moment(sDate);
                const currentEnd = moment(eDate);
                const duplicate = appData.requests.find(r => {
                    if (isReportRequest || app.isWorkReportRequest(r)) return false;
                    if (String(r.userId) !== String(requestUser.id)) return false; 
                    if (['cancelled', 'rejected'].includes(r.status)) return false; 
                    if (app.editingId && String(r.id) === String(app.editingId)) return false;
                    if (app.isTimeOffType(type) && app.isTimeOffConflictRequest(r)) return false;

                    const existingStart = moment(r.startDate);
                    const existingEnd = moment(r.endDate);
                    return currentStart.isSameOrBefore(existingEnd) && currentEnd.isSameOrAfter(existingStart);
                });

                if (duplicate) {
                    const dS = app.fmtDate(duplicate.startDate);
                    const dE = app.fmtDate(duplicate.endDate);
                    const rangeStr = (duplicate.startDate === duplicate.endDate) ? dS : `${dS} ~ ${dE}`;
                    return alert(`이미 해당 날짜에 신청된 연차 내역이 있습니다.\n(${rangeStr})`);
                }
                
                let hours = 0, timeRange = '';
                let reportCategory = '';
                let requestedStartAt = '';
                let requestedEndAt = '';
                if(type==='연차') {
                    const days = selection.dayCountMode === 'calendar_days'
                        ? (moment(eDate).startOf('day').diff(moment(sDate).startOf('day'), 'days') + 1)
                        : holidayLogic.calcBizDays(sDate, eDate);
                    if(days===0) return alert(isSpecialDayOnly ? '차감 일수를 확인해주세요.' : '선택하신 기간은 모두 휴일입니다.');
                    hours = days*8;
                } else if(app.isHalfDayType(type)) {
                    hours = 4;
                    const halfRange = app.buildHalfDayTimeRange(requestUser, sDate, type);
                    if (!halfRange) return alert('근무시간 정보를 확인할 수 없습니다.');
                    timeRange = `${halfRange.startHour}:00~${halfRange.endHour}:00`;
                }
                else if(type==='시간차(퇴근)') {
                    const d = parseInt(document.getElementById('req-duration-timeoff').value);
                    const e = app.getTimeoffEndHourForDate(requestUser, sDate);
                    hours = d; timeRange = `${timeLogic.calcStart(d,e)}:00~${e}:00`;
                } else if(type==='시간차(외출)') { 
                    const s = parseInt(document.getElementById('req-start-time-out').value, 10);
                    const d = parseInt(document.getElementById('req-duration-out').value, 10);
                    const e = calcOutEndTime(s, d);
                    if(e === null) return alert('근무시간(18:00) 안에서 설정해주세요.');
                    hours = d; timeRange = `${s}:00~${e}:00`;
                } else if (type === '잔업') {
                    const startHour = Number(app.getTimeoffEndHourForDate(requestUser, sDate));
                    const duration = parseInt(document.getElementById('req-report-duration')?.value || '1', 10);
                    const endHour = startHour + duration;
                    if (!Number.isFinite(startHour) || !Number.isFinite(duration) || endHour > 24) return alert('잔업 시간을 다시 확인해주세요.');
                    hours = duration;
                    timeRange = `${formatHour(startHour)}~${formatHour(endHour)}`;
                    reportCategory = 'overtime';
                    requestedStartAt = formatHour(startHour);
                    requestedEndAt = formatHour(endHour);
                    eDate = sDate;
                } else if (type === '특근') {
                    hours = 0;
                    timeRange = '종일';
                    reportCategory = 'holiday_work';
                    requestedStartAt = '';
                    requestedEndAt = '';
                    eDate = sDate;
                } else {
                    return alert('연차 종류 오류');
                }

                if (isReportRequest) {
                    const weeklySummary = app.getWeeklyWorkLimitSummary({
                        user: requestUser,
                        dateStr: sDate,
                        type,
                        duration: type === '특근' ? 0 : hours,
                        excludeRequestId: app.editingId || ''
                    });
                    if (weeklySummary && weeklySummary.overLimit) {
                        return alert(`주간 예정 근로시간이 52시간을 초과합니다.\n[기준 주간] ${weeklySummary.weekStart} ~ ${weeklySummary.weekEnd}\n기본근로시간 ${weeklySummary.basicHours}시간 + 기존 잔업/특근 ${weeklySummary.existingReportHours}시간 + 이번 신청 ${weeklySummary.currentRequestHours}시간 = 총 ${weeklySummary.totalHours}시간`);
                    }
                }

                if (!isReportRequest && app.isTimeOffType(type)) {
                    const timeOffConflict = app.findTimeOffConflictRequest(requestUser, {
                        type,
                        startDate: sDate,
                        timeRange
                    }, {
                        editingId: app.editingId || ''
                    });
                    if (timeOffConflict) {
                        return alert(app.getTimeOffConflictMessage(timeOffConflict, type));
                    }
                }

                const currentEditingRequest = app.editingId ? appData.requests.find(r => String(r.id) === String(app.editingId)) : null;
                const retroMeta = app.buildRetroactiveRequestContext(requestUser, {
                    type,
                    startDate: sDate,
                    hours,
                    timeRange
                });
                let detailReason = '';
                if (!isReportRequest && retroMeta.required) {
                    detailReason = await app.promptRetroDetailReason({
                        targetId: app.editingId || '',
                        userName: requestUser.name,
                        displayType: app.getRequestDisplayType({ type, specialLeaveTypeLabel: selection.specialLeaveTypeLabel }),
                        periodText: app.formatRequestPeriodText({ startDate: sDate, endDate: eDate, timeRange }),
                        kindLabel: retroMeta.kindLabel,
                        initialValue: (currentEditingRequest && currentEditingRequest.detailReason) || ''
                    });
                    if (detailReason === null) return;
                }

                if (app.editingId) {
                    const idx = appData.requests.findIndex(r => String(r.id) === String(app.editingId));
                    if (idx !== -1) {
                        const oldReq = appData.requests[idx];
                    const bucketSummary = app.getRequestBucketSummary(requestUser, selection, oldReq);
                        if (!bucketSummary.ok) return alert(bucketSummary.message);
                        if (hours > bucketSummary.availableHours) {
                            const bucketLabel = bucketSummary.bucket === 'special' ? bucketSummary.label : '연차';
                            return alert(`잔여 ${bucketLabel} 부족\n(수정 가능 잔여: ${app.fmtTime(bucketSummary.availableHours)})`);
                        }

                        const updatedReq = security.sanitizeRequest({
                            ...oldReq,
                            employeeNo: requestUser.employeeNo || oldReq.employeeNo || '',
                            type,
                            startDate: sDate,
                            endDate: eDate,
                            hours,
                            timeRange: timeRange || '',
                            reason,
                            detailReason,
                            reportCategory,
                            workDetail,
                            requestDept,
                            note,
                            requestedStartAt,
                            requestedEndAt,
                            reportedHours: hours,
                            timestamp: new Date().toISOString(),
                            specialLeaveTypeKey: selection.specialLeaveTypeKey,
                            specialLeaveTypeLabel: selection.specialLeaveTypeLabel
                        });
                        const expectedStatus = isAdminProxy ? security.normalizeStatus(String(oldReq.status || 'pending')) : 'pending';
                        const savedEdit = await db.upsertReq(updatedReq, { keepOverlayOnSuccess: true, expectedStatus });
                        if (!savedEdit) return;
                        await app.logUserAction(isAdminProxy ? 'AdminRequestEdit' : 'RequestEdit', `${updatedReq.id}:${app.getRequestDisplayType(updatedReq)}:${updatedReq.startDate}:${requestUser.id}`);
                        document.getElementById('req-modal').classList.add('hidden');
                        app.adminRequestEditMode = false;
                        if (app.currentView === 'master-permissions' && app.masterPermissionTab === 'ops') app.renderMasterPermissionPage();
                        else app.refreshDashboard();
                        const recipients = isAdminProxy ? { to: '', cc: [] } : app.getMailRecipientsForRequester(app.currentUser);
                        if (!isReportRequest && recipients.to) {
                            const userRank = app.currentUser.rank || '';
                            const displayType = app.getRequestDisplayType(updatedReq);
                            const changeSummary = app.buildRequestChangeSummary(oldReq, updatedReq);
                            const subject = `[연차신청 수정] ${app.currentUser.name} ${userRank} - ${displayType}`;
                        const body = `안녕하세요.\n\n기존에 접수되었던 아래 연차 신청 건이 신청자의 요청에 의해 수정되었습니다.\n변경된 내용을 확인 부탁드립니다.\n\n[수정 대상]\n- 이름: ${app.currentUser.name} ${userRank}\n\n[변경 내용]\n${changeSummary}\n\n업무에 참고 부탁드립니다.\n\n접속주소: ${window.location.origin}/`;
                            openOutlookDraft(recipients.to, subject, body, recipients.cc);
                            alert('수정되었습니다. 아웃룩 창이 뜨면 [보내기]를 눌러주세요.');
                        } else {
                            alert(isReportRequest ? '보고가 수정되었습니다.' : (isAdminProxy ? '관리자 대리 수정이 완료되었습니다.' : '수정되었습니다.'));
                        }
                        document.getElementById('loading-overlay').style.display = 'none';
                    }
                } else {
                    const bucketSummary = app.getRequestBucketSummary(requestUser, selection, null);
                    if (!bucketSummary.ok) return alert(bucketSummary.message);
                    if (!isReportRequest && hours > bucketSummary.availableHours) {
                        const bucketLabel = bucketSummary.bucket === 'special' ? bucketSummary.label : '연차';
                        return alert(`잔여 ${bucketLabel} 부족\n(승인 대기 포함 잔여: ${app.fmtTime(bucketSummary.availableHours)})`);
                    }
                    
                    const newReq = security.sanitizeRequest({
                        id: Date.now(), userId: requestUser.id, employeeNo: requestUser.employeeNo || '', userName: requestUser.name, 
                        dept: requestUser.dept, role: requestUser.role, type, startDate: sDate, endDate: eDate, 
                        hours, timeRange: timeRange || '', reason, detailReason, status: isReportRequest ? 'reported' : (isAdminProxy ? 'approved' : 'pending'),
                        reportCategory,
                        workDetail,
                        requestDept,
                        note,
                        requestedStartAt,
                        requestedEndAt,
                        reportedHours: hours,
                        timestamp: new Date().toISOString(),
                        specialLeaveTypeKey: selection.specialLeaveTypeKey,
                        specialLeaveTypeLabel: selection.specialLeaveTypeLabel
                    });
                    const savedNew = await db.upsertReq(newReq, { keepOverlayOnSuccess: true });
                    if (!savedNew) return;
                    await app.logUserAction(isAdminProxy ? 'AdminRequestCreate' : 'RequestCreate', `${newReq.id}:${app.getRequestDisplayType(newReq)}:${newReq.startDate}:${requestUser.id}`);
                    document.getElementById('req-modal').classList.add('hidden');
                    if (app.currentView === 'master-permissions' && app.masterPermissionTab === 'ops') app.renderMasterPermissionPage();
                    else app.refreshDashboard();

                    const recipients = isAdminProxy ? { to: '', cc: [] } : app.getMailRecipientsForRequester(app.currentUser);
                    if(!isReportRequest && recipients.to) {
                        const userRank = app.currentUser.rank || '';
                        const displayType = app.getRequestDisplayType(newReq);
                        const subject = `[연차신청] ${app.currentUser.name} ${userRank} - ${displayType}`;
                        const dateRange = (sDate === eDate) ? sDate : `${sDate} ~ ${eDate}`;
                        const body = `연차가 신청 되었습니다.\n\n접속주소: ${window.location.origin}/\n\n[신청 내용]\n- 이름: ${app.currentUser.name} ${userRank}\n- 종류: ${displayType}\n- 기간: ${dateRange} ${timeRange ? '('+timeRange+')' : ''}\n- 사유: ${reason}`;
                        openOutlookDraft(recipients.to, subject, body, recipients.cc);
                        alert('저장이 완료되었습니다. 아웃룩 창이 뜨면 [보내기]를 눌러주세요.');
                    } else { alert(isReportRequest ? '보고가 저장되었습니다.' : (isAdminProxy ? '관리자 대리 등록이 즉시 반영되었습니다.' : '저장이 완료되었습니다.')); }
                    document.getElementById('loading-overlay').style.display = 'none';
                }
            } catch (err) {
                console.error(err);
                const msg = String((err && err.message) || '');
                if (msg.startsWith('REQUEST_DUPLICATE_CONFLICT:')) {
                    const parts = msg.split(':');
                    const duplicateType = security.normalizeType(parts[3] || '');
                    const duplicateTimeRange = security.cleanText(parts.slice(4).join(':') || '');
                    if (app.isTimeOffType(duplicateType)) {
                        const fakeReq = { type: duplicateType, timeRange: duplicateTimeRange };
                        alert(app.getTimeOffConflictMessage(fakeReq, type));
                        await db.loadDeferred();
                        app.refreshDashboard();
                        return;
                    }
                    await app.handleDuplicateRequestConflict(parts[1] || '', parts[2] || parts[1] || '');
                    return;
                }
                if (msg.startsWith('REQUEST_STATE_CONFLICT:')) {
                    await app.handleRequestConflict(msg.split(':')[1] || '');
                    return;
                }
                alert("신청 처리 중 오류: " + err.message);
                document.getElementById('loading-overlay').style.display = 'none';
            }
        },

        processReq: async (id, action) => {
            const safeId = security.cleanInlineValue(id);
            const req = appData.requests.find(r=> String(r.id) === String(safeId)); 
            if(!req) return;

            const approvalActions = ['approve', 'reject', 'cancel_approve', 'cancel_reject'];
            if (approvalActions.includes(action) && !app.canApproveRequest(req)) {
                alert('승인 권한이 없습니다.');
                return;
            }
            if (action === 'cancel_req' && !app.requestBelongsToUser(req, app.currentUser)) {
                alert('본인 신청만 취소할 수 있습니다.');
                return;
            }

            if (action === 'cancel_req') {
                if (req.status === 'approved' && !app.canCancelApprovedRequest(req)) {
                    alert('지난 날짜의 승인 건은 취소할 수 없습니다.');
                    return;
                }
                if (!['pending', 'approved'].includes(req.status)) {
                    alert('이 상태는 취소할 수 없습니다.');
                    return;
                }
            }

            let mailType = '';
            let shouldSendCancelRequestMail = false;
            let shouldSendPendingCancelNoticeMail = false;
            const expectedStatus = action === 'approve' || action === 'reject'
                ? 'pending'
                : (action === 'cancel_approve' || action === 'cancel_reject'
                    ? 'cancel_requested'
                    : (action === 'cancel_req'
                        ? (req.status === 'pending' ? 'pending' : 'approved')
                        : ''));
            
            if(action === 'approve') { req.status = 'approved'; mailType = '승인'; }
            else if(action === 'reject') {
                const rejectReason = await app.promptRejectReason(req);
                if (rejectReason === null) return;
                req.status = 'rejected';
                req.rejectReason = rejectReason;
                mailType = '반려';
            }
            else if(action === 'cancel_req') {
                if (req.status === 'pending') {
                    if(!confirm('취소하시겠습니까?')) return;
                    req.status = 'cancelled';
                    shouldSendPendingCancelNoticeMail = true;
                } else if (req.status === 'approved') {
                    if(!confirm('취소 요청을 올리시겠습니까?')) return;
                    req.status = 'cancel_requested';
                    shouldSendCancelRequestMail = true;
                }
            } 
            else if(action === 'cancel_approve') { req.status = 'cancelled'; mailType = '취소승인'; }
            else if(action === 'cancel_reject') { req.status = 'approved'; }

            const savedReq = await db.upsertReq(req, { keepOverlayOnSuccess: true, expectedStatus });
            if (!savedReq) return;
            try {
                await app.logUserAction('RequestProcess', `${safeId}:${action}`);

                if (action === 'cancel_req' && shouldSendPendingCancelNoticeMail) {
                    const recipients = app.getMailRecipientsForRequester(app.currentUser);
                    if (recipients.to) {
                        const userRank = app.currentUser.rank || '';
                        const sFmt = moment(req.startDate).format('YYYY-MM-DD');
                        const eFmt = moment(req.endDate).format('YYYY-MM-DD');
                        const dateRange = (sFmt === eFmt) ? sFmt : `${sFmt} ~ ${eFmt}`;
                        const displayType = app.getRequestDisplayType(req);
                        const subject = `[연차신청 취소 안내] ${app.currentUser.name} ${userRank} - ${displayType}`;
                        const body = `안녕하세요.\n\n기존에 접수되었던 아래 연차 신청 건이 신청자의 요청에 의해 취소되었습니다.\n해당 건은 더 이상 결재 또는 일정 반영이 필요하지 않습니다.\n\n[취소 내용]\n- 이름: ${app.currentUser.name} ${userRank}\n- 종류: ${displayType}\n- 기간: ${dateRange}\n- 사유: ${req.reason || '-'}\n\n업무에 참고 부탁드립니다.\n\n접속주소: ${window.location.origin}/`;
                        openOutlookDraft(recipients.to, subject, body, recipients.cc);
                        alert('취소되었습니다. 아웃룩 창이 뜨면 [보내기]를 눌러주세요.');
                    } else {
                        alert('취소되었습니다. (메일 수신 설정 또는 이메일 정보가 없습니다.)');
                    }
                }

                if (action === 'cancel_req' && shouldSendCancelRequestMail) {
                    const recipients = app.getMailRecipientsForRequester(app.currentUser);
                    if (recipients.to) {
                        const userRank = app.currentUser.rank || '';
                        const sFmt = moment(req.startDate).format('YYYY-MM-DD');
                        const eFmt = moment(req.endDate).format('YYYY-MM-DD');
                        const dateRange = (sFmt === eFmt) ? sFmt : `${sFmt} ~ ${eFmt}`;
                        const displayType = app.getRequestDisplayType(req);
                        const subject = `[연차취소요청] ${app.currentUser.name} ${userRank} - ${displayType}`;
                        const body = `연차 취소 요청이 등록되었습니다.\n\n접속주소: ${window.location.origin}/\n\n[요청 내용]\n- 이름: ${app.currentUser.name} ${userRank}\n- 종류: ${displayType}\n- 기간: ${dateRange}\n- 사유: ${req.reason || '-'}`;
                        openOutlookDraft(recipients.to, subject, body, recipients.cc);
                        alert('취소 요청이 저장되었습니다. 아웃룩 창이 뜨면 [보내기]를 눌러주세요.');
                    } else {
                        alert('취소 요청이 저장되었습니다. (결재자 이메일 정보가 없습니다.)');
                    }
                }
                
                if (mailType && action !== 'cancel_req') {
                    let targetUser = appData.users.find(u => String(u.id) === String(req.userId));
                    const recipients = targetUser ? app.getMailRecipientsForRequester(targetUser) : { to: '', cc: '' };
                    if (recipients.to) {
                        const subject = `[연차${mailType}] 신청하신 연차가 ${mailType}되었습니다.`;
                        const sFmt = moment(req.startDate).format('YYYY-MM-DD');
                        const eFmt = moment(req.endDate).format('YYYY-MM-DD');
                        const dateRange = (sFmt === eFmt) ? sFmt : `${sFmt} ~ ${eFmt}`;
                        const body = action === 'reject'
                            ? `${targetUser ? `${targetUser.name} ${targetUser.rank || ''}님,\n\n` : ''}신청하신 연차가 관리자에 의해 [${mailType}] 처리되었습니다.\n반려 사유를 확인 부탁드립니다.\n\n- 기간: ${dateRange}\n- 반려 사유: ${security.cleanText(req.rejectReason || '-') || '-'}\n\n접속주소: ${window.location.origin}/`
                            : `${targetUser ? `${targetUser.name} ${targetUser.rank || ''}님,\n\n` : ''}신청하신 연차가 관리자에 의해 [${mailType}] 처리되었습니다.\n\n- 기간: ${dateRange}\n\n접속주소: ${window.location.origin}/`;
                        openOutlookDraft(recipients.to, subject, body, recipients.cc);
                        alert(`처리되었습니다. 아웃룩 창이 뜨면 [보내기]를 눌러주세요.`);
                    } else { 
                        alert('처리되었습니다. (메일 수신 설정 또는 이메일 정보가 없습니다.)'); 
                    }
                }
                app.refreshDashboard();
            } finally {
                const loadingEl = document.getElementById('loading-overlay');
                if (loadingEl) loadingEl.style.display = 'none';
            }
        },

        deleteReq: async (id) => {
            if(!confirm('삭제하시겠습니까?')) return;
            const safeId = security.cleanInlineValue(id);
            const targetReq = appData.requests.find((r) => String(r.id) === String(safeId));
            if (!targetReq) return;
            if (targetReq.status !== 'cancelled') {
                return alert('취소된 항목만 삭제할 수 있습니다.');
            }
            await db.deleteReq(safeId);
            app.refreshDashboard();
        },


        togglePastDates: () => {
            const allowPast = document.getElementById('allow-past')?.checked;
            const sDate = document.getElementById('req-start-date'); const eDate = document.getElementById('req-end-date');
            const today = moment().format('YYYY-MM-DD');
            if(sDate) {
                if (allowPast) { sDate.removeAttribute('min'); if(eDate) eDate.removeAttribute('min'); }
                else { sDate.min = today; if(sDate.value && sDate.value < today) { sDate.value = today; if(eDate) eDate.value = today; } }
            }
        },

        toggleApproveScopeCheckbox: (userId, scope, checked) => {
            if (!checked) return;
            const scopes = ['manual', 'parts', 'all'];
            scopes.forEach(s => {
                if (s === scope) return;
                const el = document.getElementById(`perm-approve-${s}-${userId}`);
                if (el) el.checked = false;
            });
        },
        toggleMemberStatusScopeCheckbox: (userId, scope, checked) => {
            if (!checked) return;
            const scopes = ['manual', 'parts', 'all'];
            scopes.forEach(s => {
                if (s === scope) return;
                const el = document.getElementById(`perm-member-status-${s}-${userId}`);
                if (el) el.checked = false;
            });
        },
        saveMasterPermissionTable: async () => {
            if (!app.hasMasterPermissionAccess()) {
                alert('권한/설정 권한이 없습니다.');
                return;
            }

            appData.users = appData.users.map(user => {
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
                    loadingText: '권한 저장 중입니다...'
                });
                permissionSaveOk = true;
                const freshMe = appData.users.find(u => String(u.id) === String(app.currentUser.id));
                if (freshMe) {
                    app.currentUser = {
                        ...app.currentUser,
                        permissions: freshMe.permissions,
                        featureMemberCard: freshMe.featureMemberCard,
                        featureHomepage: freshMe.featureHomepage,
                        featureBoard: freshMe.featureBoard
                    };
                }
                try {
                    await app.logUserAction('PermissionSave', 'permissions_only');
                } catch (e) {
                    console.warn('권한 저장 로그 실패:', e);
                }
                alert('권한 저장 완료');
            } finally {
                document.getElementById('loading-overlay').style.display = 'none';
                if (permissionSaveOk) {
                    app.renderNav();
                    app.renderMasterPermissionPage();
                }
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
