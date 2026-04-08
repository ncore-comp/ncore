    const app = {
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
            return [...regularOptions, ...specialOptions]
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
        ensureCalendarMode: () => {
            const allowed = app.getAllowedCalendarModes();
            if (!allowed.includes(app.calendarMode)) app.calendarMode = allowed[0];
        },
        setCalendarMode: (mode) => {
            const allowed = app.getAllowedCalendarModes();
            if (!allowed.includes(mode)) return;
            app.calendarMode = mode;
            app.refreshDashboard();
        },
        renderCalendarTabs: () => {
            app.ensureCalendarMode();
            const labels = {
                self: '개인',
                manual: '매뉴얼팀',
                parts: '파츠북팀',
                all: '모두',
                rejected: '반려',
                workreport: '잔업/특근'
            };
            const allModes = ['self', 'manual', 'parts', 'all', 'rejected', 'workreport'];
            const allowedSet = new Set(app.getAllowedCalendarModes());
            return `<div class="inline-flex flex-wrap items-end gap-1">${allModes.map(mode => {
                const isAllowed = allowedSet.has(mode);
                const isActive = isAllowed && app.calendarMode===mode;
                const baseClass = app.isMobileViewport
                    ? 'px-2.5 py-1.5 rounded-t-lg rounded-b-md text-xs font-bold border transition'
                    : 'px-3 py-1.5 rounded-t-lg rounded-b-md text-sm font-bold border transition';
                const stateClass = !isAllowed
                    ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed opacity-70'
                    : (isActive ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-200 relative top-[1px]' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200');
                const attrs = isAllowed
                    ? `onclick="app.setCalendarMode('${mode}')"`
                    : `disabled aria-disabled="true" title="권한 없음"`;
                return `<button ${attrs} class="${baseClass} ${stateClass}">${labels[mode]}</button>`;
            }).join('')}</div>`;
        },
        getCalendarModeLabel: () => {
            const labels = {
                self: '개인',
                manual: '매뉴얼팀',
                parts: '파츠북팀',
                all: '모두',
                rejected: '반려',
                workreport: '잔업/특근'
            };
            return labels[app.calendarMode] || '개인';
        },
        setCalendarDisplayMode: (mode) => {
            const safeMode = mode === 'list' ? 'list' : 'month';
            if (app.calendarDisplayMode === safeMode) return;
            app.calendarDisplayMode = safeMode;
            app.refreshDashboard();
        },
        toggleMobileCalendarOpen: () => {
            app.mobileCalendarOpen = !app.mobileCalendarOpen;
            app.refreshDashboard();
        },
        renderCalendarDisplayToggle: () => {
            if (!app.isMobileViewport) return '';
            const current = app.calendarDisplayMode === 'list' ? 'list' : 'month';
            return `<div class="inline-flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200 shadow-inner">
                <button onclick="app.setCalendarDisplayMode('month')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${current === 'month' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-600 hover:text-indigo-700'}">월간</button>
                <button onclick="app.setCalendarDisplayMode('list')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${current === 'list' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-600 hover:text-indigo-700'}">리스트</button>
            </div>`;
        },
        setLayoutMode: (mode = 'default') => {
            if (!document.body) return;
            document.body.classList.toggle('situation-board-active', mode === 'situation');
        },
        canAccessSituationBoard: () => {
            if (!app.currentUser) return false;
            const role = security.normalizeRole(String(app.currentUser.role || ''));
            if (role === 'master') return true;
            const perms = app.getCurrentPermissions();
            return app.isMobileViewport ? !!perms.canAccessSituationBoardMobile : !!perms.canAccessSituationBoardDesktop;
        },
        ensureSituationBoardDataLoaded: async () => {
            if (appData.meta.situationBoardLoaded) return true;
            try {
                app.setLoadingOverlayState('전체 상황판 데이터 로드중...', { subtext: '(최대 15초)' });
                const result = await db.loadSituationBoardData();
                return !!(result && result.ok);
            } catch (e) {
                console.error(e);
                alert('전체 상황판 데이터 로드 실패: ' + (e.message || '서버 상태를 확인하세요.'));
                return false;
            } finally {
                const loadingEl = document.getElementById('loading-overlay');
                if (loadingEl) loadingEl.style.display = 'none';
            }
        },
        openSituationBoard: async () => {
            if (!app.canAccessSituationBoard()) return alert('전체 상황판 권한이 없습니다.');
            const loaded = await app.ensureSituationBoardDataLoaded();
            if (!loaded) return;
            const today = moment().startOf('day');
            app.viewYear = today.year();
            app.viewMonth = today.month();
            app.situationBoardSelectedDate = today.format('YYYY-MM-DD');
            app.currentView = 'situation-board';
            app.renderNav();
            app.renderSituationBoard();
        },
        setSituationBoardScale: (scale) => {
            const safeScale = ['normal', 'large', 'xlarge'].includes(scale) ? scale : 'large';
            if (app.situationBoardScale === safeScale) return;
            app.situationBoardScale = safeScale;
            if (app.currentView === 'situation-board') app.renderSituationBoard();
        },
        setSituationBoardDeptFilter: (filter) => {
            const safeFilter = ['all', 'manual', 'parts'].includes(filter) ? filter : 'all';
            if (app.situationBoardDeptFilter === safeFilter) return;
            app.situationBoardDeptFilter = safeFilter;
            app.situationBoardSelectedDate = '';
            if (app.currentView === 'situation-board') app.renderSituationBoard();
        },
        setSituationBoardSelectedDate: (dateStr) => {
            const safeDate = security.normalizeDate(dateStr, '');
            if (!safeDate) return;
            app.situationBoardSelectedDate = safeDate;
            if (app.currentView === 'situation-board') app.renderSituationBoard();
        },
        updateSituationBoardSelectedDateUI: () => {
            document.querySelectorAll('.situation-board-cell[data-situation-date]').forEach((cell) => {
                cell.classList.toggle('is-selected', cell.dataset.situationDate === app.situationBoardSelectedDate);
            });
        },
        openSituationBoardInfoModal: () => {
            const modal = document.getElementById('situation-board-info-modal');
            if (modal) modal.classList.remove('hidden');
        },
        closeSituationBoardInfoModal: () => {
            const modal = document.getElementById('situation-board-info-modal');
            if (modal) modal.classList.add('hidden');
        },
        getSituationBoardSeatMapPdfSrc: () => './gemini-svg.svg',
        getSituationBoardSeatAnnotations: () => ([
            {
                id: 'entrance',
                kind: 'entrance',
                x: 6.2,
                y: 50.5,
                label: '입구'
            },
            {
                id: 'ceo-room',
                kind: 'room-label',
                x: 79,
                y: 56,
                label: '대표님실'
            }
        ]),
        getSituationBoardSeatMapSeats: () => ([
            { id: 'A-1', occupant: '이우석', x: 25.625, y: 36.25, w: 5.625, h: 8.75 },
            { id: 'A-2', occupant: '이재용', x: 25.625, y: 21.875, w: 5.625, h: 8.75 },
            { id: 'A-3', occupant: '김도형', x: 25.625, y: 7.5, w: 5.625, h: 8.75 },
            { id: 'A-4', occupant: '권재홍', x: 32.5, y: 7.5, w: 5.625, h: 8.75 },
            { id: 'A-5', occupant: '최혜리', x: 32.5, y: 21.875, w: 5.625, h: 8.75 },
            { id: 'A-6', occupant: '고다현', x: 32.5, y: 36.25, w: 5.625, h: 8.75 },
            { id: 'B-1', occupant: '박서진', x: 44.375, y: 37.5, w: 5.625, h: 8.75 },
            { id: 'B-2', occupant: '권윤희', x: 44.375, y: 27.5, w: 5.625, h: 8.75 },
            { id: 'B-3', occupant: '이동진', x: 44.375, y: 17.5, w: 5.625, h: 8.75 },
            { id: 'B-4', occupant: '황소연', x: 44.375, y: 7.5, w: 5.625, h: 8.75 },
            { id: 'B-5', occupant: '최진', x: 51.25, y: 7.5, w: 5.625, h: 8.75 },
            { id: 'B-6', occupant: '송현섭', x: 51.25, y: 17.5, w: 5.625, h: 8.75 },
            { id: 'B-7', occupant: '황지영', x: 51.25, y: 27.5, w: 5.625, h: 8.75 },
            { id: 'B-8', occupant: '임사언', x: 51.25, y: 37.5, w: 5.625, h: 8.75 },
            { id: 'B-9', occupant: '김기민', x: 60.625, y: 7.5, w: 5.625, h: 8.75 },
            { id: 'B-10', occupant: '길명선', x: 60.625, y: 17.5, w: 5.625, h: 8.75 },
            { id: 'C-1', occupant: '박진형', x: 4.375, y: 85, w: 5.625, h: 8.75 },
            { id: 'C-2', occupant: '김지현', x: 4.375, y: 70.625, w: 5.625, h: 8.75 },
            { id: 'C-3', occupant: '지혜은', x: 4.375, y: 56.25, w: 5.625, h: 8.75 },
            { id: 'C-4', occupant: '김효창', x: 11.25, y: 56.25, w: 5.625, h: 8.75 },
            { id: 'C-5', occupant: '김유진', x: 11.25, y: 70.625, w: 5.625, h: 8.75 },
            { id: 'C-6', occupant: '김희정', x: 11.25, y: 85, w: 5.625, h: 8.75 },
            { id: 'D-1', occupant: '김은지', x: 25.625, y: 85, w: 5.625, h: 8.75 },
            { id: 'D-2', occupant: '이선진', x: 25.625, y: 70.625, w: 5.625, h: 8.75 },
            { id: 'D-3', occupant: '서경주', x: 25.625, y: 56.25, w: 5.625, h: 8.75 },
            { id: 'D-4', occupant: '석다희', x: 32.5, y: 56.25, w: 5.625, h: 8.75 },
            { id: 'D-5', occupant: '최세록', x: 32.5, y: 70.625, w: 5.625, h: 8.75 },
            { id: 'D-6', occupant: '정수진', x: 32.5, y: 85, w: 5.625, h: 8.75 },
            { id: 'E-1', occupant: '안여란', x: 44.375, y: 85, w: 5.625, h: 8.75 },
            { id: 'E-2', occupant: '허윤미', x: 44.375, y: 70.625, w: 5.625, h: 8.75 },
            { id: 'E-3', occupant: '이지인', x: 44.375, y: 56.25, w: 5.625, h: 8.75 },
            { id: 'E-4', occupant: '박채원', x: 51.25, y: 56.25, w: 5.625, h: 8.75 },
            { id: 'E-5', occupant: '이정혜', x: 51.25, y: 70.625, w: 5.625, h: 8.75 },
            { id: 'E-6', occupant: '최은지', x: 51.25, y: 85, w: 5.625, h: 8.75 }
        ]),
        getSituationBoardSeatStatusMap: (dateStr) => {
            const events = app.getSituationBoardEventsForDate(dateStr);
            const byUser = new Map();
            const priorityOf = (req) => {
                if (app.isSituationBoardLongAbsence(req)) return 1;
                if (security.normalizeType(req.type) === '연차' || app.isSpecialLeaveRequest(req)) return 2;
                if (String(req.status || '') === 'pending') return 4;
                return 3;
            };
            events.forEach((req) => {
                const presenceState = app.getSituationBoardRequestPresenceState(req, dateStr);
                if (!presenceState.absent) return;
                const key = String(req.userName || '').trim();
                if (!key) return;
                const existing = byUser.get(key);
                if (!existing || priorityOf(req) < priorityOf(existing)) byUser.set(key, req);
            });
            return byUser;
        },
        getSituationBoardSeatDailyAbsentGroups: (dateStr) => {
            const events = app.getSituationBoardEventsForDate(dateStr);
            const byUser = new Map();
            const priorityOf = (req) => {
                if (app.isSituationBoardLongAbsence(req)) return 1;
                if (security.normalizeType(req.type) === '연차' || app.isSpecialLeaveRequest(req)) return 2;
                if (String(req.status || '') === 'pending') return 4;
                return 3;
            };
            events.forEach((req) => {
                const presenceState = app.getSituationBoardRequestPresenceState(req, dateStr);
                if (!presenceState.absent) return;
                const key = String(req.userName || '').trim();
                if (!key) return;
                const list = byUser.get(key) || [];
                list.push(req);
                byUser.set(key, list);
            });
            return [...byUser.entries()].map(([userName, requests]) => {
                const sortedRequests = requests.slice().sort((a, b) => {
                    const p = priorityOf(a) - priorityOf(b);
                    if (p) return p;
                    return String(a.timeRange || '').localeCompare(String(b.timeRange || ''), 'ko');
                });
                return {
                    userName,
                    dept: String(sortedRequests[0]?.dept || '').trim(),
                    representative: sortedRequests[0] || null,
                    requests: sortedRequests
                };
            }).sort((a, b) => {
                const p = priorityOf(a.representative) - priorityOf(b.representative);
                if (p) return p;
                return String(a.userName || '').localeCompare(String(b.userName || ''), 'ko');
            });
        },
        getSituationBoardSeatToneClass: (req, occupant) => {
            if (!occupant) return '';
            if (!req) return 'is-working';
            const category = app.getSituationBoardRequestCategory(req);
            if (category === 'long') return 'is-long';
            if (String(req.status || '') === 'pending') return 'is-pending';
            if (category === 'annual') return 'is-annual';
            if (category === 'halfday') return 'is-halfday';
            if (category === 'timeoff_leave') return 'is-timeoff-leave';
            if (category === 'timeoff_out') return 'is-timeoff-out';
            return 'is-working';
        },
        getSituationBoardSeatStatusLabel: (req, occupant) => {
            if (!occupant) return '공석';
            if (!req) return '근무';
            return app.getRequestDisplayType(req);
        },
        syncSituationBoardSeatMapPanelHeight: () => {
            const stage = document.querySelector('#situation-board-seat-map-content .seat-map-stage');
            const panel = document.querySelector('#situation-board-seat-map-content .seat-map-side-panel');
            if (!stage || !panel) return;
            panel.style.height = `${stage.getBoundingClientRect().height}px`;
        },
        renderSituationBoardSeatMapModalContent: (dateStr) => {
            const safeDate = security.normalizeDate(dateStr, '');
            const title = safeDate ? app.fmtDate(safeDate) : '날짜 선택';
            const seats = app.getSituationBoardSeatMapSeats();
            const statusMap = app.getSituationBoardSeatStatusMap(safeDate);
            const absentGroups = app.getSituationBoardSeatDailyAbsentGroups(safeDate);
            const priorityOf = (req) => {
                if (app.isSituationBoardLongAbsence(req)) return 3;
                if (String(req.status || '') === 'pending') return 4;
                if (security.normalizeType(req.type) === '연차' || app.isSpecialLeaveRequest(req)) return 1;
                return 2;
            };
            const dailyAbsentItems = absentGroups
                .map((group) => {
                    const requestItems = group.requests.map((req) => {
                        const typeLabel = app.getRequestDisplayType(req);
                        const timeDetail = (app.isHalfDayType(req.type) || app.isTimeOffType(req.type)) && req.timeRange
                            ? `<div class="mt-1 text-xs text-gray-500">${req.timeRange}</div>`
                            : '';
                        const category = app.getSituationBoardRequestCategory(req);
                        const toneClass = category === 'long'
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : (String(req.status || '') === 'pending'
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : (category === 'annual'
                                    ? 'bg-red-50 text-red-700 border-red-100'
                                    : (category === 'halfday'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : (category === 'timeoff_leave'
                                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                            : 'bg-violet-50 text-violet-700 border-violet-200'))));
                        return `<div class="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2"><div class="min-w-0"><div class="text-xs font-semibold text-gray-700">${typeLabel}</div>${timeDetail}</div><span class="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border ${toneClass}">${typeLabel}</span></div>`;
                    }).join('');
                    return `<div class="rounded-xl border border-gray-100 bg-white px-3 py-3"><div><div class="font-bold text-gray-800">${group.userName}</div><div class="mt-1 text-xs text-gray-500">${group.dept}</div></div><div class="mt-3 space-y-2">${requestItems}</div></div>`;
                }).join('');
            const overlays = seats.map((seat) => {
                const occupant = String(seat.occupant || '').trim();
                const req = occupant ? statusMap.get(occupant) : null;
                const toneClass = app.getSituationBoardSeatToneClass(req, occupant);
                if (!toneClass) return '';
                return `<div class="seat-map-hotspot ${toneClass}" style="left:${seat.x}%; top:${seat.y}%; width:${seat.w}%; height:${seat.h}%;" title="${seat.id} / ${occupant} / ${app.getSituationBoardSeatStatusLabel(req, occupant)}"><span class="seat-map-hotspot-label">${occupant}</span></div>`;
            }).join('');
            const annotationMarkup = app.getSituationBoardSeatAnnotations().map((item) => {
                if (item.kind === 'entrance') {
                    return `<div class="seat-map-annotation seat-map-entrance is-centered" style="left:${item.x}%; top:${item.y}%"><span class="seat-map-annotation-badge">${item.label}</span></div>`;
                }
                if (item.kind === 'room-label') {
                    return `<div class="seat-map-annotation seat-map-door is-centered" style="left:${item.x}%; top:${item.y}%"><span class="seat-map-annotation-badge">${item.label}</span></div>`;
                }
                return '';
            }).join('');
            return `<div class="mb-4 pr-24"><div><h3 class="text-2xl font-black text-gray-900">${title}</h3><p class="mt-1 text-sm text-gray-500">선택 날짜 기준 전체 자리 배치도</p></div></div><div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start"><div class="seat-map-stage"><img src="${app.getSituationBoardSeatMapPdfSrc()}" alt="성주동 사무실 자리 배치도" class="seat-map-pdf"><div class="seat-map-overlay">${annotationMarkup}${overlays}</div></div><div class="space-y-4"><div class="seat-map-side-panel bg-white rounded-2xl border border-gray-200 p-4 flex flex-col overflow-hidden"><div class="flex items-center justify-between mb-3"><h4 class="font-bold text-gray-900">당일 부재 인원</h4><span class="text-xs text-gray-400">${statusMap.size}명</span></div><div class="space-y-2 situation-board-mini-scroll flex-1 min-h-0 overflow-y-auto pr-1">${dailyAbsentItems || '<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-400">당일 부재 인원이 없습니다.</div>'}</div></div></div></div>`;
        },
        openSituationBoardSeatMap: (dateStr) => {
            const safeDate = security.normalizeDate(dateStr, '');
            if (!safeDate) return;
            app.situationBoardSelectedDate = safeDate;
            app.situationBoardSeatMapDate = safeDate;
            app.updateSituationBoardSelectedDateUI();
            const detailRoot = document.getElementById('situation-board-detail-panel-root');
            if (detailRoot) {
                const data = app.buildSituationBoardMonthlyData(app.viewYear, app.viewMonth);
                const selectedEvents = data.eventMap[safeDate] || [];
                detailRoot.innerHTML = app.renderSituationBoardDetailPanel(safeDate, selectedEvents, data.longAbsences, app.getSituationBoardScaleConfig());
            }
            const contentRoot = document.getElementById('situation-board-seat-map-content');
            const modal = document.getElementById('situation-board-seat-map-modal');
            if (contentRoot) contentRoot.innerHTML = app.renderSituationBoardSeatMapModalContent(safeDate);
            if (modal) modal.classList.remove('hidden');
            requestAnimationFrame(() => app.syncSituationBoardSeatMapPanelHeight());
            setTimeout(() => app.syncSituationBoardSeatMapPanelHeight(), 80);
        },
        closeSituationBoardSeatMapModal: () => {
            const modal = document.getElementById('situation-board-seat-map-modal');
            if (modal) modal.classList.add('hidden');
        },
        getSituationBoardScaleConfig: () => {
            const scale = ['normal', 'large', 'xlarge'].includes(app.situationBoardScale) ? app.situationBoardScale : 'large';
            if (scale === 'xlarge') {
                return { cardNumberClass: 'text-4xl', cardLabelClass: 'text-sm', monthTitleClass: 'text-4xl', cellDateClass: 'text-2xl', totalClass: 'text-xl', chipClass: 'text-sm', detailTitleClass: 'text-2xl', detailTextClass: 'text-base', cellMinHeight: 132, chipLimit: 4 };
            }
            if (scale === 'normal') {
                return { cardNumberClass: 'text-3xl', cardLabelClass: 'text-xs', monthTitleClass: 'text-3xl', cellDateClass: 'text-lg', totalClass: 'text-lg', chipClass: 'text-xs', detailTitleClass: 'text-xl', detailTextClass: 'text-sm', cellMinHeight: 96, chipLimit: 4 };
            }
            return { cardNumberClass: 'text-4xl', cardLabelClass: 'text-sm', monthTitleClass: 'text-4xl', cellDateClass: 'text-xl', totalClass: 'text-xl', chipClass: 'text-sm', detailTitleClass: 'text-2xl', detailTextClass: 'text-sm', cellMinHeight: 114, chipLimit: 4 };
        },
        ensureSituationBoardSelectedDate: (year, month) => {
            const current = security.normalizeDate(app.situationBoardSelectedDate, '');
            const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
            if (current && current.startsWith(monthPrefix)) return current;
            const today = moment().startOf('day');
            if (today.year() === year && today.month() === month) return today.format('YYYY-MM-DD');
            return `${monthPrefix}01`;
        },
        getSituationBoardFilteredRequests: () => {
            const deptFilter = app.situationBoardDeptFilter;
            return (Array.isArray(appData.requests) ? appData.requests : []).filter((req) => {
                if (!req) return false;
                const status = String(req.status || '').trim();
                if (['rejected', 'cancelled'].includes(status)) return false;
                if (deptFilter === 'manual') return req.dept === '매뉴얼팀';
                if (deptFilter === 'parts') return req.dept === '파츠북팀';
                return true;
            });
        },
        getSituationBoardEventsForDate: (dateStr, requests = null) => {
            const safeDate = security.normalizeDate(dateStr, '');
            if (!safeDate) return [];
            const list = Array.isArray(requests) ? requests : app.getSituationBoardFilteredRequests();
            return list.filter((req) => {
                const start = moment(req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                const end = moment(req.endDate || req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                const target = moment(safeDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                if (!start.isValid() || !end.isValid() || !target.isValid()) return false;
                if (target.isBefore(start, 'day') || target.isAfter(end, 'day')) return false;
                return app.shouldRenderRequestOnDate(req, safeDate);
            });
        },
        isSituationBoardLongAbsence: (req) => {
            if (!req) return false;
            const start = moment(req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
            const end = moment(req.endDate || req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
            if (!start.isValid() || !end.isValid()) return false;
            const spanDays = end.diff(start, 'days') + 1;
            return (app.isSpecialLeaveRequest(req) && spanDays >= 3) || spanDays >= 10 || Number(req.hours || 0) >= 80;
        },
        buildSituationBoardMonthlyData: (year, month) => {
            const monthStart = moment({ year, month, day: 1 }).startOf('day');
            const monthEnd = monthStart.clone().endOf('month');
            const requests = app.getSituationBoardFilteredRequests();
            const eventMap = {};
            requests.forEach((req) => {
                const reqStart = moment(req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                const reqEnd = moment(req.endDate || req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                const rangeStart = moment.max(reqStart, monthStart);
                const rangeEnd = moment.min(reqEnd, monthEnd);
                if (!rangeStart.isValid() || !rangeEnd.isValid() || rangeStart.isAfter(rangeEnd, 'day')) return;
                const cursor = rangeStart.clone();
                while (cursor.isSameOrBefore(rangeEnd, 'day')) {
                    const dateStr = cursor.format('YYYY-MM-DD');
                    if (app.shouldRenderRequestOnDate(req, dateStr)) {
                        if (!eventMap[dateStr]) eventMap[dateStr] = [];
                        eventMap[dateStr].push(req);
                    }
                    cursor.add(1, 'day');
                }
            });
            Object.keys(eventMap).forEach((dateStr) => {
                eventMap[dateStr].sort((a, b) => {
                    const statusOrder = { approved: 1, cancel_requested: 2, pending: 3 };
                    const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
                    if (statusDiff !== 0) return statusDiff;
                    return String(a.userName || '').localeCompare(String(b.userName || ''), 'ko');
                });
            });
            const longAbsences = requests
                .filter((req) => app.isSituationBoardLongAbsence(req))
                .filter((req) => {
                    const start = moment(req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                    const end = moment(req.endDate || req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                    return start.isValid() && end.isValid() && !end.isBefore(monthStart, 'day') && !start.isAfter(monthEnd, 'day');
                })
                .sort((a, b) => {
                    const aStart = moment(a.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).valueOf();
                    const bStart = moment(b.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).valueOf();
                    if (aStart !== bStart) return aStart - bStart;
                    return String(a.userName || '').localeCompare(String(b.userName || ''), 'ko');
                });
            return { eventMap, longAbsences, requests };
        },
        getSituationBoardDailySummary: (events) => {
            const list = Array.isArray(events) ? events : [];
            const totalUsers = new Set(list.map((item) => String(item.userId || ''))).size;
            const approvedLike = list.filter((item) => ['approved', 'cancel_requested'].includes(String(item.status || '')));
            const pendingCount = list.filter((item) => String(item.status || '') === 'pending').length;
            const annualCount = approvedLike.filter((item) => app.getSituationBoardRequestCategory(item) === 'annual').length;
            const halfDayCount = approvedLike.filter((item) => app.getSituationBoardRequestCategory(item) === 'halfday').length;
            const timeOffLeaveCount = approvedLike.filter((item) => app.getSituationBoardRequestCategory(item) === 'timeoff_leave').length;
            const timeOffOutCount = approvedLike.filter((item) => app.getSituationBoardRequestCategory(item) === 'timeoff_out').length;
            const longCount = approvedLike.filter((item) => app.isSituationBoardLongAbsence(item)).length;
            const specialCount = approvedLike.filter((item) => app.isSpecialLeaveRequest(item) && !app.isSituationBoardLongAbsence(item)).length;
            return { totalUsers, annualCount, halfDayCount, timeOffLeaveCount, timeOffOutCount, longCount, specialCount, pendingCount };
        },
        getSituationBoardLongAbsenceTone: (req) => {
            const today = moment().startOf('day');
            const start = moment(req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
            const end = moment(req.endDate || req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
            if (String(req.status || '') === 'pending' || start.isAfter(today, 'day')) {
                return { badge: '예정', barClass: 'bg-sky-100 border border-sky-200 text-sky-800', badgeClass: 'bg-sky-500 text-white' };
            }
            if (end.isValid() && end.diff(today, 'days') >= 0 && end.diff(today, 'days') <= 7) {
                return { badge: '복귀임박', barClass: 'bg-emerald-100 border border-emerald-200 text-emerald-800', badgeClass: 'bg-emerald-500 text-white' };
            }
            return { badge: '진행중', barClass: 'bg-indigo-100 border border-indigo-200 text-indigo-900', badgeClass: 'bg-indigo-600 text-white' };
        },
        renderSituationBoardLongAbsences: (longAbsences, scale) => {
            if (!longAbsences.length) {
                return `<div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-400">장기 부재 항목이 없습니다.</div>`;
            }
            return `<div class="space-y-2 situation-board-mini-scroll overflow-y-auto max-h-[180px]">${longAbsences.map((req) => {
                const tone = app.getSituationBoardLongAbsenceTone(req);
                const displayType = app.getRequestDisplayType(req);
                return `<div class="rounded-2xl px-4 py-3 ${tone.barClass}"><div class="flex items-center justify-between gap-3"><div class="min-w-0"><div class="font-bold truncate">${req.userName} <span class="font-medium opacity-80">/ ${req.dept}</span></div><div class="text-xs mt-1 truncate">${displayType} · ${security.normalizeDate(req.startDate, '-')}${security.normalizeDate(req.endDate, req.startDate) !== security.normalizeDate(req.startDate, '-') ? ` ~ ${security.normalizeDate(req.endDate, req.startDate)}` : ''}</div></div><span class="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${tone.badgeClass}">${tone.badge}</span></div></div>`;
            }).join('')}</div>`;
        },
        renderSituationBoardDetailPanel: (dateStr, events, longAbsences, scale) => {
            const safeDate = security.normalizeDate(dateStr, '');
            const title = safeDate ? app.fmtDate(safeDate) : '날짜 선택';
            const dayLongAbsences = longAbsences.filter((req) => {
                const start = moment(req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                const end = moment(req.endDate || req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                const target = moment(safeDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                return target.isValid() && start.isValid() && end.isValid() && target.isSameOrAfter(start, 'day') && target.isSameOrBefore(end, 'day');
            });
            const summary = app.getSituationBoardDailySummary(events);
            const itemsHtml = (Array.isArray(events) ? events : []).map((req) => {
                const displayType = app.getRequestDisplayType(req);
                const statusBadge = req.status === 'pending'
                    ? '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">대기</span>'
                    : '<span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">확정</span>';
                const detailText = (app.isHalfDayType(req.type) || app.isTimeOffType(req.type)) && req.timeRange
                    ? `${displayType} · ${req.timeRange} · ${req.dept}`
                    : `${displayType} · ${req.dept}`;
                return `<div class="rounded-xl border border-gray-100 bg-white px-3 py-3"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-bold text-gray-800 truncate">${req.userName}</div><div class="text-xs text-gray-500 mt-1">${detailText}</div></div>${statusBadge}</div></div>`;
            }).join('');
            const longHtml = dayLongAbsences.map((req) => {
                const tone = app.getSituationBoardLongAbsenceTone(req);
                return `<div class="rounded-xl px-3 py-3 ${tone.barClass}"><div class="flex items-center justify-between gap-3"><div class="min-w-0"><div class="font-bold truncate">${req.userName}</div><div class="text-xs mt-1">${security.normalizeDate(req.startDate, '-')}${security.normalizeDate(req.endDate, req.startDate) !== security.normalizeDate(req.startDate, '-') ? ` ~ ${security.normalizeDate(req.endDate, req.startDate)}` : ''}</div></div><span class="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${tone.badgeClass}">${tone.badge}</span></div></div>`;
            }).join('');
            const longSummaryTone = summary.longCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500';
            return `<div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 h-full"><div class="flex items-start justify-between gap-3 mb-4"><div><h3 class="${scale.detailTitleClass} font-bold text-gray-900">${title}</h3><p class="mt-1 text-sm text-gray-500">이 날짜의 전체 상황 요약</p></div><div class="shrink-0 text-right"><div class="text-xs text-gray-400">부재</div><div class="text-3xl font-black text-indigo-700">${summary.totalUsers}</div></div></div><div class="grid grid-cols-2 gap-2 mb-4 text-xs"><div class="rounded-xl bg-red-50 px-3 py-2 text-red-700 font-bold">연차 ${summary.annualCount}</div><div class="rounded-xl bg-amber-50 px-3 py-2 text-amber-700 font-bold">반차 ${summary.halfDayCount}</div><div class="rounded-xl bg-cyan-50 px-3 py-2 text-cyan-700 font-bold">시간차(퇴근) ${summary.timeOffLeaveCount}</div><div class="rounded-xl bg-violet-50 px-3 py-2 text-violet-700 font-bold">시간차(외출) ${summary.timeOffOutCount}</div><div class="rounded-xl px-3 py-2 font-bold ${longSummaryTone}">장기부재 ${summary.longCount}</div><div class="rounded-xl bg-slate-100 px-3 py-2 text-slate-700 font-bold">대기 ${summary.pendingCount}</div></div><div class="space-y-4 situation-board-mini-scroll overflow-y-auto max-h-[calc(100vh-280px)]"><div><div class="flex items-center justify-between mb-2"><h4 class="font-bold text-gray-800">장기 부재</h4><span class="text-xs text-gray-400">${dayLongAbsences.length}건</span></div>${longHtml || '<div class="text-sm text-gray-400 rounded-xl border border-dashed border-gray-200 px-3 py-4">장기 부재 없음</div>'}</div><div><div class="flex items-center justify-between mb-2"><h4 class="font-bold text-gray-800">일반 부재</h4><span class="text-xs text-gray-400">${events.length}건</span></div><div class="space-y-2">${itemsHtml || '<div class="text-sm text-gray-400 rounded-xl border border-dashed border-gray-200 px-3 py-4">부재 없음</div>'}</div></div></div></div>`;
        },
        renderSituationBoard: () => {
            if (!app.currentUser) return app.renderLogin();
            if (!app.canAccessSituationBoard()) return app.backToDashboard();
            app.currentView = 'situation-board';
            const scale = app.getSituationBoardScaleConfig();
            const year = app.viewYear;
            const month = app.viewMonth;
            const today = moment().startOf('day');
            const filteredRequests = app.getSituationBoardFilteredRequests();
            const data = app.buildSituationBoardMonthlyData(year, month);
            const selectedDate = app.ensureSituationBoardSelectedDate(year, month);
            app.situationBoardSelectedDate = selectedDate;
            const selectedEvents = data.eventMap[selectedDate] || [];
            const todayEvents = app.getSituationBoardEventsForDate(today.format('YYYY-MM-DD'), filteredRequests);
            const todaySummary = app.getSituationBoardDailySummary(todayEvents);
            const monthStart = moment({ year, month, day: 1 }).startOf('day');
            const monthEnd = monthStart.clone().endOf('month');
            const pendingMonthCount = filteredRequests.filter((req) => {
                if (String(req.status || '') !== 'pending') return false;
                const start = moment(req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                const end = moment(req.endDate || req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                return start.isValid() && end.isValid() && !end.isBefore(monthStart, 'day') && !start.isAfter(monthEnd, 'day');
            }).length;
            const globalLongAbsences = filteredRequests.filter((req) => app.isSituationBoardLongAbsence(req));
            const activeLongCount = globalLongAbsences.filter((req) => {
                const start = moment(req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                const end = moment(req.endDate || req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                return today.isSameOrAfter(start, 'day') && today.isSameOrBefore(end, 'day');
            }).length;
            const weekEnd = today.clone().endOf('week');
            const returnSoonCount = globalLongAbsences.filter((req) => {
                const end = moment(req.endDate || req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                return end.isValid() && end.isSameOrAfter(today, 'day') && end.isSameOrBefore(weekEnd, 'day');
            }).length;
            const bottomSummaryCards = [
                { label: '오늘 부재', value: todaySummary.totalUsers, tone: 'bg-indigo-50 text-indigo-700' },
                { label: '승인 대기', value: pendingMonthCount, tone: 'bg-amber-50 text-amber-700' }
            ];
            const returnSoonList = globalLongAbsences.filter((req) => {
                const end = moment(req.endDate || req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                return end.isValid() && end.isSameOrAfter(today, 'day') && end.isSameOrBefore(weekEnd, 'day');
            });
            const firstDayIdx = new Date(year, month, 1).getDay();
            const lastDate = new Date(year, month + 1, 0).getDate();
            const weekRows = Math.ceil((firstDayIdx + lastDate) / 7);
            let cellsHtml = '';
            for (let i = 0; i < firstDayIdx; i++) {
                cellsHtml += `<div class="situation-board-cell is-outside" style="min-height:${scale.cellMinHeight}px"></div>`;
            }
            for (let d = 1; d <= lastDate; d++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayEvents = data.eventMap[dateStr] || [];
                const summary = app.getSituationBoardDailySummary(dayEvents);
                const isToday = today.isSame(moment(dateStr), 'day');
                const isSelected = selectedDate === dateStr;
                const isRed = holidayLogic.isRedDay(dateStr);
                const isSat = holidayLogic.isSat(dateStr);
                const holName = holidayLogic.getHolName(dateStr);
                const dateColorClass = isToday
                    ? 'text-indigo-700'
                    : (isRed ? 'holiday-text' : (isSat ? 'sat-text' : 'text-gray-800'));
                const chips = [
                    summary.annualCount > 0 ? { label: `연차 ${summary.annualCount}`, cls: 'bg-red-50 text-red-700' } : null,
                    summary.halfDayCount > 0 ? { label: `반차 ${summary.halfDayCount}`, cls: 'bg-amber-50 text-amber-700' } : null,
                    summary.timeOffLeaveCount > 0 ? { label: `시간차(퇴근) ${summary.timeOffLeaveCount}`, cls: 'bg-cyan-50 text-cyan-700' } : null,
                    summary.timeOffOutCount > 0 ? { label: `시간차(외출) ${summary.timeOffOutCount}`, cls: 'bg-violet-50 text-violet-700' } : null,
                    summary.longCount > 0 ? { label: `휴직 ${summary.longCount}`, cls: 'bg-emerald-50 text-emerald-700' } : null,
                    summary.pendingCount > 0 ? { label: `대기 ${summary.pendingCount}`, cls: 'bg-slate-100 text-slate-700' } : null
                ].filter(Boolean).slice(0, scale.chipLimit);
                cellsHtml += `<div class="situation-board-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" data-situation-date="${dateStr}" style="min-height:${scale.cellMinHeight}px" onclick="app.openSituationBoardSeatMap('${dateStr}')"><div class="flex items-start justify-between gap-2"><div class="flex items-start gap-2 min-w-0"><span class="${scale.cellDateClass} font-black ${dateColorClass}">${d}</span>${holName ? `<span class="mt-1 text-[10px] text-white bg-red-400 px-1.5 py-0.5 rounded truncate max-w-[78px]">${holName}</span>` : ''}</div>${summary.totalUsers > 0 ? `<span class="${scale.totalClass} font-black text-gray-800">${summary.totalUsers}</span>` : ''}</div><div class="mt-2 grid grid-cols-2 gap-1.5">${chips.map((chip) => `<div class="px-2 py-1 rounded-full font-bold leading-tight ${chip.cls} ${scale.chipClass}">${chip.label}</div>`).join('') || `<div class="text-gray-300 ${scale.chipClass} font-medium col-span-2">-</div>`}</div></div>`;
            }
            const usedCells = firstDayIdx + lastDate;
            const trailingCells = (7 - (usedCells % 7)) % 7;
            for (let i = 0; i < trailingCells; i++) {
                cellsHtml += `<div class="situation-board-cell is-outside" style="min-height:${scale.cellMinHeight}px"></div>`;
            }
            const boardActionBtn = `<button onclick="app.backToDashboard()" class="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50">대시보드로</button>`;
            const scaleButtons = [
                ['normal', '표준'],
                ['large', '크게'],
                ['xlarge', '아주 크게']
            ].map(([value, label]) => `<button onclick="app.setSituationBoardScale('${value}')" class="px-4 py-2 rounded-xl text-sm font-bold border ${app.situationBoardScale === value ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}">${label}</button>`).join('');
            const deptButtons = [
                ['all', '전체'],
                ['manual', '매뉴얼팀'],
                ['parts', '파츠북팀']
            ].map(([value, label]) => `<button onclick="app.setSituationBoardDeptFilter('${value}')" class="px-4 py-2 rounded-xl text-sm font-bold border ${app.situationBoardDeptFilter === value ? 'bg-slate-800 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}">${label}</button>`).join('');
            const hasLongAbsenceSignal = activeLongCount > 0 || returnSoonCount > 0;
            const infoButtonClass = hasLongAbsenceSignal
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100';
            const infoButton = `<button onclick="app.openSituationBoardInfoModal()" class="px-4 py-2.5 rounded-xl border font-bold ${infoButtonClass}">장기부재 ${activeLongCount} · 이번주 복귀 ${returnSoonCount}</button>`;
            const infoModal = `<div id="situation-board-info-modal" class="fixed inset-0 z-[90] hidden bg-black/40 backdrop-blur-sm p-4" onclick="if(event.target===this) app.closeSituationBoardInfoModal()"><div class="w-full max-w-4xl max-h-[calc(100vh-40px)] overflow-y-auto mx-auto bg-white rounded-2xl border border-gray-200 shadow-2xl"><div class="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-start justify-between gap-4"><div><h3 class="text-2xl font-black text-gray-900">장기 부재 현황</h3><p class="mt-1 text-sm text-gray-500">장기 부재와 이번주 복귀 예정 목록</p></div><button type="button" class="text-gray-400 hover:text-gray-700 text-2xl leading-none" onclick="app.closeSituationBoardInfoModal()">×</button></div><div class="px-6 py-5 space-y-6"><div><div class="flex items-center justify-between mb-3"><h4 class="text-lg font-bold text-gray-900">장기 부재</h4><span class="text-sm text-gray-400">${data.longAbsences.length}건</span></div>${app.renderSituationBoardLongAbsences(data.longAbsences, scale)}</div><div><div class="flex items-center justify-between mb-3"><h4 class="text-lg font-bold text-gray-900">이번주 복귀</h4><span class="text-sm text-gray-400">${returnSoonList.length}건</span></div><div class="space-y-2">${returnSoonList.map((req) => { const tone = app.getSituationBoardLongAbsenceTone(req); return `<div class="rounded-2xl px-4 py-3 ${tone.barClass}"><div class="flex items-center justify-between gap-3"><div class="min-w-0"><div class="font-bold truncate">${req.userName} <span class="font-medium opacity-80">/ ${req.dept}</span></div><div class="text-xs mt-1 truncate">${security.normalizeDate(req.startDate, '-')}${security.normalizeDate(req.endDate, req.startDate) !== security.normalizeDate(req.startDate, '-') ? ` ~ ${security.normalizeDate(req.endDate, req.startDate)}` : ''}</div></div><span class="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${tone.badgeClass}">${tone.badge}</span></div></div>`; }).join('') || '<div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-400">이번주 복귀 예정이 없습니다.</div>'}</div></div></div></div></div>`;
            const seatMapModal = `<div id="situation-board-seat-map-modal" class="fixed inset-0 z-[120] hidden bg-black/45 backdrop-blur-sm px-4 pt-24 pb-4 overflow-y-auto flex items-start justify-center" onclick="if(event.target===this) app.closeSituationBoardSeatMapModal()"><div class="relative w-full max-w-[1400px] rounded-2xl bg-white border border-gray-200 shadow-2xl p-5 pt-6"><button type="button" class="absolute right-5 top-5 z-10 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-50" onclick="app.closeSituationBoardSeatMapModal()">닫기</button><div id="situation-board-seat-map-content">${app.renderSituationBoardSeatMapModalContent(selectedDate)}</div></div></div>`;
            document.getElementById('app-container').innerHTML = `<div class="situation-board-page fade-in"><div class="situation-board-shell"><div class="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4"><div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4"><div><div class="flex items-center gap-3 flex-wrap"><h2 class="${scale.monthTitleClass} font-black text-gray-900">전체 상황판</h2><span class="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold">대표 / 마스터</span></div><p class="mt-2 text-sm text-gray-500">브라우저 전체영역을 사용하는 큰 글씨 달력 요약 화면</p></div><div class="flex flex-wrap items-center gap-2">${deptButtons}${infoButton}<div class="w-px h-8 bg-gray-200 mx-1 hidden md:block"></div>${scaleButtons}${boardActionBtn}</div></div></div><div class="situation-board-content"><div class="situation-board-main flex flex-col gap-4 min-h-0"><div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col flex-1 min-h-0"><div class="mb-3 flex items-center justify-between gap-3"><div><h3 class="text-lg font-bold text-gray-900">월간 요약 달력</h3><p class="text-xs text-gray-500">날짜를 클릭하면 해당 날짜의 전체 배치도가 열립니다.</p></div><div class="flex items-center gap-2"><button onclick="app.changeMonth(-1)" class="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"><i class="fa-solid fa-chevron-left"></i></button><div class="text-xl font-black text-gray-900 min-w-[170px] text-center">${year}년 ${month + 1}월</div><button onclick="app.changeMonth(1)" class="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"><i class="fa-solid fa-chevron-right"></i></button></div></div><div class="mb-3 text-xs text-gray-400">선택 날짜: ${selectedDate ? app.fmtDate(selectedDate) : '-'}</div><div class="situation-board-calendar-wrap"><div class="situation-board-grid" style="grid-template-rows:auto repeat(${weekRows}, minmax(0, 1fr));"><div class="situation-board-header-cell holiday-text">일</div><div class="situation-board-header-cell">월</div><div class="situation-board-header-cell">화</div><div class="situation-board-header-cell">수</div><div class="situation-board-header-cell">목</div><div class="situation-board-header-cell">금</div><div class="situation-board-header-cell sat-text">토</div>${cellsHtml}</div></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-3">${bottomSummaryCards.map((card) => `<div class="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4"><div class="${card.tone} inline-flex px-2.5 py-1 rounded-full ${scale.cardLabelClass} font-bold">${card.label}</div><div class="mt-3 ${scale.cardNumberClass} font-black text-gray-900">${card.value}</div></div>`).join('')}</div></div><div class="situation-board-panel"><div id="situation-board-detail-panel-root">${app.renderSituationBoardDetailPanel(selectedDate, selectedEvents, data.longAbsences, scale)}</div></div></div></div>${infoModal}${seatMapModal}${app.getModal()}`;
        },
        renderCalendarListView: (calendarData, viewer, year, month) => {
            const today = moment().startOf('day');
            const lastDate = new Date(year, month + 1, 0).getDate();
            const items = [];

            for (let d = 1; d <= lastDate; d++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayEvents = calendarData.eventMap[dateStr] || [];
                const isToday = moment(dateStr).isSame(today, 'day');
                if (!dayEvents.length && !isToday) continue;

                const chips = dayEvents.map((req) => {
                    const displayType = app.getRequestDisplayType(req);
                    const badgeClass = req.status === 'rejected'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : String(app.getRequestBadgeClass(req) || '').replace('justify-center', '').trim();
                    return `<div class="rounded-lg px-2.5 py-2 border ${badgeClass}">
                        <div class="font-bold text-[11px]">${req.userName}</div>
                        <div class="text-[11px] mt-0.5">${displayType}</div>
                    </div>`;
                }).join('');

                items.push(`<div class="px-4 py-3 border-b last:border-b-0 ${isToday ? 'bg-indigo-50/50' : 'bg-white'}">
                    <div class="flex items-center justify-between gap-3 mb-2">
                        <div class="font-bold text-sm ${isToday ? 'text-indigo-700' : 'text-gray-800'}">${app.fmtDate(dateStr)}</div>
                        ${isToday ? '<span class="text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded-full">오늘</span>' : ''}
                    </div>
                    ${dayEvents.length ? `<div class="grid grid-cols-1 gap-2">${chips}</div>` : `<div class="text-xs text-gray-400">일정 없음</div>`}
                </div>`);
            }

            return `<div class="border-t border-gray-200">${items.length ? items.join('') : '<div class="p-6 text-center text-sm text-gray-400">이번 달 일정이 없습니다.</div>'}</div>`;
        },
        getAccessibleCalendarRequests: (validRequests, viewer) => {
            const p = app.getCurrentPermissions();
            if ((app.currentUser && app.currentUser.role === 'master') || p.calendarAll) {
                return validRequests.slice();
            }
            const collected = [];
            const seenIds = new Set();
            const pushIfNew = (req) => {
                const safeId = String((req && req.id) || '');
                if (safeId && seenIds.has(safeId)) return;
                if (safeId) seenIds.add(safeId);
                collected.push(req);
            };
            if (p.calendarSelf) {
                validRequests.filter(r => String(r.userId) === String(viewer.id)).forEach(pushIfNew);
            }
            if (p.calendarManual) {
                validRequests.filter(r => r.dept === '매뉴얼팀').forEach(pushIfNew);
            }
            if (p.calendarParts) {
                validRequests.filter(r => r.dept === '파츠북팀').forEach(pushIfNew);
            }
            return collected;
        },
        getCalendarRequests: (validRequests, viewer) => {
            app.ensureCalendarMode();
            if (app.calendarMode === 'rejected') {
                return app.getAccessibleCalendarRequests(validRequests, viewer).filter(r => r.status === 'rejected' && !app.isWorkReportRequest(r));
            }
            if (app.calendarMode === 'workreport') {
                return app.getAccessibleCalendarRequests(validRequests, viewer).filter(r => app.isWorkReportRequest(r) && r.status === 'reported');
            }
            if (app.calendarMode === 'all') {
                return validRequests.filter(r => !app.isWorkReportRequest(r) && ['approved', 'cancel_requested'].includes(r.status));
            }
            if (app.calendarMode === 'manual') {
                return validRequests.filter(r => r.dept === '매뉴얼팀' && !app.isWorkReportRequest(r) && ['approved', 'cancel_requested'].includes(r.status));
            }
            if (app.calendarMode === 'parts') {
                return validRequests.filter(r => r.dept === '파츠북팀' && !app.isWorkReportRequest(r) && ['approved', 'cancel_requested'].includes(r.status));
            }
            return validRequests.filter((r) => {
                if (String(r.userId) !== String(viewer.id)) return false;
                if (app.isWorkReportRequest(r)) return r.status === 'reported';
                return ['approved', 'cancel_requested'].includes(r.status);
            });
        },
        canApproveRequest: (req) => {
            if (!req || !app.currentUser) return false;
            const isSelfRequest = String(req.userId) === String(app.currentUser.id);
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
                .filter((req) => String(req.userId) === String(safeTarget.id))
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
                .filter((req) => String(req.userId) === String(targetUser.id))
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
        buildCalendarCacheKey: (viewer, year = app.viewYear, month = app.viewMonth) => {
            const viewerId = security.cleanInlineValue(viewer && viewer.id);
            const requestVersion = Number(appData.meta.requestDataVersion || 0);
            return [viewerId, year, month, app.calendarMode, requestVersion].join('::');
        },
        buildMonthlyCalendarData: (requests, viewer, year = app.viewYear, month = app.viewMonth) => {
            const safeViewer = viewer || app.currentUser || {};
            const cacheKey = app.buildCalendarCacheKey(safeViewer, year, month);
            if (app.calendarRenderCache && app.calendarRenderCache.key === cacheKey) {
                return app.calendarRenderCache;
            }

            const validRequests = requests.filter((r) => r.status !== 'cancelled');
            const viewReqs = app.getCalendarRequests(validRequests, safeViewer);
            const monthStart = moment({ year, month, day: 1 }).startOf('day');
            const monthEnd = monthStart.clone().endOf('month');
            const eventMap = {};

            viewReqs.forEach((req) => {
                const reqStart = moment(req.startDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                const reqEnd = moment(req.endDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
                const rangeStart = moment.max(reqStart, monthStart);
                const rangeEnd = moment.min(reqEnd, monthEnd);

                if (!rangeStart.isValid() || !rangeEnd.isValid() || rangeStart.isAfter(rangeEnd, 'day')) return;

                const cursor = rangeStart.clone();
                while (cursor.isSameOrBefore(rangeEnd, 'day')) {
                    const dateStr = cursor.format('YYYY-MM-DD');
                    if (app.shouldRenderRequestOnDate(req, dateStr)) {
                        if (!eventMap[dateStr]) eventMap[dateStr] = [];
                        eventMap[dateStr].push(req);
                    }
                    cursor.add(1, 'day');
                }
            });

            Object.keys(eventMap).forEach((dateStr) => {
                eventMap[dateStr].sort((a, b) => {
                    const pA = app.getRequestTypePriority(a);
                    const pB = app.getRequestTypePriority(b);
                    if (pA !== pB) return pA - pB;
                    return String(a.userName || '').localeCompare(String(b.userName || ''), 'ko');
                });
            });

            app.calendarRenderCache = {
                key: cacheKey,
                viewerId: security.cleanInlineValue(safeViewer.id),
                year,
                month,
                mode: app.calendarMode,
                eventMap
            };
            return app.calendarRenderCache;
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
            const usersById = new Map(appData.users.map((user) => [String(user.id), user]));
            appData.users.forEach(u => { u.usedHours = 0; u.pendingHours = 0; });
            appData.requests.forEach(r => {
                const u = usersById.get(String(r.userId));
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

        changeMonth: (offset) => {
            app.viewMonth += offset;
            if(app.viewMonth > 11) { app.viewMonth = 0; app.viewYear++; }
            else if(app.viewMonth < 0) { app.viewMonth = 11; app.viewYear--; }
            app.calendarRenderCache = null;
            app.refreshDashboard();
        },

        togglePastShading: () => { app.showPastShading = !app.showPastShading; app.refreshDashboard(); },
        updateSelectedCalendarDateUI: () => {
            document.querySelectorAll('.calendar-cell[data-cal-date]').forEach((cell) => {
                cell.classList.toggle('calendar-cell-selected', cell.dataset.calDate === app.selectedCalendarDate);
            });
        },
        getCalendarDayEvents: (dateStr, viewer = app.currentUser) => {
            if (!viewer) return [];
            const safeDate = security.normalizeDate(dateStr, '');
            if (!safeDate) return [];
            const calendarData = app.buildMonthlyCalendarData(appData.requests, viewer, app.viewYear, app.viewMonth);
            return (calendarData.eventMap[safeDate] || []).slice().sort((a, b) => {
                const pA = app.getRequestTypePriority(a);
                const pB = app.getRequestTypePriority(b);
                if (pA !== pB) return pA - pB;
                return String(a.userName || '').localeCompare(String(b.userName || ''), 'ko');
            });
        },
        renderMobileCalendarDaySummary: (events) => {
            const count = Array.isArray(events) ? events.length : 0;
            if (count <= 0) return '';
            return `<div class="mt-2 flex items-center justify-center"><span class="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">${count}건</span></div>`;
        },
        renderMobileCalendarDayDetailContent: (dateStr) => {
            const safeDate = security.normalizeDate(dateStr, '');
            if (!safeDate || !app.currentUser) {
                return `<div class="p-5 text-sm text-gray-400">날짜를 확인할 수 없습니다.</div>`;
            }
            const daysEvents = app.getCalendarDayEvents(safeDate, app.currentUser);
            const dateLabel = moment(safeDate).format('YYYY년 M월 D일 ddd');
            if (daysEvents.length === 0) {
                return `<div class="p-5"><div class="text-lg font-bold text-gray-900">${dateLabel}</div><div class="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-400 text-center">해당 날짜의 상세 내역이 없습니다.</div></div>`;
            }
            return `<div class="p-5">
                <div class="text-lg font-bold text-gray-900">${dateLabel}</div>
                <div class="mt-4 space-y-3">
                    ${daysEvents.map((e) => {
                        const displayType = app.getRequestDisplayType(e);
                        const timeText = e.timeRange ? `<div class="text-xs text-gray-500 mt-1">${e.timeRange}</div>` : '';
                        const detailReason = e.detailReason ? `<div class="text-xs text-amber-600 mt-1">상세사유: ${security.cleanText(e.detailReason)}</div>` : '';
                        const rejectReason = e.status === 'rejected' && e.rejectReason ? `<div class="text-xs text-red-600 mt-1">반려사유: ${security.cleanText(e.rejectReason)}</div>` : '';
                        return `<div class="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <div class="font-bold text-gray-900">${e.userName}</div>
                                    <div class="text-xs text-gray-500 mt-1">${displayType} · ${security.cleanText(e.reason || '-')}</div>
                                    ${timeText}
                                    ${detailReason}
                                    ${rejectReason}
                                </div>
                                <span class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${app.getRequestStatusClasses(e.status)}">${app.getRequestStatusText(e.status)}</span>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        },
        openMobileCalendarDayDetail: (dateStr) => {
            const safeDate = security.normalizeDate(dateStr, '');
            if (!safeDate) return;
            app.selectedCalendarDate = safeDate;
            app.mobileCalendarDetailDate = safeDate;
            app.updateSelectedCalendarDateUI();
            const body = document.getElementById('mobile-calendar-detail-body');
            if (body) body.innerHTML = app.renderMobileCalendarDayDetailContent(safeDate);
            document.body.style.overflow = 'hidden';
            document.getElementById('mobile-calendar-detail-modal')?.classList.remove('hidden');
        },
        closeMobileCalendarDayDetail: () => {
            app.mobileCalendarDetailDate = '';
            document.body.style.overflow = '';
            document.getElementById('mobile-calendar-detail-modal')?.classList.add('hidden');
        },
        toggleMobileRecentRequestsOpen: () => {
            app.mobileRecentRequestsOpen = !app.mobileRecentRequestsOpen;
            app.refreshDashboard();
        },
        canUseCalendarClickRequest: () => {
            if (!app.currentUser) return false;
            return security.normalizeRole(String(app.currentUser.role || '')) !== 'ceo';
        },
        canSelectCalendarDate: (dateStr) => {
            if (!app.canUseCalendarClickRequest()) return false;
            const safeDate = security.normalizeDate(dateStr);
            if (!safeDate) return false;
            const today = moment().startOf('day');
            const target = moment(safeDate, 'YYYY-MM-DD');
            if (!target.isValid() || target.isBefore(today, 'day')) return false;
            return !holidayLogic.isRedDay(safeDate) && !holidayLogic.isSat(safeDate);
        },
        setSelectedCalendarDate: (dateStr) => {
            const safeDate = security.normalizeDate(dateStr);
            if (!safeDate) return;
            if (!app.canSelectCalendarDate(safeDate)) return;
            app.selectedCalendarDate = safeDate;
            app.updateSelectedCalendarDateUI();
        },
        canOpenCalendarRequestOnDate: (dateStr) => {
            const safeDate = security.normalizeDate(dateStr);
            if (!safeDate) return { ok: false, message: '날짜를 확인할 수 없습니다.' };

            const today = moment().startOf('day');
            const target = moment(safeDate, 'YYYY-MM-DD');
            if (!target.isValid()) return { ok: false, message: '날짜를 확인할 수 없습니다.' };

            if (target.isBefore(today, 'day')) {
                return {
                    ok: false,
                    message: '지난 날짜는 달력 더블클릭으로 신청할 수 없습니다.\n연차 신청창에서 [지난 날짜 선택]을 사용해주세요.'
                };
            }

            if (holidayLogic.isRedDay(safeDate) || holidayLogic.isSat(safeDate)) {
                return {
                    ok: false,
                    message: '주말/공휴일은 달력 더블클릭으로 신청할 수 없습니다.'
                };
            }

            return { ok: true, dateStr: safeDate };
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
                if (String(req.userId) !== String(requestUser.id)) return false;
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
        handleCalendarDateDoubleClick: (dateStr) => {
            if (!app.canUseCalendarClickRequest()) return;
            const result = app.canOpenCalendarRequestOnDate(dateStr);
            if (!result.ok) {
                alert(result.message);
                return;
            }
            app.openRequestModal(result.dateStr);
        },
        openRequestModal: (presetDate = '', options = {}) => {
            const modal = document.getElementById('req-modal');
            if (!modal) return;
            app.initModal(presetDate, options);
            modal.classList.remove('hidden');
        },
        openWorkReportApplyBoard: () => {
            app.reportBoardMode = 'apply';
            app.reportBoardYear = app.viewYear;
            app.reportBoardMonth = app.viewMonth;
            app.reportDetailRequestId = '';
            app.reportDetailUserId = '';
            const modal = document.getElementById('report-board-modal');
            if (!modal) return;
            app.renderReportBoardModal();
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        },
        openWorkReportOverviewBoard: () => {
            if (!app.canAccessAnyWorkReportView()) {
                alert('잔업/특근 현황 권한이 없습니다.');
                return;
            }
            app.reportBoardMode = 'overview';
            app.reportBoardYear = app.viewYear;
            app.reportBoardMonth = app.viewMonth;
            app.reportDetailRequestId = '';
            app.reportDetailUserId = '';
            const modal = document.getElementById('report-board-modal');
            if (!modal) return;
            app.renderReportBoardModal();
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        },
        openReportBoard: () => app.openWorkReportApplyBoard(),
        closeReportBoard: () => {
            const modal = document.getElementById('report-board-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        },
        canEditWorkReportRequest: (req, year = app.reportBoardYear, month = app.reportBoardMonth) => {
            if (!req || !app.currentUser) return false;
            if (!app.isWorkReportRequest(req)) return false;
            if (String(req.userId) !== String(app.currentUser.id)) return false;
            return !app.isReportSettlementSubmitted(req, year, month);
        },
        openWorkReportModal: (presetType = '', options = {}) => {
            const modal = document.getElementById('work-report-modal');
            if (!modal) return;
            app.initWorkReportModal(presetType, options);
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        },
        closeWorkReportModal: () => {
            const modal = document.getElementById('work-report-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            app.workReportEditingId = '';
        },
        changeReportBoardMonth: (delta) => {
            const next = moment({ year: app.reportBoardYear, month: app.reportBoardMonth, date: 1 }).add(Number(delta || 0), 'month');
            app.reportBoardYear = next.year();
            app.reportBoardMonth = next.month();
            app.renderReportBoardModal();
        },
        getDefaultWorkReportType: () => {
            const available = app.getAvailableWorkReportTypes();
            if (available.includes('잔업')) return '잔업';
            if (available.includes('특근')) return '특근';
            return '잔업';
        },
        getWorkReportTypeOptionsHtml: (selectedValue = '') => {
            const available = app.getAvailableWorkReportTypes();
            const safeSelected = available.includes(selectedValue) ? selectedValue : (available[0] || '잔업');
            return available.map((type) => `<option value="${type}" ${type === safeSelected ? 'selected' : ''}>${type}</option>`).join('');
        },
        updateWorkReportPreview: () => {
            const preview = document.getElementById('work-report-preview');
            const typeEl = document.getElementById('work-report-type');
            const dateEl = document.getElementById('work-report-date');
            const startEl = document.getElementById('work-report-start-time');
            const durationEl = document.getElementById('work-report-duration');
            if (!preview || !typeEl || !dateEl || !startEl || !durationEl) return;
            const type = security.normalizeType(typeEl.value || app.getDefaultWorkReportType());
            const dateStr = security.normalizeDate(dateEl.value, '');
            if (type === '특근') {
                preview.innerText = '특근은 하루 기준으로 기록됩니다.';
                preview.style.color = '#be123c';
                return;
            }
            let startHour = parseInt(startEl.value, 10);
            const duration = parseInt(durationEl.value, 10);
            if (type === '잔업') {
                startHour = Number(app.getTimeoffEndHourForDate(app.currentUser, dateStr || moment().format('YYYY-MM-DD')));
                if (Number.isFinite(startHour)) startEl.value = String(startHour);
            }
            if (!Number.isFinite(startHour) || !Number.isFinite(duration)) {
                preview.innerText = '';
                return;
            }
            const endHour = startHour + duration;
            if (endHour > 24) {
                preview.innerText = '* 종료 시간이 24:00을 넘지 않게 설정해주세요.';
                preview.style.color = '#dc2626';
                return;
            }
            preview.innerText = `${type} 시간: ${formatHour(startHour)} ~ ${formatHour(endHour)} (${duration}시간)`;
            preview.style.color = type === '특근' ? '#be123c' : '#334155';
        },
        syncWorkReportTypeDefaults: () => {
            const typeEl = document.getElementById('work-report-type');
            const dateEl = document.getElementById('work-report-date');
            const statusEl = document.getElementById('work-report-date-status');
            const startEl = document.getElementById('work-report-start-time');
            const durationEl = document.getElementById('work-report-duration');
            const deptEl = document.getElementById('work-report-dept');
            const timeFieldsEl = document.getElementById('work-report-time-fields');
            if (!typeEl) return;
            const type = security.normalizeType(typeEl.value || app.getDefaultWorkReportType());
            const dateStr = security.normalizeDate(dateEl?.value, moment().format('YYYY-MM-DD'));
            if (type === '잔업') {
                if (timeFieldsEl) timeFieldsEl.classList.remove('hidden');
                const endHour = Number(app.getTimeoffEndHourForDate(app.currentUser, dateStr));
                if (startEl && Number.isFinite(endHour)) {
                    startEl.value = String(endHour);
                    startEl.disabled = true;
                    startEl.classList.add('bg-gray-100', 'text-gray-500');
                }
                if (statusEl) {
                    if (holidayLogic.isRedDay(dateStr) || holidayLogic.isSat(dateStr)) {
                        statusEl.innerText = '⚠️ 잔업은 평일에만 보고할 수 있습니다.';
                        statusEl.style.color = '#ef4444';
                    } else {
                        statusEl.innerText = '✅ 잔업은 저장된 퇴근시간 기준으로 시작시간이 자동 적용됩니다.';
                        statusEl.style.color = '#10b981';
                    }
                }
            } else {
                if (timeFieldsEl) timeFieldsEl.classList.add('hidden');
                if (startEl) {
                    startEl.disabled = false;
                    startEl.classList.remove('bg-gray-100', 'text-gray-500');
                    if (!startEl.value) startEl.value = '9';
                }
                if (durationEl && !durationEl.value) durationEl.value = '1';
                if (statusEl) {
                    statusEl.innerText = '✅ 특근은 하루 기준으로 기록하며, 주말/공휴일에도 보고할 수 있습니다.';
                    statusEl.style.color = '#10b981';
                }
            }
            if (deptEl && !deptEl.value) deptEl.value = security.cleanText((app.currentUser && app.currentUser.dept) || '');
            app.updateWorkReportPreview();
        },
        initWorkReportModal: (presetType = '', options = {}) => {
            const typeEl = document.getElementById('work-report-type');
            const dateEl = document.getElementById('work-report-date');
            const startEl = document.getElementById('work-report-start-time');
            const durationEl = document.getElementById('work-report-duration');
            const reasonEl = document.getElementById('work-report-reason');
            const detailEl = document.getElementById('work-report-work-detail');
            const deptEl = document.getElementById('work-report-dept');
            const noteEl = document.getElementById('work-report-note');
            const allowPastEl = document.getElementById('work-report-allow-past');
            const titleEl = document.querySelector('#work-report-modal h3');
            const submitBtnEl = document.querySelector('#work-report-modal button[onclick="app.submitWorkReport()"]');
            const editingReq = options && options.requestId
                ? (appData.requests || []).find((req) => String(req.id) === String(options.requestId))
                : null;
            const available = app.getAvailableWorkReportTypes();
            const selected = editingReq
                ? security.normalizeType(editingReq.type)
                : (available.includes(security.normalizeType(presetType)) ? security.normalizeType(presetType) : app.getDefaultWorkReportType());
            app.workReportEditingId = editingReq ? security.cleanInlineValue(editingReq.id) : '';
            if (typeEl) {
                typeEl.innerHTML = app.getWorkReportTypeOptionsHtml(selected);
                typeEl.value = selected;
            }
            const today = moment().format('YYYY-MM-DD');
            if (allowPastEl) allowPastEl.checked = !!editingReq;
            if (dateEl) {
                if (editingReq) {
                    dateEl.removeAttribute('min');
                    dateEl.value = security.normalizeDate(editingReq.startDate, today);
                } else {
                    dateEl.min = today;
                    dateEl.value = today;
                }
            }
            if (startEl) startEl.value = editingReq ? String(parseInt(String(editingReq.requestedStartAt || editingReq.timeRange || '9'), 10) || 9) : '9';
            if (durationEl) durationEl.value = editingReq ? String(parseInt(String(editingReq.reportedHours || editingReq.hours || 1), 10) || 1) : '1';
            if (reasonEl) reasonEl.value = editingReq ? security.cleanText(editingReq.reason || '') : '';
            if (detailEl) detailEl.value = editingReq ? security.cleanMultiline(editingReq.workDetail || editingReq.detailReason || '') : '';
            if (deptEl) deptEl.value = editingReq ? security.cleanText(editingReq.requestDept || '') : security.cleanText((app.currentUser && app.currentUser.dept) || '');
            if (noteEl) noteEl.value = editingReq ? security.cleanMultiline(editingReq.note || '') : '';
            if (titleEl) titleEl.innerText = editingReq ? '잔업/특근 수정' : '잔업/특근 신청';
            if (submitBtnEl) submitBtnEl.innerText = editingReq ? '수정 저장' : '보고 저장';
            app.syncWorkReportTypeDefaults();
        },
        editWorkReportRequest: (requestId) => {
            const safeId = security.cleanInlineValue(requestId);
            const req = (appData.requests || []).find((item) => String(item.id) === String(safeId));
            if (!req) return alert('수정할 잔업/특근 기록을 찾을 수 없습니다.');
            if (!app.canEditWorkReportRequest(req)) return alert('제출 후에는 수정할 수 없습니다. 반려된 뒤 다시 수정해 주세요.');
            app.closeReportBoard();
            app.openWorkReportModal(security.normalizeType(req.type), { requestId: safeId });
        },
        toggleWorkReportPastDates: () => {
            const dateEl = document.getElementById('work-report-date');
            const allowPastEl = document.getElementById('work-report-allow-past');
            if (!dateEl || !allowPastEl) return;
            const today = moment().format('YYYY-MM-DD');
            if (allowPastEl.checked) {
                dateEl.removeAttribute('min');
            } else {
                dateEl.min = today;
                if (dateEl.value && dateEl.value < today) dateEl.value = today;
            }
            app.syncWorkReportTypeDefaults();
        },
        submitWorkReport: async () => {
            try {
                if (!app.currentUser) return alert('세션이 만료되었습니다.');
                const typeEl = document.getElementById('work-report-type');
                const dateEl = document.getElementById('work-report-date');
                const startEl = document.getElementById('work-report-start-time');
                const durationEl = document.getElementById('work-report-duration');
                const reasonEl = document.getElementById('work-report-reason');
                const detailEl = document.getElementById('work-report-work-detail');
                const deptEl = document.getElementById('work-report-dept');
                const noteEl = document.getElementById('work-report-note');
                if (!typeEl || !dateEl || !startEl || !durationEl || !reasonEl || !detailEl || !deptEl || !noteEl) {
                    return alert('잔업/특근 신청창을 다시 열어주세요.');
                }

                const type = security.normalizeType(typeEl.value || app.getDefaultWorkReportType());
                const dateStr = security.normalizeDate(dateEl.value, '');
                const reason = security.cleanText(reasonEl.value || '');
                const workDetail = security.cleanMultiline(detailEl.value || '');
                const requestDept = security.cleanText(deptEl.value || '');
                const note = security.cleanMultiline(noteEl.value || '');
                if (!dateStr) return alert('날짜를 선택하세요.');
                if (!reason) return alert('사유를 입력하세요.');
                if (!workDetail) return alert('업무내용을 입력하세요.');
                if (!requestDept) return alert('요청 부서를 입력하세요.');

                const isHoliday = holidayLogic.isRedDay(dateStr) || holidayLogic.isSat(dateStr);
                let startHour = parseInt(startEl.value, 10);
                let duration = parseInt(durationEl.value, 10);
                let timeRange = '';
                let reportedHours = 0;
                let requestedStartAt = '';
                let requestedEndAt = '';

                if (type === '잔업') {
                    if (!Number.isFinite(duration) || duration < 1) return alert('보고 시간을 확인해주세요.');
                    startHour = Number(app.getTimeoffEndHourForDate(app.currentUser, dateStr));
                    if (Number.isFinite(startHour)) startEl.value = String(startHour);
                    const hasSameDayHolidayWork = (appData.requests || []).some((req) =>
                        String(req.userId) === String(app.currentUser.id) &&
                        security.normalizeDate(req.startDate, '') === dateStr &&
                        app.getWorkReportCategory(req) === 'holiday_work' &&
                        String(req.status || '') === 'reported'
                    );
                    if (isHoliday && !hasSameDayHolidayWork) {
                        return alert('잔업은 평일에만 가능하며, 휴일에는 같은 날짜 특근 보고가 있는 경우에만 추가 잔업을 기록할 수 있습니다.');
                    }
                    if (!Number.isFinite(startHour)) return alert('시작 시간을 확인해주세요.');
                    const endHour = startHour + duration;
                    if (endHour > 24) return alert('종료 시간이 24:00을 넘지 않게 설정해주세요.');
                    timeRange = `${formatHour(startHour)}~${formatHour(endHour)}`;
                    reportedHours = duration;
                    requestedStartAt = formatHour(startHour);
                    requestedEndAt = formatHour(endHour);
                } else {
                    duration = 0;
                    startHour = 0;
                    timeRange = '종일';
                    reportedHours = 0;
                }

                const reportCategory = type === '특근' ? 'holiday_work' : 'overtime';
                const editingId = security.cleanInlineValue(app.workReportEditingId || '');
                const baseReq = editingId ? (appData.requests || []).find((req) => String(req.id) === String(editingId)) : null;
                const newReq = security.sanitizeRequest({
                    ...(baseReq || {}),
                    id: editingId || Date.now(),
                    userId: app.currentUser.id,
                    userName: app.currentUser.name,
                    dept: app.currentUser.dept,
                    role: app.currentUser.role,
                    type,
                    startDate: dateStr,
                    endDate: dateStr,
                    hours: reportedHours,
                    timeRange,
                    reason,
                    detailReason: '',
                    status: 'reported',
                    reportCategory,
                    workDetail,
                    requestDept,
                    note,
                    requestedStartAt,
                    requestedEndAt,
                    reportedHours,
                    timestamp: (baseReq && baseReq.timestamp) || new Date().toISOString()
                });

                const saved = await db.upsertReq(newReq, { keepOverlayOnSuccess: true });
                if (!saved) return;
                await app.logUserAction(baseReq ? 'WorkReportEdit' : 'WorkReportCreate', `${newReq.id}:${type}:${dateStr}:${app.currentUser.id}`);
                app.workReportEditingId = '';
                app.closeWorkReportModal();
                app.reportBoardYear = moment(dateStr, 'YYYY-MM-DD', true).date() >= 16
                    ? moment(dateStr, 'YYYY-MM-DD', true).add(1, 'month').year()
                    : moment(dateStr, 'YYYY-MM-DD', true).year();
                app.reportBoardMonth = moment(dateStr, 'YYYY-MM-DD', true).date() >= 16
                    ? moment(dateStr, 'YYYY-MM-DD', true).add(1, 'month').month()
                    : moment(dateStr, 'YYYY-MM-DD', true).month();
                if (app.reportBoardMode === 'overview' && app.canAccessAnyWorkReportView()) app.openWorkReportOverviewBoard();
                else app.openWorkReportApplyBoard();
                alert(baseReq ? '보고가 수정되었습니다.' : '보고가 저장되었습니다.');
                document.getElementById('loading-overlay').style.display = 'none';
            } catch (err) {
                console.error(err);
                alert(`오류: ${err.message || err}`);
                document.getElementById('loading-overlay').style.display = 'none';
            }
        },
        getReportBoardRange: (year = app.reportBoardYear, month = app.reportBoardMonth) => {
            const safeYear = Number(year);
            const safeMonth = Number(month);
            const end = moment({ year: safeYear, month: safeMonth, date: 15 }).startOf('day');
            const start = end.clone().subtract(1, 'month').date(16).startOf('day');
            return { start, end };
        },
        getReportBoardPeriodLabel: (year = app.reportBoardYear, month = app.reportBoardMonth) => `${year}년 ${Number(month) + 1}월 정산`,
        getReportBoardPeriodKey: (year = app.reportBoardYear, month = app.reportBoardMonth) => `${Number(year)}-${String(Number(month) + 1).padStart(2, '0')}`,
        getReportBoardDueDate: (year = app.reportBoardYear, month = app.reportBoardMonth) => {
            let due = moment({ year: Number(year), month: Number(month), date: 16 }).startOf('day');
            const dueDateStr = due.format('YYYY-MM-DD');
            if (holidayLogic.isRedDay(dueDateStr) || holidayLogic.isSat(dueDateStr)) {
                due = due.clone().add(1, 'week').startOf('isoWeek');
                while (holidayLogic.isRedDay(due.format('YYYY-MM-DD')) || holidayLogic.isSat(due.format('YYYY-MM-DD'))) {
                    due.add(1, 'day');
                }
            }
            return due;
        },
        isReportSettlementSubmitted: (req, year = app.reportBoardYear, month = app.reportBoardMonth) => {
            if (!req) return false;
            return String(req.settlementPeriodKey || '') === app.getReportBoardPeriodKey(year, month) && !!String(req.settlementSubmittedAt || '').trim();
        },
        getIntegratedReportBoardRows: (year = app.reportBoardYear, month = app.reportBoardMonth) => {
            const { start, end } = app.getReportBoardRange(year, month);
            return (appData.requests || []).filter((req) => {
                if (!app.isWorkReportRequest(req)) return false;
                if (String(req.status || '') !== 'reported') return false;
                const safeDate = security.normalizeDate(req.startDate, '');
                if (!safeDate) return false;
                const m = moment(safeDate, 'YYYY-MM-DD', true);
                return m.isValid() && m.isSameOrAfter(start, 'day') && m.isSameOrBefore(end, 'day');
            }).sort((a, b) => {
                const dateDiff = String(a.startDate || '').localeCompare(String(b.startDate || ''), 'ko');
                if (dateDiff !== 0) return dateDiff;
                const userDiff = String(a.userName || '').localeCompare(String(b.userName || ''), 'ko');
                if (userDiff !== 0) return userDiff;
                return String(a.requestedStartAt || a.timeRange || '').localeCompare(String(b.requestedStartAt || b.timeRange || ''), 'ko');
            });
        },
        getPersonalReportBoardRows: (year = app.reportBoardYear, month = app.reportBoardMonth) => {
            const safeUserId = security.cleanInlineValue(app.currentUser && app.currentUser.id);
            return app.getIntegratedReportBoardRows(year, month).filter((req) => String(req.userId) === String(safeUserId));
        },
        getPersonalReportSubmissionInfo: (rows, year = app.reportBoardYear, month = app.reportBoardMonth) => {
            const safeRows = Array.isArray(rows) ? rows : [];
            const submittedRows = safeRows.filter((req) => app.isReportSettlementSubmitted(req, year, month));
            const unsubmittedRows = safeRows.filter((req) => !app.isReportSettlementSubmitted(req, year, month));
            const latestSubmittedAt = submittedRows
                .map((req) => String(req.settlementSubmittedAt || '').trim())
                .filter(Boolean)
                .sort()
                .slice(-1)[0] || '';
            return {
                totalCount: safeRows.length,
                submittedCount: submittedRows.length,
                unsubmittedCount: unsubmittedRows.length,
                latestSubmittedAt,
                isFullySubmitted: safeRows.length > 0 && unsubmittedRows.length === 0,
                rowsToSubmit: unsubmittedRows.length ? unsubmittedRows : safeRows
            };
        },
        getIntegratedReportBoardTotals: (rows) => {
            const safeRows = Array.isArray(rows) ? rows : [];
            let overtimeHours = 0;
            const holidayWorkKeys = new Set();
            safeRows.forEach((req) => {
                const category = app.getWorkReportCategory(req);
                const hours = Number(req.reportedHours || req.hours || 0);
                if (category === 'overtime') {
                    overtimeHours += Number.isFinite(hours) ? hours : 0;
                    return;
                }
                if (category === 'holiday_work') {
                    const safeUserId = security.cleanInlineValue(req.userId || req.userName || '');
                    const safeDate = security.normalizeDate(req.startDate, '');
                    if (safeDate) holidayWorkKeys.add(`${safeUserId}:${safeDate}`);
                }
            });
            const overtimeText = Number.isInteger(overtimeHours)
                ? String(overtimeHours)
                : String(overtimeHours.toFixed(2).replace(/\.?0+$/, ''));
            return {
                overtimeHours,
                overtimeText,
                holidayWorkDays: holidayWorkKeys.size
            };
        },
        getAdminReportBoardSummaryRows: (rows) => {
            const byUser = new Map();
            (Array.isArray(rows) ? rows : []).forEach((req) => {
                const safeUserId = security.cleanInlineValue(req.userId || '');
                if (!safeUserId) return;
                if (!byUser.has(safeUserId)) {
                    byUser.set(safeUserId, {
                        userId: safeUserId,
                        userName: security.cleanText(req.userName || '-'),
                        dept: security.cleanText(req.dept || ''),
                        overtimeHours: 0,
                        holidayWorkDays: new Set(),
                        totalCount: 0,
                        submittedCount: 0,
                        latestSubmittedAt: ''
                    });
                }
                const item = byUser.get(safeUserId);
                item.totalCount += 1;
                const category = app.getWorkReportCategory(req);
                const hours = Number(req.reportedHours || req.hours || 0);
                if (category === 'overtime') {
                    item.overtimeHours += Number.isFinite(hours) ? hours : 0;
                } else if (category === 'holiday_work') {
                    const safeDate = security.normalizeDate(req.startDate, '');
                    if (safeDate) item.holidayWorkDays.add(safeDate);
                }
                if (app.isReportSettlementSubmitted(req, app.reportBoardYear, app.reportBoardMonth)) {
                    item.submittedCount += 1;
                    const submittedAt = String(req.settlementSubmittedAt || '').trim();
                    if (submittedAt && (!item.latestSubmittedAt || submittedAt > item.latestSubmittedAt)) item.latestSubmittedAt = submittedAt;
                }
            });
            return [...byUser.values()].map((item) => {
                const overtimeText = Number.isInteger(item.overtimeHours)
                    ? String(item.overtimeHours)
                    : String(item.overtimeHours.toFixed(2).replace(/\.?0+$/, ''));
                return {
                    ...item,
                    overtimeText,
                    holidayWorkDayCount: item.holidayWorkDays.size,
                    submissionText: item.totalCount > 0 && item.submittedCount === item.totalCount ? '승인 요청 완료' : '미제출'
                };
            }).sort((a, b) => {
                const overtimeDiff = Number(b.overtimeHours || 0) - Number(a.overtimeHours || 0);
                if (overtimeDiff !== 0) return overtimeDiff;
                const holidayDiff = Number(b.holidayWorkDayCount || 0) - Number(a.holidayWorkDayCount || 0);
                if (holidayDiff !== 0) return holidayDiff;
                return String(a.userName || '').localeCompare(String(b.userName || ''), 'ko');
            });
        },
        getReportBoardRowsForUser: (userId, year = app.reportBoardYear, month = app.reportBoardMonth) => {
            const safeUserId = security.cleanInlineValue(userId);
            return app.getIntegratedReportBoardRows(year, month).filter((req) => String(req.userId) === String(safeUserId));
        },
        getWorkReportTimeSummary: (req) => {
            const category = app.getWorkReportCategory(req);
            if (category === 'holiday_work') return '종일';
            const range = security.cleanText(req.timeRange || '-');
            const hours = Number(req.reportedHours || req.hours || 0);
            return hours > 0 ? `${range} (${hours}h)` : range;
        },
        buildWorkReportSettlementMailDraft: (rows, year = app.reportBoardYear, month = app.reportBoardMonth, requester = app.currentUser) => {
            const safeRows = Array.isArray(rows) ? rows : [];
            const totals = app.getIntegratedReportBoardTotals(safeRows);
            const periodLabel = app.getReportBoardPeriodLabel(year, month);
            const { start, end } = app.getReportBoardRange(year, month);
            const safeRequester = requester || {};
            const recipients = app.getMailRecipientsForRequester(safeRequester);
            const rankSuffix = security.cleanText(safeRequester.rank || '');
            const subject = `[잔업/특근 승인요청] ${security.cleanText(safeRequester.name || '-')} / ${periodLabel}`;
            const lines = [
                `안녕하세요! ${security.cleanText(safeRequester.name || '-')}${rankSuffix ? ` ${rankSuffix}` : ''}입니다.`,
                '',
                '다음과 같이 잔업/특근 승인 요청 드립니다.',
                '',
                `정산기간: ${start.format('YYYY-MM-DD')} ~ ${end.format('YYYY-MM-DD')}`,
                '',
                `총 잔업시간: ${totals.overtimeText}시간`,
                `총 특근일수: ${totals.holidayWorkDays}일`,
                '',
                '상세 내역은 웹의 잔업/특근 현황에서 확인 부탁드립니다.',
                `접속주소: ${window.location.origin}/`
            ];
            lines.push('');
            lines.push('감사합니다.');
            lines.push('좋은 하루 보내세요.');
            return {
                recipients,
                subject,
                body: lines.join('\n')
            };
        },
        openWorkReportSettlementDraftModal: () => {
            if (app.reportBoardMode === 'overview') return;
            const rows = app.getPersonalReportBoardRows(app.reportBoardYear, app.reportBoardMonth);
            if (!rows.length) return alert('정산 메일 초안을 만들 보고 내역이 없습니다.');
            const draft = app.buildWorkReportSettlementMailDraft(rows, app.reportBoardYear, app.reportBoardMonth, app.currentUser);
            const modal = document.getElementById('report-settlement-mail-modal');
            const subjectEl = document.getElementById('report-settlement-mail-subject');
            const toEl = document.getElementById('report-settlement-mail-to');
            const ccEl = document.getElementById('report-settlement-mail-cc');
            const bodyEl = document.getElementById('report-settlement-mail-body');
            if (!modal || !subjectEl || !toEl || !ccEl || !bodyEl) return;
            subjectEl.value = draft.subject;
            toEl.value = draft.recipients.to || '';
            ccEl.value = draft.recipients.cc || '';
            bodyEl.value = draft.body;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        },
        closeWorkReportSettlementDraftModal: () => {
            const modal = document.getElementById('report-settlement-mail-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        },
        copyWorkReportSettlementDraft: async () => {
            const subjectEl = document.getElementById('report-settlement-mail-subject');
            const bodyEl = document.getElementById('report-settlement-mail-body');
            if (!subjectEl || !bodyEl) return;
            await navigator.clipboard.writeText(`제목: ${subjectEl.value}\n\n${bodyEl.value}`);
            alert('정산 메일 초안을 복사했습니다.');
        },
        openWorkReportSettlementMailApp: () => {
            const subjectEl = document.getElementById('report-settlement-mail-subject');
            const toEl = document.getElementById('report-settlement-mail-to');
            const ccEl = document.getElementById('report-settlement-mail-cc');
            const bodyEl = document.getElementById('report-settlement-mail-body');
            if (!subjectEl || !toEl || !ccEl || !bodyEl) return;
            openOutlookDraft(toEl.value, subjectEl.value, bodyEl.value, ccEl.value);
        },
        submitCurrentWorkReportSettlement: async () => {
            if (app.reportBoardMode === 'overview') return;
            const rows = app.getPersonalReportBoardRows(app.reportBoardYear, app.reportBoardMonth);
            const info = app.getPersonalReportSubmissionInfo(rows, app.reportBoardYear, app.reportBoardMonth);
            const targetRows = info.rowsToSubmit;
            if (!targetRows.length) return alert('제출 처리할 잔업/특근 기록이 없습니다.');
            const dueDate = app.getReportBoardDueDate(app.reportBoardYear, app.reportBoardMonth);
            if (moment().startOf('day').isBefore(dueDate, 'day')) {
                return alert(`${app.getReportBoardPeriodLabel(app.reportBoardYear, app.reportBoardMonth)}은 ${dueDate.format('YYYY-MM-DD')}부터 승인 요청을 보낼 수 있습니다.`);
            }
            const draft = app.buildWorkReportSettlementMailDraft(targetRows, app.reportBoardYear, app.reportBoardMonth, app.currentUser);
            if (!draft.recipients.to) return alert('메일 수신인(To) 설정 또는 이메일 정보가 없습니다.');
            if (!confirm(`${app.getReportBoardPeriodLabel(app.reportBoardYear, app.reportBoardMonth)} 승인 요청을 보낼까요?`)) return;
            try {
                document.getElementById('loading-text').innerText = '정산 제출 처리 중...';
                document.getElementById('loading-overlay').style.display = 'flex';
                const result = await db.submitWorkReportSettlement(app.reportBoardYear, app.reportBoardMonth, targetRows.map((req) => req.id));
                const submittedAt = String(result.submittedAt || '');
                const periodKey = String(result.periodKey || '');
                const requestIdSet = new Set((result.requestIds || []).map((id) => String(id)));
                appData.requests = appData.requests.map((req) => {
                    if (!requestIdSet.has(String(req.id))) return req;
                    return security.sanitizeRequest({
                        ...req,
                        settlementPeriodKey: periodKey,
                        settlementSubmittedAt: submittedAt,
                        settlementSubmittedBy: app.currentUser && app.currentUser.id,
                        settlementSubmittedByName: app.currentUser && app.currentUser.name
                    });
                });
                appData.meta.requestDataVersion += 1;
                app.renderReportBoardModal();
                openOutlookDraft(draft.recipients.to, draft.subject, draft.body, draft.recipients.cc);
                alert('승인 요청을 저장했고 메일 작성창을 열었습니다.');
            } catch (err) {
                alert(`오류: ${err.message || err}`);
            } finally {
                document.getElementById('loading-overlay').style.display = 'none';
            }
        },
        renderReportBoardModal: () => {
            const body = document.getElementById('report-board-body');
            if (!body) return;
            const isOverviewMode = app.reportBoardMode === 'overview';
            const rows = isOverviewMode
                ? app.getIntegratedReportBoardRows(app.reportBoardYear, app.reportBoardMonth)
                : app.getPersonalReportBoardRows(app.reportBoardYear, app.reportBoardMonth);
            const periodLabel = app.getReportBoardPeriodLabel(app.reportBoardYear, app.reportBoardMonth);
            const { start, end } = app.getReportBoardRange(app.reportBoardYear, app.reportBoardMonth);
            const dueDate = app.getReportBoardDueDate(app.reportBoardYear, app.reportBoardMonth);
            const totals = app.getIntegratedReportBoardTotals(rows);
            const summaryRows = isOverviewMode ? app.getAdminReportBoardSummaryRows(rows) : [];
            const personalSubmissionInfo = !isOverviewMode ? app.getPersonalReportSubmissionInfo(rows, app.reportBoardYear, app.reportBoardMonth) : null;
            body.innerHTML = `
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <div class="text-lg font-bold text-gray-900">${periodLabel} ${isOverviewMode ? '잔업/특근 현황' : '잔업/특근 신청'}</div>
                            <p class="text-sm text-gray-500">집계 기준: ${start.format('YYYY-MM-DD')} ~ ${end.format('YYYY-MM-DD')}</p>
                            <p class="text-xs text-gray-400 mt-1">${isOverviewMode ? '권한 범위 직원들의 잔업/특근 현황입니다.' : '내 기록만 표시됩니다.'}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="app.changeReportBoardMonth(-1)" class="px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">이전달</button>
                            <button type="button" onclick="app.changeReportBoardMonth(1)" class="px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">다음달</button>
                            ${isOverviewMode ? '' : `<button type="button" onclick="app.submitCurrentWorkReportSettlement()" class="px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 text-sm font-bold bg-emerald-50 hover:bg-emerald-100">승인 요청</button>`}
                            ${isOverviewMode ? '' : `<button type="button" onclick="app.closeReportBoard(); app.openWorkReportModal();" class="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-bold">보고 추가</button>`}
                        </div>
                    </div>
                    ${isOverviewMode ? '' : `
                    <div class="rounded-xl border ${personalSubmissionInfo.isFullySubmitted ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'} px-4 py-3">
                        <div class="text-sm font-bold ${personalSubmissionInfo.isFullySubmitted ? 'text-emerald-700' : 'text-amber-700'}">
                            ${personalSubmissionInfo.isFullySubmitted
                                ? `승인 요청 완료${personalSubmissionInfo.latestSubmittedAt ? ` · ${personalSubmissionInfo.latestSubmittedAt}` : ''}`
                                : `미제출 ${personalSubmissionInfo.unsubmittedCount}건 · 제출 예정일 ${dueDate.format('YYYY-MM-DD')}`}
                        </div>
                        <div class="mt-1 text-xs ${personalSubmissionInfo.isFullySubmitted ? 'text-emerald-600' : 'text-amber-600'}">
                            승인 요청을 보내면 설정된 메일 수신자 기준으로 메일 작성창이 열립니다.
                        </div>
                    </div>`}
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div class="text-xs font-bold text-slate-500">${isOverviewMode ? '총 잔업시간' : '내 총 잔업시간'}</div>
                            <div class="mt-1 text-2xl font-extrabold text-slate-800">${totals.overtimeText}h</div>
                        </div>
                        <div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                            <div class="text-xs font-bold text-rose-500">${isOverviewMode ? '총 특근일수' : '내 총 특근일수'}</div>
                            <div class="mt-1 text-2xl font-extrabold text-rose-700">${totals.holidayWorkDays}일</div>
                        </div>
                    </div>
                    <div class="overflow-auto rounded-xl border border-gray-200">
                        <table class="w-full min-w-[1100px] text-sm">
                            <thead class="bg-gray-50 text-gray-600">
                                ${isOverviewMode
                                    ? `<tr>
                                            <th class="px-3 py-3 text-left font-bold">직원명</th>
                                            <th class="px-3 py-3 text-left font-bold">총 잔업시간</th>
                                            <th class="px-3 py-3 text-left font-bold">총 특근일수</th>
                                            <th class="px-3 py-3 text-left font-bold">제출 상태</th>
                                            <th class="px-3 py-3 text-center font-bold">상세</th>
                                        </tr>`
                                    : `<tr>
                                            <th class="px-3 py-3 text-left font-bold">일자</th>
                                            <th class="px-3 py-3 text-left font-bold">시간</th>
                                            <th class="px-3 py-3 text-left font-bold">구분</th>
                                            <th class="px-3 py-3 text-left font-bold">사유</th>
                                            <th class="px-3 py-3 text-center font-bold">상세</th>
                                            <th class="px-3 py-3 text-center font-bold">수정</th>
                                        </tr>`}
                            </thead>
                            <tbody class="bg-white">
                                ${isOverviewMode
                                    ? (summaryRows.length ? summaryRows.map((item) => `
                                        <tr class="border-t hover:bg-gray-50">
                                            <td class="px-3 py-3 font-semibold text-gray-800">${security.cleanText(item.userName || '-')}</td>
                                            <td class="px-3 py-3 text-gray-700">${item.overtimeText}h</td>
                                            <td class="px-3 py-3 text-gray-700">${Number(item.holidayWorkDayCount || 0)}일</td>
                                            <td class="px-3 py-3 text-gray-700"><span class="inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${item.submissionText === '승인 요청 완료' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">${item.submissionText}</span>${item.latestSubmittedAt ? `<div class="mt-1 text-[11px] text-gray-400">${item.latestSubmittedAt}</div>` : ''}</td>
                                            <td class="px-3 py-3 text-center"><button type="button" onclick="app.openReportUserDetail('${security.cleanInlineValue(item.userId)}')" class="text-indigo-600 text-xs font-bold underline">상세확인</button></td>
                                        </tr>
                                    `).join('') : `<tr><td colspan="5" class="px-4 py-10 text-center text-gray-400">${periodLabel} 보고 내역이 없습니다.</td></tr>`)
                                    : (rows.length ? rows.map((req) => `
                                        <tr class="border-t hover:bg-gray-50">
                                            <td class="px-3 py-3 text-gray-600">${security.normalizeDate(req.startDate, '-')}</td>
                                            <td class="px-3 py-3 text-gray-600">${app.getWorkReportTimeSummary(req)}</td>
                                            <td class="px-3 py-3"><span class="inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${app.getWorkReportCategory(req) === 'holiday_work' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}">${app.getRequestDisplayType(req)}</span></td>
                                            <td class="px-3 py-3 text-gray-700">${security.cleanText(req.reason || '-')}</td>
                                            <td class="px-3 py-3 text-center"><button type="button" onclick="app.openReportDetail('${security.cleanInlineValue(req.id)}')" class="text-indigo-600 text-xs font-bold underline">보기</button></td>
                                            <td class="px-3 py-3 text-center">${app.canEditWorkReportRequest(req, app.reportBoardYear, app.reportBoardMonth) ? `<button type="button" onclick="app.editWorkReportRequest('${security.cleanInlineValue(req.id)}')" class="text-slate-700 text-xs font-bold underline">수정</button>` : `<span class="text-[11px] text-gray-300">잠금</span>`}</td>
                                        </tr>
                                    `).join('') : `<tr><td colspan="6" class="px-4 py-10 text-center text-gray-400">${periodLabel} 보고 내역이 없습니다.</td></tr>`)}
                            </tbody>
                        </table>
                    </div>
                </div>`;
        },
        openReportUserDetail: (userId) => {
            const safeUserId = security.cleanInlineValue(userId);
            const rows = app.getReportBoardRowsForUser(safeUserId, app.reportBoardYear, app.reportBoardMonth);
            if (!rows.length) return;
            const totals = app.getIntegratedReportBoardTotals(rows);
            const { start, end } = app.getReportBoardRange(app.reportBoardYear, app.reportBoardMonth);
            const body = document.getElementById('report-detail-body');
            const modal = document.getElementById('report-detail-modal');
            if (!body || !modal) return;
            const userName = security.cleanText(rows[0].userName || '-');
            app.reportDetailUserId = safeUserId;
            app.reportDetailRequestId = '';
            body.innerHTML = `
                <div class="space-y-4">
                    <div class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <div class="text-sm font-bold text-gray-800">${userName} · ${app.getReportBoardPeriodLabel(app.reportBoardYear, app.reportBoardMonth)} 상세</div>
                        <div class="mt-1 text-xs text-gray-500">집계 기준: ${start.format('YYYY-MM-DD')} ~ ${end.format('YYYY-MM-DD')}</div>
                        <div class="mt-2 text-xs ${rows.every((req) => app.isReportSettlementSubmitted(req, app.reportBoardYear, app.reportBoardMonth)) ? 'text-emerald-600' : 'text-amber-600'}">
                            ${rows.every((req) => app.isReportSettlementSubmitted(req, app.reportBoardYear, app.reportBoardMonth))
                                ? `승인 요청 완료${rows.map((req) => req.settlementSubmittedAt).filter(Boolean).sort().slice(-1)[0] ? ` · ${rows.map((req) => req.settlementSubmittedAt).filter(Boolean).sort().slice(-1)[0]}` : ''}`
                                : '미제출'}
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div class="text-xs font-bold text-slate-500">총 잔업시간</div>
                            <div class="mt-1 text-2xl font-extrabold text-slate-800">${totals.overtimeText}h</div>
                        </div>
                        <div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                            <div class="text-xs font-bold text-rose-500">총 특근일수</div>
                            <div class="mt-1 text-2xl font-extrabold text-rose-700">${totals.holidayWorkDays}일</div>
                        </div>
                    </div>
                    <div class="overflow-auto rounded-xl border border-gray-200">
                        <table class="w-full min-w-[760px] text-sm">
                            <thead class="bg-gray-50 text-gray-600">
                                <tr>
                                    <th class="px-3 py-3 text-left font-bold">일자</th>
                                    <th class="px-3 py-3 text-left font-bold">시간</th>
                                    <th class="px-3 py-3 text-left font-bold">구분</th>
                                    <th class="px-3 py-3 text-left font-bold">사유</th>
                                    <th class="px-3 py-3 text-left font-bold">요청 부서</th>
                                    <th class="px-3 py-3 text-left font-bold">비고</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white">
                                ${rows.map((req) => `
                                    <tr class="border-t hover:bg-gray-50">
                                        <td class="px-3 py-3 text-gray-600">${security.normalizeDate(req.startDate, '-')}</td>
                                <td class="px-3 py-3 text-gray-600">${app.getWorkReportTimeSummary(req)}</td>
                                        <td class="px-3 py-3"><span class="inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${app.getWorkReportCategory(req) === 'holiday_work' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}">${app.getRequestDisplayType(req)}</span></td>
                                        <td class="px-3 py-3 text-gray-700">${security.cleanText(req.reason || '-')}</td>
                                        <td class="px-3 py-3 text-gray-600">${security.cleanText(req.requestDept || '-')}</td>
                                        <td class="px-3 py-3 text-gray-600 whitespace-pre-line break-all">${security.cleanMultiline(req.note || '-')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        },
        openReportDetail: (requestId) => {
            const safeId = security.cleanInlineValue(requestId);
            const req = (appData.requests || []).find((item) => String(item.id) === String(safeId));
            if (!req) return;
            app.reportDetailRequestId = safeId;
            app.reportDetailUserId = '';
            const body = document.getElementById('report-detail-body');
            if (!body) return;
            body.innerHTML = `
                <div class="space-y-4 text-sm">
                    <div class="grid grid-cols-[120px_1fr] gap-3"><div class="text-gray-500">직원명</div><div class="font-semibold text-gray-800">${security.cleanText(req.userName || '-')}</div></div>
                    <div class="grid grid-cols-[120px_1fr] gap-3"><div class="text-gray-500">구분</div><div class="font-semibold text-gray-800">${app.getRequestDisplayType(req)}</div></div>
                    <div class="grid grid-cols-[120px_1fr] gap-3"><div class="text-gray-500">일자</div><div class="font-semibold text-gray-800">${security.normalizeDate(req.startDate, '-')}</div></div>
                        <div class="grid grid-cols-[120px_1fr] gap-3"><div class="text-gray-500">작업 시간</div><div class="font-semibold text-gray-800">${app.getWorkReportTimeSummary(req)}</div></div>
                    <div class="grid grid-cols-[120px_1fr] gap-3"><div class="text-gray-500">사유</div><div class="font-semibold text-gray-800">${security.cleanText(req.reason || '-')}</div></div>
                    <div class="grid grid-cols-[120px_1fr] gap-3"><div class="text-gray-500">업무내용</div><div class="font-semibold text-gray-800 whitespace-pre-line">${security.cleanMultiline(req.workDetail || req.detailReason || '-')}</div></div>
                    <div class="grid grid-cols-[120px_1fr] gap-3"><div class="text-gray-500">요청 부서</div><div class="font-semibold text-gray-800">${security.cleanText(req.requestDept || '-')}</div></div>
                    <div class="grid grid-cols-[120px_1fr] gap-3"><div class="text-gray-500">비고</div><div class="font-semibold text-gray-800 whitespace-pre-line">${security.cleanMultiline(req.note || '-')}</div></div>
                </div>`;
            const modal = document.getElementById('report-detail-modal');
            if (!modal) return;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        },
        closeReportDetail: () => {
            const modal = document.getElementById('report-detail-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            app.reportDetailRequestId = '';
            app.reportDetailUserId = '';
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

        showTooltip: (dateStr, event) => {
            const tooltip = document.getElementById('custom-tooltip');
            if (!app.currentUser) return;
            const calendarData = app.buildMonthlyCalendarData(appData.requests, app.currentUser);
            const daysEvents = (calendarData.eventMap[dateStr] || []).slice();
            if(daysEvents.length === 0) {
                tooltip.style.display = 'none';
                return;
            }
            daysEvents.sort((a, b) => {
                const pA = app.getRequestTypePriority(a); const pB = app.getRequestTypePriority(b);
                if (pA !== pB) return pA - pB; return String(a.userName||'').localeCompare(String(b.userName||''), 'ko');
            });
            let html = `<div class="font-bold border-b pb-1 mb-2 text-gray-700">${moment(dateStr).format('M월 D일')} 일정</div>`;
            daysEvents.forEach(e => {
                const displayType = app.getRequestDisplayType(e);
                const rejectReason = security.cleanText(e.rejectReason || '');
                let detail = '';
                if (security.normalizeType(e.type) === '시간차(퇴근)' || security.normalizeType(e.type) === '시간차(외출)') detail = ` <span class="text-xs text-gray-500">(${e.timeRange} / ${e.hours}h)</span>`;
                html += `<div class="mb-2 last:mb-0"><div class="flex items-center flex-wrap gap-1"><span class="font-bold text-gray-800">${e.userName}</span><span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">${displayType}</span>${detail}</div>${e.reason ? `<div class="text-xs text-gray-500 mt-0.5 pl-2">- ${e.reason}</div>` : ''}${e.detailReason ? `<div class="text-xs text-amber-600 mt-0.5 pl-2">- 상세사유: ${security.cleanText(e.detailReason)}</div>` : ''}${e.status === 'rejected' && rejectReason ? `<div class="text-xs text-red-600 mt-0.5 pl-2">- 반려 사유: ${rejectReason}</div>` : ''}</div>`;
            });
            tooltip.innerHTML = html; tooltip.style.display = 'block'; app.moveTooltip(event);
        },
        
        showMemberHistory: (userId, event) => {
            if (!app.showUsage) return;

            const tooltip = document.getElementById('custom-tooltip');
            const u = appData.users.find(user => String(user.id) === String(userId));
            if (!u) return;

            const history = appData.requests.filter(r => String(r.userId) === String(userId) && ['approved', 'cancel_requested'].includes(r.status)).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
            const totalHistoryHours = history.reduce((sum, r) => sum + Number(r.hours || 0), 0);

            let html = `<div class="font-bold border-b pb-1 mb-2 text-gray-700">${u.name} 사용 내역 <span class="text-xs font-normal text-gray-500">(총 ${app.fmtTime(totalHistoryHours)})</span></div>`;
            if (history.length === 0) { html += '<div class="text-xs text-gray-400 p-1">사용 내역 없음</div>'; } 
            else {
                html += '<div>';
                history.forEach(r => {
                    const displayType = app.getRequestDisplayType(r);
                    const sFmt = moment(r.startDate).format('M.D');
                    const eFmt = moment(r.endDate).format('M.D');
                    const dateStr = (r.startDate === r.endDate) ? sFmt : `${sFmt}~${eFmt}`;
                    let detailParts = [];
                    if(r.hours < 8) detailParts.push(r.hours + 'h');
                    if(r.reason) detailParts.push(r.reason);
                    const detailStr = detailParts.length > 0 ? `(${detailParts.join('/')})` : '';

                    html += `<div class="text-xs text-gray-600 mb-1 px-1">- ${dateStr} : <span class="font-bold text-indigo-600">${displayType}</span>${detailStr}</div>`;
                });
                html += '</div>';
            }
            tooltip.innerHTML = html; tooltip.style.display = 'block'; app.moveTooltip(event);
        },

        moveTooltip: (event) => {
            const tooltip = document.getElementById('custom-tooltip');
            const x = event.clientX + 15; const y = event.clientY + 15;
            const rect = tooltip.getBoundingClientRect();
            if (x + rect.width > window.innerWidth) tooltip.style.left = (event.clientX - rect.width - 10) + 'px'; else tooltip.style.left = x + 'px';
            if (y + rect.height > window.innerHeight) tooltip.style.top = (event.clientY - rect.height - 10) + 'px'; else tooltip.style.top = y + 'px';
        },

        hideTooltip: () => { document.getElementById('custom-tooltip').style.display = 'none'; },
        applyMemberCardSelection: () => {
            const cards = document.querySelectorAll('[data-member-card="1"]');
            cards.forEach(card => {
                const cardId = String(card.getAttribute('data-member-id') || '');
                if (app.selectedMemberId && cardId === String(app.selectedMemberId)) {
                    card.classList.add('member-card-selected');
                } else {
                    card.classList.remove('member-card-selected');
                }
            });
        },
        openMemberCard: (userId) => {
            if (!app.isMemberCardFeatureEnabled()) {
                alert('직원 카드 기능이 꺼져 있습니다. 마스터가 켜야 사용 가능합니다.');
                return;
            }
            const safeId = security.cleanInlineValue(userId);
            const member = appData.users.find(user => String(user.id) === String(safeId));
            if (!member) return;

            const bodyEl = document.getElementById('member-card-body');
            if (!bodyEl) return;
            const rows = app.getMemberCardData(member);
            bodyEl.innerHTML = `
                <div class="mb-3">
                    <div class="text-lg font-bold text-gray-800">${member.name || '-'}</div>
                    <div class="text-xs text-gray-500 mt-0.5">${member.dept || '-'} / ${app.getUserTitleText(member)}</div>
                </div>
                <div class="space-y-2">
                    ${rows.map(item => `<div class="grid grid-cols-[140px_1fr] gap-2 items-center text-sm"><div class="text-gray-500">${item.label}</div><div class="font-semibold text-gray-800 break-all">${item.value}</div></div>`).join('')}
                </div>
            `;
            app.selectedMemberId = safeId;
            app.applyMemberCardSelection();
            document.getElementById('member-card-modal')?.classList.remove('hidden');
        },
        closeMemberCard: () => {
            app.selectedMemberId = null;
            app.applyMemberCardSelection();
            document.getElementById('member-card-modal')?.classList.add('hidden');
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
                    const startHour = parseInt(document.getElementById('req-report-start-time')?.value || '9', 10);
                    const duration = parseInt(document.getElementById('req-report-duration')?.value || '1', 10);
                    const endHour = startHour + duration;
                    if (!Number.isFinite(startHour) || !Number.isFinite(duration) || endHour > 24) return alert('특근 시간을 다시 확인해주세요.');
                    hours = duration;
                    timeRange = `${formatHour(startHour)}~${formatHour(endHour)}`;
                    reportCategory = 'holiday_work';
                    requestedStartAt = formatHour(startHour);
                    requestedEndAt = formatHour(endHour);
                    eDate = sDate;
                } else {
                    return alert('연차 종류 오류');
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
                        id: Date.now(), userId: requestUser.id, userName: requestUser.name, 
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
            if (action === 'cancel_req' && String(req.userId) !== String(app.currentUser.id)) {
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

        addUser: async () => {
            if (!app.hasUserManagePermission()) return alert('구성원 관리 권한이 없습니다.');
            const rawId = document.getElementById('new-id')?.value.trim() || '';
            const rawPw = document.getElementById('new-pw')?.value.trim() || '';
            const rawName = document.getElementById('new-name')?.value.trim() || '';
            const rawRole = document.getElementById('new-role')?.value.trim() || 'employee';
            const rawDept = document.getElementById('new-dept')?.value.trim() || '';
            const rawRank = document.getElementById('new-rank')?.value.trim() || '';
            const rawDays = document.getElementById('new-days')?.value.trim() || '15';
            const rawEmail = document.getElementById('new-email')?.value.trim() || '';
            const rawEmployeeNo = document.getElementById('new-emp-no')?.value.trim() || '';
            const rawPhone = document.getElementById('new-phone')?.value.trim() || '';
            const rawWorkQ1 = document.getElementById('new-work-q1')?.value || '';
            const rawWorkQ2 = document.getElementById('new-work-q2')?.value || '';
            const rawWorkQ3 = document.getElementById('new-work-q3')?.value || '';
            const rawWorkQ4 = document.getElementById('new-work-q4')?.value || '';
            const inputUser = security.sanitizeUser({
                id: rawId,
                password: rawPw,
                name: rawName,
                role: rawRole,
                dept: rawDept,
                rank: rawRank,
                email: rawEmail,
                employeeNo: rawEmployeeNo,
                phone: rawPhone,
                workQ1: rawWorkQ1,
                workQ2: rawWorkQ2,
                workQ3: rawWorkQ3,
                workQ4: rawWorkQ4,
                featureMemberCard: app.isMemberCardFeatureEnabled(),
                featureHomepage: app.isHomepageFeatureEnabled(),
                featureBoard: app.isBoardFeatureEnabled()
            });

            if(!inputUser.id || !inputUser.name || !inputUser.password) return alert('필수 입력 누락');
            if (!inputUser.workQ1 || !inputUser.workQ2 || !inputUser.workQ3 || !inputUser.workQ4) {
                return alert('근무시간 분기(Q1~Q4) 중 미등록 항목이 있습니다. 모두 입력 후 저장해 주세요.');
            }
            if(inputUser.password.length < 4) return alert('비밀번호는 4자 이상으로 입력하세요.');
            if(!security.isValidEmail(inputUser.email)) return alert('이메일 형식이 올바르지 않습니다.');
            if(appData.users.some(u => String(u.id) === String(inputUser.id))) return alert('이미 존재하는 ID입니다.');

            const days = parseFloat(rawDays || 15);
            const totalHours = Number.isFinite(days) && days > 0 ? days * 8 : 15 * 8;
            if (!confirm(`"${inputUser.name}" 사용자를 등록하시겠습니까?`)) return;
            try {
                await db.upsertUser({
                    ...inputUser,
                    totalHours,
                    usedHours: 0,
                    pendingHours: 0
                });
                app.renderUserManagement();
            } catch (e) {
                console.error(e);
            }
        },

        renderUserSpecialLeaveEditor: (userId) => {
            const entries = app.getUserSpecialLeaveEntries(userId, { enabledOnly: false, includeZero: true })
                .filter((entry) => entry.enabled || entry.granted);
            if (!entries.length) {
                return `<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">활성화된 특별휴가 항목이 없습니다. 마스터 설정에서 먼저 켜주세요.</div>`;
            }
            return `<div class="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                <div class="mb-3">
                    <p class="text-sm font-bold text-gray-700">특별휴가</p>
                    <p class="text-xs text-gray-500">체크하면 직원에게 부여됩니다. 입력 단위는 일(day)입니다.</p>
                </div>
                <div class="space-y-3">
                    ${entries.map((entry) => {
                        const colorClass = app.getSpecialLeaveColorClasses(entry.color);
                        const safeKey = security.cleanInlineValue(entry.typeKey);
                        const isChecked = entry.granted;
                        const percent = app.getUsageGaugePercent(entry.usedHours, entry.totalHours);
                        const gaugeWidth = percent <= 0 ? '0%' : (percent < 2 ? '2%' : `${percent}%`);
                        return `<div class="rounded-lg border bg-white p-3 ${colorClass}">
                            <div class="flex items-center justify-between gap-3 mb-3">
                                <label class="inline-flex items-center cursor-pointer">
                                    <input id="edit-special-enable-${safeKey}" type="checkbox" class="mr-2 accent-indigo-600" ${isChecked ? 'checked' : ''} onchange="app.toggleSpecialLeaveGrant('${safeKey}')">
                                    <span class="text-sm font-bold">+ ${entry.label}</span>
                                </label>
                                <span class="text-xs font-bold ${entry.remainingHours < 0 ? 'text-red-600' : ''}">${app.fmtTime(entry.remainingHours)} / ${app.fmtTime(entry.totalHours)}</span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold text-gray-500 mb-1">총 휴가(일)</label>
                                    <input id="edit-special-total-${safeKey}" type="number" min="0" step="0.5" value="${entry.totalHours > 0 ? app.formatDayCount(entry.totalHours) : ''}" class="w-full border bg-white p-2.5 rounded ${isChecked ? '' : 'opacity-50'}" ${isChecked ? '' : 'disabled'}>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-500 mb-1">사용 휴가(일)</label>
                                    <input id="edit-special-used-${safeKey}" type="number" min="0" step="0.5" value="${entry.manualUsedHours > 0 ? app.formatDayCount(entry.manualUsedHours) : ''}" class="w-full border bg-white p-2.5 rounded ${isChecked ? '' : 'opacity-50'}" ${isChecked ? '' : 'disabled'}>
                                    <div class="mt-2 text-xs text-gray-500">
                                        <div>총 사용 ${app.fmtTime(entry.usedHours)}</div>
                                        ${entry.requestUsedHours > 0 ? `<div>신청 사용 ${app.fmtTime(entry.requestUsedHours)}</div>` : ''}
                                        ${entry.pendingHours > 0 ? `<div class="text-orange-500 font-bold mt-1">승인 대기 ${app.fmtTime(entry.pendingHours)}</div>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="mt-3 h-2 rounded-full bg-white/70 border border-white/80 overflow-hidden">
                                <div class="h-full rounded-full bg-current opacity-70" style="width:${gaugeWidth}; ${percent <= 0 ? 'display:none;' : ''}"></div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        },
        toggleSpecialLeaveGrant: (typeKey) => {
            const safeKey = security.cleanInlineValue(typeKey);
            const checkbox = document.getElementById(`edit-special-enable-${safeKey}`);
            const totalInput = document.getElementById(`edit-special-total-${safeKey}`);
            const usedInput = document.getElementById(`edit-special-used-${safeKey}`);
            if (!checkbox || !totalInput || !usedInput) return;
            totalInput.disabled = !checkbox.checked;
            usedInput.disabled = !checkbox.checked;
            totalInput.classList.toggle('opacity-50', !checkbox.checked);
            usedInput.classList.toggle('opacity-50', !checkbox.checked);
            if (checkbox.checked && !totalInput.value) {
                const meta = app.getSpecialLeaveTypeMeta(safeKey);
                const grantHours = Number(meta && meta.grantHours || 0);
                totalInput.value = grantHours > 0 ? app.formatDayCount(grantHours) : '1';
            }
        },

        ensureUserEditModal: () => {
            if (document.getElementById('user-edit-modal')) return;
            const modal = document.createElement('div');
            modal.id = 'user-edit-modal';
            modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm hidden flex justify-center items-start z-50 fade-in overflow-y-auto py-6';
            modal.innerHTML = `
                <div class="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
                    <div class="flex justify-between items-center mb-4 border-b pb-2 shrink-0">
                        <h3 id="user-edit-title" class="font-bold text-xl text-gray-800">직원 정보 수정</h3>
                        <button onclick="app.closeUserEditModal()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                    </div>
                    <input type="hidden" id="edit-user-id">
                    <div class="overflow-y-auto pr-1 custom-scrollbar flex-1 min-h-0">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">이름</label><input id="edit-user-name" class="w-full border bg-gray-50 p-2.5 rounded"></div>
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">유형</label><select id="edit-user-role" class="w-full border bg-gray-50 p-2.5 rounded"><option value="employee">직원</option><option value="part_leader">파트리더</option><option value="team_leader">팀리더</option><option value="ceo">대표</option></select></div>
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">부서</label><select id="edit-user-dept" class="w-full border bg-gray-50 p-2.5 rounded"><option value="매뉴얼팀">매뉴얼팀</option><option value="파츠북팀">파츠북팀</option><option value="대표">대표</option></select></div>
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">직급</label><select id="edit-user-rank" class="w-full border bg-gray-50 p-2.5 rounded"><option value="사원">사원</option><option value="대리">대리</option><option value="과장">과장</option><option value="차장">차장</option><option value="부장">부장</option><option value="팀장">팀장</option><option value="관리자">관리자</option><option value="대표">대표</option></select></div>
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">총 연차(일)</label><input id="edit-user-days" type="number" min="0" step="0.5" class="w-full border bg-gray-50 p-2.5 rounded"></div>
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">사번</label><input id="edit-user-emp" class="w-full border bg-gray-50 p-2.5 rounded"></div>
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">전화번호</label><input id="edit-user-phone" class="w-full border bg-gray-50 p-2.5 rounded"></div>
                        <div class="md:col-span-2"><label class="block text-xs font-bold text-gray-500 mb-1">이메일</label><input id="edit-user-email" class="w-full border bg-gray-50 p-2.5 rounded"></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">1분기 근무시간</label><select id="edit-user-w1" class="w-full border bg-gray-50 p-2.5 rounded"></select></div>
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">2분기 근무시간</label><select id="edit-user-w2" class="w-full border bg-gray-50 p-2.5 rounded"></select></div>
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">3분기 근무시간</label><select id="edit-user-w3" class="w-full border bg-gray-50 p-2.5 rounded"></select></div>
                        <div><label class="block text-xs font-bold text-gray-500 mb-1">4분기 근무시간</label><select id="edit-user-w4" class="w-full border bg-gray-50 p-2.5 rounded"></select></div>
                    </div>
                    <div id="edit-user-special-leaves" class="mb-3"></div>
                    <div id="edit-user-pw-wrap" class="mb-4">
                        <label class="block text-xs font-bold text-gray-500 mb-1">비밀번호 초기화(마스터 전용)</label>
                        <input id="edit-user-pw" type="password" placeholder="새 비밀번호(4자 이상)" class="w-full border bg-gray-50 p-2.5 rounded">
                    </div>
                    </div>
                    <div class="flex justify-end gap-2 pt-4 border-t mt-4 shrink-0">
                        <button onclick="app.closeUserEditModal()" class="bg-gray-100 px-5 py-2.5 rounded-lg font-bold">취소</button>
                        <button onclick="app.updateUser(document.getElementById('edit-user-id').value)" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold">저장</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (event) => {
                if (event.target === modal) app.closeUserEditModal();
            });
        },

        openUserEditModal: (id) => {
            const safeId = security.cleanInlineValue(id);
            if (!app.canManageTargetUser(safeId)) return alert('해당 구성원 수정 권한이 없습니다.');
            const user = appData.users.find(u => String(u.id) === String(safeId));
            if (!user) return alert('사용자를 찾을 수 없습니다.');

            app.ensureUserEditModal();
            document.getElementById('edit-user-id').value = safeId;
            document.getElementById('user-edit-title').innerText = `${user.name} 정보 수정`;
            document.getElementById('edit-user-name').value = user.name || '';
            document.getElementById('edit-user-role').value = user.role || 'employee';
            document.getElementById('edit-user-dept').value = user.dept || '매뉴얼팀';
            document.getElementById('edit-user-rank').value = user.rank || '사원';
            document.getElementById('edit-user-days').value = Number(user.totalHours || 0) / 8;
            document.getElementById('edit-user-emp').value = user.employeeNo || '';
            document.getElementById('edit-user-phone').value = user.phone || '';
            document.getElementById('edit-user-email').value = user.email || '';
            document.getElementById('edit-user-w1').innerHTML = makeWorkShiftOptions(user.workQ1);
            document.getElementById('edit-user-w2').innerHTML = makeWorkShiftOptions(user.workQ2);
            document.getElementById('edit-user-w3').innerHTML = makeWorkShiftOptions(user.workQ3);
            document.getElementById('edit-user-w4').innerHTML = makeWorkShiftOptions(user.workQ4);
            document.getElementById('edit-user-pw').value = '';
            const specialLeaveWrap = document.getElementById('edit-user-special-leaves');
            if (specialLeaveWrap) specialLeaveWrap.innerHTML = app.renderUserSpecialLeaveEditor(safeId);

            const pwWrap = document.getElementById('edit-user-pw-wrap');
            if (pwWrap) pwWrap.style.display = app.currentUser.role === 'master' ? 'block' : 'none';

            document.getElementById('user-edit-modal').classList.remove('hidden');
        },

        closeUserEditModal: () => {
            const modal = document.getElementById('user-edit-modal');
            if (modal) modal.classList.add('hidden');
        },

        setEditMode: (id) => {
            const safeId = security.cleanInlineValue(id);
            app.openUserEditModal(safeId);
        },
        cancelEdit: () => { app.editingId = null; app.closeUserEditModal(); app.renderUserManagement(); },

        updateUser: async (id) => {
            try {
                if (!app.hasUserManagePermission()) throw new Error('구성원 관리 권한이 없습니다.');
                const modalId = document.getElementById('edit-user-id')?.value || '';
                const safeId = security.cleanInlineValue(id || modalId);
                if (!app.canManageTargetUser(safeId)) throw new Error('해당 구성원 수정 권한이 없습니다.');
                const u = appData.users.find(u => String(u.id) === String(safeId));
                if(!u) throw new Error('사용자 미확인');
                const nameInput = document.getElementById('edit-user-name');
                const roleInput = document.getElementById('edit-user-role');
                const deptInput = document.getElementById('edit-user-dept');
                const rankInput = document.getElementById('edit-user-rank');
                const daysInput = document.getElementById('edit-user-days');
                const pwInput = document.getElementById('edit-user-pw');
                const emailInput = document.getElementById('edit-user-email');
                const empInput = document.getElementById('edit-user-emp');
                const phoneInput = document.getElementById('edit-user-phone');
                const w1Input = document.getElementById('edit-user-w1');
                const w2Input = document.getElementById('edit-user-w2');
                const w3Input = document.getElementById('edit-user-w3');
                const w4Input = document.getElementById('edit-user-w4');
                if (!nameInput || !roleInput || !deptInput || !rankInput || !daysInput) {
                    throw new Error('수정 카드가 열려 있지 않습니다.');
                }
                if(nameInput) u.name = security.cleanText(nameInput.value);
                if(roleInput) u.role = security.normalizeRole(roleInput.value);
                if(deptInput) u.dept = security.cleanText(deptInput.value);
                if(rankInput) u.rank = security.cleanText(rankInput.value);
                if(daysInput) { const days = parseFloat(daysInput.value); if (!isNaN(days)) u.totalHours = days * 8; }
                if(empInput) u.employeeNo = security.cleanInlineValue(empInput.value);
                if(phoneInput) u.phone = security.cleanPhone(phoneInput.value);
                if(w1Input) u.workQ1 = security.normalizeWorkShift(w1Input.value);
                if(w2Input) u.workQ2 = security.normalizeWorkShift(w2Input.value);
                if(w3Input) u.workQ3 = security.normalizeWorkShift(w3Input.value);
                if(w4Input) u.workQ4 = security.normalizeWorkShift(w4Input.value);
                if(emailInput) {
                    const cleanEmail = security.cleanEmail(emailInput.value);
                    if(!security.isValidEmail(cleanEmail)) throw new Error('이메일 형식 오류');
                    u.email = cleanEmail;
                }
                if(pwInput && pwInput.value.trim() !== '') {
                    if (app.currentUser.role !== 'master') throw new Error('비밀번호 초기화는 마스터만 가능합니다.');
                    const newPw = pwInput.value.trim();
                    if(newPw.length < 4) throw new Error('비밀번호는 4자 이상');
                    u.password = newPw;
                }
                const specialLeavePayload = app.getUserSpecialLeaveEntries(safeId, { enabledOnly: false, includeZero: true }).filter((entry) => entry.enabled || entry.granted).map((entry) => {
                    const enabledInput = document.getElementById(`edit-special-enable-${entry.typeKey}`);
                    const totalInput = document.getElementById(`edit-special-total-${entry.typeKey}`);
                    const usedInput = document.getElementById(`edit-special-used-${entry.typeKey}`);
                    const rawStored = app.getSpecialLeaveRawEntry(safeId, entry.typeKey);
                    const isGranted = !!(enabledInput && enabledInput.checked);
                    const rawUsedDays = isGranted ? Number(usedInput ? usedInput.value : 0) : 0;
                    const safeManualUsedHours = Number.isFinite(rawUsedDays) && rawUsedDays >= 0 ? rawUsedDays * 8 : 0;
                    if (!isGranted && (entry.usedHours > 0 || entry.pendingHours > 0 || safeManualUsedHours > 0)) {
                        throw new Error(`${entry.label} 사용 또는 대기 이력이 있어 해제할 수 없습니다.`);
                    }
                    const totalDays = isGranted ? Number(totalInput ? totalInput.value : 0) : 0;
                    const safeTotalHours = Number.isFinite(totalDays) && totalDays >= 0 ? totalDays * 8 : 0;
                    if (isGranted && safeTotalHours <= 0) {
                        throw new Error(`${entry.label} 총 휴가를 입력해주세요.`);
                    }
                    if (safeTotalHours < safeManualUsedHours + entry.requestUsedHours + entry.pendingHours) {
                        throw new Error(`${entry.label} 총 휴가가 사용/대기 수량보다 작습니다.`);
                    }
                    return {
                        userId: safeId,
                        typeKey: entry.typeKey,
                        totalHours: safeTotalHours,
                        usedHours: safeManualUsedHours
                    };
                });
                const savedUser = await db.upsertUser(u, { keepOverlayOnSuccess: true });
                await db.saveUserSpecialLeaves(safeId, specialLeavePayload, { keepOverlayOnSuccess: true });
                if (savedUser && String(savedUser.id) === String(app.currentUser.id)) {
                    app.currentUser = { ...app.currentUser, ...savedUser };
                    delete app.currentUser.password;
                }
                alert('수정 완료');
            } catch (e) { console.error(e); alert('오류: ' + e.message); } finally { document.getElementById('loading-overlay').style.display = 'none'; app.editingId = null; app.closeUserEditModal(); app.renderUserManagement(); }
        },

        deleteUser: async (id) => {
            if (!app.hasUserManagePermission()) return alert('구성원 관리 권한이 없습니다.');
            const safeId = security.cleanInlineValue(id);
            if (!app.canManageTargetUser(safeId)) return alert('해당 구성원 삭제 권한이 없습니다.');
            const target = appData.users.find(u => String(u.id) === String(safeId));
            if (!target) return alert('사용자를 찾을 수 없습니다.');
            if (target.role === 'master') return alert('마스터 계정은 삭제할 수 없습니다.');
            if (!confirm('삭제하시겠습니까?')) return;
            if (!confirm(`"${target.name}" 사용자를 정말 삭제하겠습니까?`)) return;
            appData.users = appData.users.filter(u => String(u.id) !== String(safeId));
            await db.saveUsers();
            await app.logUserAction('UserDelete', `${safeId}:${target.name}`);
            app.renderUserManagement();
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
        renderCal: (requests, viewer) => {
            const year = app.viewYear, month = app.viewMonth, today = moment().startOf('day');
            const calendarData = app.buildMonthlyCalendarData(requests, viewer, year, month);
            const displayToggle = app.renderCalendarDisplayToggle();
            const calendarModeLabel = app.getCalendarModeLabel();
            const calendarTitle = app.calendarMode === 'workreport' ? '잔업/특근 현황' : '연차 현황';
            const titleClass = app.isMobileViewport ? 'text-lg' : 'text-2xl';
            const deptClass = app.isMobileViewport ? 'text-sm' : 'text-base';
            const cardHeader = `<div class="px-4 pt-3 border-b border-gray-200 bg-gray-50/60 flex flex-wrap items-end justify-between gap-2">${app.renderCalendarTabs()}<div class="flex flex-wrap items-center justify-end gap-2 pb-1">${displayToggle}<label class="inline-flex items-center cursor-pointer"><input type="checkbox" ${app.showPastShading ? 'checked' : ''} onchange="app.togglePastShading()" class="sr-only peer"><div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div><span class="ms-2 text-xs font-medium text-gray-500">지난 날짜 음영</span></label></div></div><div class="px-4 py-3 border-b border-gray-200 flex items-center"><button onclick="app.changeMonth(-1)" class="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition"><i class="fa-solid fa-chevron-left text-gray-600"></i></button><h3 class="${titleClass} font-bold text-gray-800 mx-4">${year}년 ${month+1}월 <span class="${deptClass} font-normal text-gray-500">(${calendarModeLabel})</span></h3><button onclick="app.changeMonth(1)" class="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition"><i class="fa-solid fa-chevron-right text-gray-600"></i></button></div>`;
            if (app.isMobileViewport && app.calendarDisplayMode === 'list') {
                const listBody = cardHeader + app.renderCalendarListView(calendarData, viewer, year, month);
                const isOpen = !!app.mobileCalendarOpen;
                return `<div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                    <div class="px-4 py-4 ${isOpen ? 'border-b border-indigo-100' : ''} bg-indigo-50/70">
                        <button onclick="app.toggleMobileCalendarOpen()" class="w-full flex items-center justify-between gap-3 text-left">
                            <div class="min-w-0">
                                <h3 class="font-bold text-indigo-800 flex items-center"><i class="fa-solid fa-calendar-days mr-2 text-indigo-600"></i> ${calendarTitle} / ${calendarModeLabel}</h3>
                                <p class="mt-1 text-xs text-indigo-600">리스트</p>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <span class="text-xs font-bold text-indigo-700">${isOpen ? '접기' : '펼치기'}</span>
                                <i class="fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs text-indigo-600"></i>
                            </div>
                        </button>
                    </div>
                    ${isOpen ? listBody : ''}
                </div>`;
            }
            let html = cardHeader;
            html += `<div class="calendar-grid"><div class="calendar-header-cell text-red-500">일</div><div class="calendar-header-cell">월</div><div class="calendar-header-cell">화</div><div class="calendar-header-cell">수</div><div class="calendar-header-cell">목</div><div class="calendar-header-cell">금</div><div class="calendar-header-cell text-blue-500">토</div>`;
            const firstDayIdx = new Date(year, month, 1).getDay(); const lastDate = new Date(year, month + 1, 0).getDate();
            for(let i=0; i<firstDayIdx; i++) html += `<div class="calendar-cell bg-gray-50/50"></div>`;
            for(let d=1; d<=lastDate; d++) {
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const curDate = moment(dateStr); const isToday = curDate.isSame(today, 'day'); const isPast = curDate.isBefore(today, 'day'); const applyShading = isPast && app.showPastShading;
                const evts = calendarData.eventMap[dateStr] || [];
                const isRed = holidayLogic.isRedDay(dateStr); const isSat = holidayLogic.isSat(dateStr); const holName = holidayLogic.getHolName(dateStr);
                let evtHtml = evts.map(e => {
                    const isMe = String(e.userId) === String(viewer.id); const isCancel = e.status === 'cancel_requested';
                    const isRejected = e.status === 'rejected';
                    const eventType = security.normalizeType(e.type);
                    let className = 'text-[10px] px-1 py-0.5 rounded mb-1 truncate border-l-4 '; 
                    if (isRejected) className += 'bg-red-50 border-red-400 text-red-700 font-bold border';
                    else if (isCancel) className += 'bg-white border-red-500 text-red-600 animate-pulse font-bold border-l';
                    else if (isMe) className += 'bg-indigo-600 text-white font-black border-indigo-800';
                    else {
                        if (app.isSpecialLeaveRequest(e)) {
                            const meta = app.getSpecialLeaveTypeMeta(e.specialLeaveTypeKey);
                            const safeColor = security.normalizeSpecialLeaveColor(meta && meta.color);
                            if (safeColor === 'rose') className += 'bg-rose-100 text-rose-800 border-rose-500';
                            else if (safeColor === 'sky') className += 'bg-sky-100 text-sky-800 border-sky-500';
                            else if (safeColor === 'emerald') className += 'bg-emerald-100 text-emerald-800 border-emerald-500';
                            else if (safeColor === 'amber') className += 'bg-amber-100 text-amber-800 border-amber-500';
                            else if (safeColor === 'violet') className += 'bg-violet-100 text-violet-800 border-violet-500';
                            else if (safeColor === 'indigo') className += 'bg-indigo-100 text-indigo-800 border-indigo-500';
                            else className += 'bg-slate-100 text-slate-800 border-slate-500';
                        } else if(eventType === '연차') className += 'bg-lime-200 text-lime-800 border-lime-600'; else if(eventType === '반차') className += 'bg-orange-100 text-orange-800 border-orange-500'; else if(eventType === '시간차(퇴근)') className += 'bg-yellow-200 text-yellow-900 border-yellow-600'; else if(eventType === '시간차(외출)') className += 'bg-stone-200 text-stone-800 border-stone-500'; else className += 'bg-gray-100 text-gray-700 border-gray-500';
                    }
                    const displayType = app.getRequestDisplayType(e);
                    return `<div class="${className}">${e.userName}${displayType!=='연차'?`(${displayType})`:''}</div>`;
                }).join('');
                const canSelectDate = app.canSelectCalendarDate(dateStr);
                const todayClass = isToday ? 'calendar-cell-today' : '';
                const selectedClass = app.selectedCalendarDate === dateStr ? 'calendar-cell-selected' : '';
                const clickAttr = app.isMobileViewport
                    ? `onclick="app.openMobileCalendarDayDetail('${dateStr}')"`
                    : (canSelectDate ? `onclick="app.setSelectedCalendarDate('${dateStr}')"` : '');
                const dblClickAttr = app.canUseCalendarClickRequest() ? `ondblclick="app.handleCalendarDateDoubleClick('${dateStr}')"` : '';
                const hoverAttrs = app.isMobileViewport ? '' : `onmouseenter="app.showTooltip('${dateStr}', event)" onmousemove="app.moveTooltip(event)" onmouseleave="app.hideTooltip()"`;
                const eventBody = app.isMobileViewport
                    ? `<div class="${applyShading ? 'opacity-60 grayscale' : ''}">${app.renderMobileCalendarDaySummary(evts)}</div>`
                    : `<div class="grid grid-cols-2 gap-1 overflow-y-auto max-h-[100px] px-1 custom-scrollbar ${applyShading ? 'opacity-60 grayscale' : ''}">${evtHtml}</div>`;
                html += `<div class="calendar-cell hover:bg-gray-50 ${applyShading ? 'bg-gray-50' : ''} ${todayClass} ${selectedClass}" data-cal-date="${dateStr}" ${clickAttr} ${dblClickAttr} ${hoverAttrs}><div class="flex justify-between items-start mb-1 ${applyShading ? 'opacity-40' : ''}"><span class="text-sm font-bold ml-1 mt-1 ${isToday?'today-circle':(isRed?'holiday-text':(isSat?'sat-text':'text-gray-700'))}">${d}</span>${holName ? `<span class="text-[10px] text-white bg-red-400 px-1 rounded truncate max-w-[60px]">${holName}</span>` : ''}</div>${eventBody}</div>`;
            }
            html += `</div>`;
            if (!app.isMobileViewport) {
                return `<div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">${html}</div>`;
            }
            const isOpen = !!app.mobileCalendarOpen;
            return `<div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                <div class="px-4 py-4 ${isOpen ? 'border-b border-indigo-100' : ''} bg-indigo-50/70">
                    <button onclick="app.toggleMobileCalendarOpen()" class="w-full flex items-center justify-between gap-3 text-left">
                        <div class="min-w-0">
                            <h3 class="font-bold text-indigo-800 flex items-center"><i class="fa-solid fa-calendar-days mr-2 text-indigo-600"></i> 연차 현황 / ${calendarModeLabel}</h3>
                            <p class="mt-1 text-xs text-indigo-600">월간 달력</p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="text-xs font-bold text-indigo-700">${isOpen ? '접기' : '펼치기'}</span>
                            <i class="fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs text-indigo-600"></i>
                        </div>
                    </button>
                </div>
                ${isOpen ? html : ''}
            </div>`;
        },

        renderDashboardQuickActions: (options = {}) => {
            const includeAnnual = options.includeAnnual !== false;
            const buttons = [];
            if (app.canUseWorkReportApply()) {
                buttons.push(`<button onclick="app.openWorkReportApplyBoard()" class="w-full sm:w-auto bg-slate-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md shadow-slate-200"><i class="fa-regular fa-pen-to-square mr-2"></i> 잔업/특근 신청</button>`);
            }
            if (app.canAccessAnyWorkReportView()) {
                buttons.push(`<button onclick="app.openWorkReportOverviewBoard()" class="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-bold shadow-sm"><i class="fa-regular fa-clock mr-2"></i> 잔업/특근 현황</button>`);
            }
            if (includeAnnual) {
                buttons.push(`<button onclick="app.openRequestModal()" class="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md shadow-indigo-200"><i class="fa-solid fa-plus mr-2"></i> 연차 신청</button>`);
            }
            if (!buttons.length) return '';
            return `<div class="mb-4 flex flex-col sm:flex-row justify-end gap-2">${buttons.join('')}</div>`;
        },

        renderEmployeeDashboard: () => {
            const u = app.currentUser, reqs = app.sortRequestsByRecent(appData.requests.filter(r=>String(r.userId)===String(u.id)));
            // [수정] 승인 대기 연차 표시 및 3단계 현황판 적용 (Case C)
            const myStatusCard = app.renderMyStatusCard(u, {
                titleClass: app.isMobileViewport ? 'text-xl' : 'text-2xl',
                remainClass: app.isMobileViewport ? 'text-3xl' : 'text-4xl',
                totalClass: app.isMobileViewport ? 'text-sm' : 'text-lg',
                subtitle: app.getEnglishRoleLabel(u)
            });
            const recentRequestSection = app.renderRecentRequestList('최근 신청 내역', reqs, '내역 없음');
            document.getElementById('app-container').innerHTML = `<div class="w-full max-w-7xl mx-auto px-4 fade-in pt-8 pb-12">${myStatusCard}${app.renderDashboardQuickActions({ includeAnnual: true })}<div class="mb-10">${app.renderCal(appData.requests, u)}</div>${recentRequestSection}</div>${app.getModal()}`;
            app.initModal();
        },

        renderManagerDashboard: () => {
            const u = app.currentUser, isM = u.role === 'master', isCEO = u.role === 'ceo';
            const perms = app.getCurrentPermissions();
            const hasMasterLevel = isM || (
                perms.canManageUsers &&
                perms.approveScope === 'all' &&
                perms.calendarSelf &&
                perms.calendarManual &&
                perms.calendarParts &&
                perms.calendarAll
            );
            const isEffectiveCEO = isCEO && !hasMasterLevel;
            const canApprove = isM || app.hasApprovalPermission();
            const memberStatusScope = isM ? 'all' : perms.memberStatusScope;
            const scopeDepts = memberStatusScope === 'all' ? ['매뉴얼팀', '파츠북팀'] : (memberStatusScope === 'manual' ? ['매뉴얼팀'] : (memberStatusScope === 'parts' ? ['파츠북팀'] : []));
            const pendings = canApprove ? appData.requests.filter(r => ['pending', 'cancel_requested'].includes(r.status) && app.canApproveRequest(r)) : [];
            
            let allMembers = [];
            if (scopeDepts.length > 0) {
                allMembers = appData.users.filter(user => user.role !== 'master' && scopeDepts.includes(user.dept));
                if (!isM) allMembers = allMembers.filter(user => String(user.id) !== String(u.id));
            }
            const departments = [...new Set(allMembers.map(m => m.dept))].sort();

            let memberStatusHtml = '';
            if(allMembers.length > 0) {
                const cardFeatureEnabled = app.isMemberCardFeatureEnabled();
                memberStatusHtml = departments.map(deptName => {
                    const deptMembers = allMembers.filter(m => m.dept === deptName).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''), 'ko'));
                    let bgStyle = 'bg-gray-50 border-gray-200', titleColor = 'text-gray-800', iconColor = 'text-gray-500';
                    if(deptName === '매뉴얼팀') { bgStyle = 'bg-indigo-50 border-indigo-100'; titleColor = 'text-indigo-800'; iconColor = 'text-indigo-600'; }
                    else if (deptName === '파츠북팀') { bgStyle = 'bg-emerald-50 border-emerald-100'; titleColor = 'text-emerald-800'; iconColor = 'text-emerald-600'; }
                    const safeDept = security.cleanInlineValue(deptName);
                    const isMobileCollapsed = app.isMobileViewport;
                    const isOpen = !isMobileCollapsed || app.isMobileMemberSectionOpen(deptName);
                    const collapseButton = isMobileCollapsed
                        ? `<button onclick="app.toggleMobileMemberSection('${safeDept}')" class="flex items-center gap-2 text-left flex-1">
                                <h3 class="font-bold ${titleColor} flex items-center"><i class="fa-solid fa-users mr-2 ${iconColor}"></i> 팀원 연차 현황 / ${deptName}</h3>
                                <span class="text-xs font-bold ${titleColor}">${isOpen ? '접기' : '펼치기'}</span>
                                <i class="fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs ${iconColor}"></i>
                            </button>`
                        : `<h3 class="font-bold ${titleColor} flex items-center"><i class="fa-solid fa-users mr-2 ${iconColor}"></i> 팀원 연차 현황 / ${deptName}</h3>`;
                    const controlsClass = isMobileCollapsed ? 'flex items-center gap-2 ml-auto' : 'flex items-center gap-3';
                    const contentClass = isOpen ? 'grid' : 'hidden';
                    return `<div class="${bgStyle} p-5 rounded-xl shadow-sm border mb-8"><div class="flex justify-between items-center mb-4 gap-3">${collapseButton}<div class="${controlsClass}" ${isMobileCollapsed ? 'onclick="event.stopPropagation()"' : ''}><label class="inline-flex items-center cursor-pointer"><input type="checkbox" class="sr-only peer" onchange="app.toggleUsage()" ${app.showUsage ? 'checked' : ''}><div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>${isMobileCollapsed ? '' : '<span class="ms-2 text-xs font-medium text-gray-500">사용 내역</span>'}</label>${isMobileCollapsed ? '' : `<span class="text-[11px] ${cardFeatureEnabled ? 'text-indigo-600' : 'text-gray-400'}">${cardFeatureEnabled ? '직원 카드 켜짐' : '직원 카드 꺼짐'}</span>`}</div></div><div class="${contentClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${deptMembers.map(m => { const safeId = security.cleanInlineValue(m.id); const clickAttr = cardFeatureEnabled ? `onclick=\"app.openMemberCard('${safeId}')\"` : ''; const isSelected = cardFeatureEnabled && String(app.selectedMemberId) === String(safeId); const selectedClass = isSelected ? 'member-card-selected' : ''; const cardClass = cardFeatureEnabled ? 'cursor-pointer hover:shadow-md hover:border-indigo-200' : 'cursor-default'; const absenceState = app.getMemberAbsenceState(m); const absentClass = absenceState.absent ? 'member-card-absent' : ''; const absenceBadge = absenceState.absent ? `<div class="member-absence-badge">${absenceState.label}</div>` : ''; const usedGaugePercent = app.getUsageGaugePercent(m.usedHours, m.totalHours); const usedGaugeText = usedGaugePercent.toFixed(0).replace(/\.0$/, ''); const usedGaugeWidth = usedGaugePercent <= 0 ? '0%' : (usedGaugePercent < 3 ? '3%' : `${usedGaugePercent}%`); const specialLeaveSummary = app.renderSpecialLeaveSummary(m, { compact: true }); const specialLeaveFooter = specialLeaveSummary ? `<div class="mt-2 pt-2 border-t border-emerald-100"><div class="space-y-1">${specialLeaveSummary}</div></div>` : ''; return `<div data-member-card="1" data-member-id="${safeId}" class="bg-white border border-white/50 rounded-lg p-3 shadow-sm transition ${cardClass} ${selectedClass} ${absentClass} group" ${clickAttr} onmouseenter="app.showMemberHistory('${safeId}', event)" onmousemove="app.moveTooltip(event)" onmouseleave="app.hideTooltip()"><div class="flex justify-between items-start gap-3"><div class="min-w-0 flex-1 pr-2"><div class="flex items-center gap-2 min-w-0"><div class="font-bold text-gray-800 truncate">${m.name} <span class="text-xs text-gray-500">(${app.getUserTitleText(m)})</span></div>${absenceBadge}</div>${app.showUsage ? `<div class="mt-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded inline-block">사용: ${app.fmtTime(m.usedHours)}</div>` : ''}</div><div class="flex min-w-[150px] flex-col items-end text-right shrink-0"><div class="text-sm font-bold ${m.totalHours-m.usedHours<0?'text-red-600':'text-indigo-600'}">${app.fmtTime(m.totalHours-m.usedHours)} 남음</div><div class="text-[10px] text-gray-400 mt-0.5">/ 총 ${app.fmtTime(m.totalHours)}</div></div></div><div class="mt-3 flex items-center gap-2"><div class="h-2.5 flex-1 rounded-full bg-slate-100 border border-slate-200 overflow-hidden"><div class="h-full rounded-full bg-indigo-500 transition-all duration-300" style="width:${usedGaugeWidth}; ${usedGaugePercent <= 0 ? 'display:none;' : ''}"></div></div><div class="text-[10px] font-bold text-gray-400 min-w-[28px] text-right">${usedGaugeText}%</div></div>${specialLeaveFooter}</div>`; }).join('')}</div></div>`;
                }).join('');
            }
            
            // [수정] 관리자 모드에서도 '승인 대기' 연차 표시 (Case C 적용)
            const myStatusCard = isEffectiveCEO ? '' : app.renderMyStatusCard(app.currentUser, {
                titleClass: 'text-lg',
                remainClass: 'text-3xl',
                subtitle: app.getEnglishRoleLabel(app.currentUser)
            });
            const myReqs = app.sortRequestsByRecent(appData.requests.filter(r=>String(r.userId)===String(u.id)));
            const myReqsSection = isEffectiveCEO ? '' : app.renderRecentRequestList('내 최근 신청 내역', myReqs, '신청 내역이 없습니다.');

            let dashboardTitle = (u.role === 'team_leader') ? '팀리더 대시보드' : (u.role === 'part_leader' ? '파트리더 대시보드' : '직원 대시보드');
            if (hasMasterLevel) dashboardTitle = '시스템 최고 관리자 대시보드';
            else if (isEffectiveCEO) dashboardTitle = '대표 대시보드';

            const approvalSection = !canApprove ? '' : `<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"><div class="bg-white rounded-xl shadow-sm border p-5"><div class="flex justify-between items-center mb-4"><h3 class="font-bold text-indigo-800 flex items-center"><i class="fa-regular fa-clock mr-2"></i> 결재 대기</h3><button onclick="app.approveAll('pending')" class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-bold transition">모두 승인</button></div><div class="space-y-3">${pendings.filter(r=>r.status==='pending').map(r=> { const displayType = app.getRequestDisplayType(r); return `<div class="border border-sky-200 bg-sky-50/70 p-4 rounded-lg flex justify-between items-center"><div><span class="font-bold">${r.userName}</span> <span class="text-xs text-gray-500">${r.dept}</span><div class="text-sm text-indigo-600 font-bold mt-1">${displayType} | ${r.reason}</div><div class="text-xs text-gray-400 mt-1">${app.fmtDate(r.startDate)}${r.startDate!==r.endDate ? ' ~ '+app.fmtDate(r.endDate) : ''}</div></div><div class="flex flex-col gap-1"><button onclick="app.processReq('${r.id}','approve')" class="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold">승인</button><button onclick="app.processReq('${r.id}','reject')" class="bg-gray-100 text-gray-600 px-3 py-1.5 rounded text-xs">반려</button></div></div>`; }).join('') || '<div class="text-center text-gray-400 py-4">대기 없음</div>'}</div></div><div class="bg-white rounded-xl shadow-sm border p-5"><div class="flex justify-between items-center mb-4"><h3 class="font-bold text-red-600 flex items-center"><i class="fa-solid fa-triangle-exclamation mr-2"></i> 취소 요청</h3><button onclick="app.approveAll('cancel')" class="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 font-bold transition">모두 승인</button></div><div class="space-y-3">${pendings.filter(r=>r.status==='cancel_requested').map(r=>`<div class="border border-amber-200 bg-amber-50/80 p-4 rounded-lg flex justify-between items-center"><div><span class="font-bold">${r.userName}</span><div class="text-xs text-red-500 font-bold mt-1">취소 요청됨</div><div class="text-xs text-gray-400">${app.fmtDate(r.startDate)}</div></div><div class="flex flex-col gap-1"><button onclick="app.processReq('${r.id}','cancel_approve')" class="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold">취소 승인</button><button onclick="app.processReq('${r.id}','cancel_reject')" class="bg-white border px-3 py-1.5 rounded text-xs">반려</button></div></div>`).join('') || '<div class="text-center text-gray-400 py-4">요청 없음</div>'}</div></div></div>`;
            const managerQuickAction = app.renderDashboardQuickActions({ includeAnnual: !isEffectiveCEO });
            document.getElementById('app-container').innerHTML = `<div class="w-full max-w-7xl mx-auto px-4 fade-in pt-8 pb-12"><div class="flex justify-between items-center mb-6"><h2 class="text-2xl font-bold">${dashboardTitle}</h2></div>${myStatusCard}${managerQuickAction}<div class="mb-8">${app.renderCal(appData.requests, app.currentUser)}</div>${approvalSection}${myReqsSection}${memberStatusHtml}</div>${app.getModal()}`;
            app.initModal();
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
            const specialLeaveTypes = app.collectSpecialLeaveTypesFromSettings();
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
                app.loadAdminOpsPanelData().finally(() => app.renderMasterPermissionPage());
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
                app.loadAdminOpsPanelData({ silent: true }).finally(() => app.renderMasterPermissionPage());
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
        
        renderUserManagement: () => {
            if (!app.hasUserManagePermission()) {
                alert('구성원 관리 권한이 없습니다.');
                return app.refreshDashboard();
            }
            app.currentView = 'user-management';
            app.renderNav();
            const list = app.getManageScopeUsers();
            document.getElementById('app-container').innerHTML = `<div class="w-full max-w-6xl mx-auto px-4 pt-8 fade-in pb-12">
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                    <h3 class="font-bold text-lg mb-4 text-gray-800">새 직원 등록</h3>
                    <p class="text-xs text-gray-500 mb-3">기존 계정 비밀번호 초기화는 마스터만 가능합니다.</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                        <input id="new-name" placeholder="이름" class="border bg-gray-50 p-2.5 rounded">
                        <select id="new-dept" class="border bg-gray-50 p-2.5 rounded"><option value="매뉴얼팀">매뉴얼팀</option><option value="파츠북팀">파츠북팀</option></select>
                        <input id="new-id" placeholder="ID" class="border bg-gray-50 p-2.5 rounded">
                        <input id="new-pw" placeholder="비번(4자 이상)" class="border bg-gray-50 p-2.5 rounded">
                        <select id="new-role" class="border bg-gray-50 p-2.5 rounded"><option value="employee">직원</option><option value="part_leader">파트리더</option><option value="team_leader">팀리더</option>${app.currentUser.role==='master'?'<option value="ceo">대표</option>':''}</select>
                        <select id="new-rank" class="border bg-gray-50 p-2.5 rounded"><option value="사원">사원</option><option value="대리">대리</option><option value="과장">과장</option><option value="차장">차장</option><option value="부장">부장</option><option value="팀장">팀장</option></select>
                        <input id="new-days" type="number" value="15" class="border bg-gray-50 p-2.5 rounded" placeholder="연차일수">
                        <input id="new-email" placeholder="이메일 주소" class="border bg-gray-50 p-2.5 rounded">
                        <input id="new-emp-no" placeholder="사번" class="border bg-gray-50 p-2.5 rounded">
                        <input id="new-phone" placeholder="전화번호" class="border bg-gray-50 p-2.5 rounded">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <div><label class="block text-[11px] text-gray-500 mb-1">1분기 근무시간</label><select id="new-work-q1" class="border bg-gray-50 p-2.5 rounded w-full">${makeWorkShiftOptions('')}</select></div>
                        <div><label class="block text-[11px] text-gray-500 mb-1">2분기 근무시간</label><select id="new-work-q2" class="border bg-gray-50 p-2.5 rounded w-full">${makeWorkShiftOptions('')}</select></div>
                        <div><label class="block text-[11px] text-gray-500 mb-1">3분기 근무시간</label><select id="new-work-q3" class="border bg-gray-50 p-2.5 rounded w-full">${makeWorkShiftOptions('')}</select></div>
                        <div><label class="block text-[11px] text-gray-500 mb-1">4분기 근무시간</label><select id="new-work-q4" class="border bg-gray-50 p-2.5 rounded w-full">${makeWorkShiftOptions('')}</select></div>
                    </div>
                    <button onclick="app.addUser()" class="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md">등록하기</button>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                    <p class="px-4 pt-3 text-xs text-gray-500">수정 버튼을 누르면 직원 카드가 열립니다. 카드에서 직원 정보와 연차를 수정하세요.</p>
                    <table class="w-full text-left min-w-[1400px]">
                        <thead class="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="p-4 text-sm font-bold text-gray-500">이름</th>
                                <th class="p-4 text-sm font-bold text-gray-500">유형</th>
                                <th class="p-4 text-sm font-bold text-gray-500">부서</th>
                                <th class="p-4 text-sm font-bold text-gray-500">직급</th>
                                <th class="p-4 text-sm font-bold text-gray-500">ID</th>
                                <th class="p-4 text-sm font-bold text-gray-500">사번</th>
                                <th class="p-4 text-sm font-bold text-gray-500">전화번호</th>
                                <th class="p-4 text-sm font-bold text-gray-500">이메일</th>
                                <th class="p-4 text-sm font-bold text-gray-500 text-center">총 연차(일)</th>
                                <th class="p-4 text-sm font-bold text-gray-500">근무시간(분기)</th>
                                ${app.currentUser.role==='master' ? '<th class="p-4 text-sm font-bold text-gray-500 text-center">비밀번호</th>' : ''}
                                <th class="p-4 text-sm font-bold text-gray-500 text-right sticky right-0 bg-gray-50 z-10">관리</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${list.map(u => {
                                const safeId = security.cleanInlineValue(u.id);
                                const workSummary = `<div class="space-y-1 text-xs text-gray-600"><div>1분기: ${app.getWorkShiftText(u.workQ1)}</div><div>2분기: ${app.getWorkShiftText(u.workQ2)}</div><div>3분기: ${app.getWorkShiftText(u.workQ3)}</div><div>4분기: ${app.getWorkShiftText(u.workQ4)}</div></div>`;
                                return `<tr class="hover:bg-gray-50 transition">
                                    <td class="p-4"><span class="font-medium">${u.name}</span></td>
                                    <td class="p-4 text-sm text-gray-600">${app.getRoleLabelKo(u)}</td>
                                    <td class="p-4 text-sm text-gray-600">${u.dept}</td>
                                    <td class="p-4 text-sm text-gray-600">${u.rank || '-'}</td>
                                    <td class="p-4 text-sm text-gray-400 text-xs">${u.id}</td>
                                    <td class="p-4 text-sm text-gray-600">${u.employeeNo || '-'}</td>
                                    <td class="p-4 text-sm text-gray-600">${u.phone || '-'}</td>
                                    <td class="p-4 text-sm text-gray-600">${u.email || '-'}</td>
                                    <td class="p-4 text-center"><span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">${(Number(u.totalHours) || 0) / 8}일</span></td>
                                    <td class="p-4">${workSummary}</td>
                                    ${app.currentUser.role==='master' ? `<td class="p-4 text-center"><span class="text-gray-300 text-xs">****</span></td>` : ''}
                                    <td class="p-4 text-right space-x-1 sticky right-0 bg-white z-10"><button onclick="app.setEditMode('${safeId}')" class="text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded text-xs font-bold border border-indigo-200">수정</button><button onclick="app.deleteUser('${safeId}')" class="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-xs font-bold border border-red-200">삭제</button></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>${app.getModal()}`;
        },
        getModal: () => {
            const timeOpts = makeTimeOptions();
            const outDurationOpts = makeDurationOptions(10);
            const reportDurationOpts = makeDurationOptions(10);
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
                            <div class="grid grid-cols-2 gap-2">
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
            <div id="report-detail-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden justify-center items-start z-50 fade-in overflow-y-auto py-6" onclick="if(event.target===this) app.closeReportDetail()">
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
            if (reportDuration) reportDuration.value = '1';
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
    };

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
        const startHour = parseInt(startEl.value, 10);
        const duration = parseInt(durationEl.value, 10);
        if (!Number.isFinite(startHour) || !Number.isFinite(duration)) {
            preview.innerText = '';
            return;
        }
        const endHour = startHour + duration;
        if (endHour > 24) {
            preview.innerText = '* 종료 시간이 24:00을 넘지 않게 설정해주세요.';
            preview.style.color = '#dc2626';
            return;
        }
        preview.innerText = `${selectedType} 시간: ${formatHour(startHour)} ~ ${formatHour(endHour)} (${duration}시간)`;
        preview.style.color = selectedType === '특근' ? '#be123c' : '#334155';
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
            } else {
                reportStartEl.disabled = false;
                reportStartEl.classList.remove('bg-gray-100', 'text-gray-500');
                if (!reportStartEl.value) reportStartEl.value = '9';
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
    }
    app.init();
