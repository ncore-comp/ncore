"use strict";

Object.assign(app, {
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
        addWeekdaysExcludingEventDate: (eventDate, weekdayCount, direction) => {
            const safeEventDate = security.normalizeDate(eventDate, '');
            const safeCount = Math.max(0, Number(weekdayCount || 0));
            const safeDirection = String(direction || '').trim().toLowerCase();
            if (!safeEventDate || !safeCount || !['before', 'after'].includes(safeDirection)) return '';
            const cursor = moment.utc(safeEventDate, 'YYYY-MM-DD', true);
            if (!cursor.isValid()) return '';
            let moved = 0;
            while (moved < safeCount) {
                cursor.add(safeDirection === 'before' ? -1 : 1, 'day');
                if (cursor.isoWeekday() <= 5) moved += 1;
            }
            return cursor.format('YYYY-MM-DD');
        },
        countWeekdaysBetweenInclusive: (startDate, endDate) => {
            const start = moment.utc(security.normalizeDate(startDate, ''), 'YYYY-MM-DD', true);
            const end = moment.utc(security.normalizeDate(endDate, ''), 'YYYY-MM-DD', true);
            if (!start.isValid() || !end.isValid() || start.isAfter(end)) return 0;
            let count = 0;
            const cursor = start.clone();
            while (!cursor.isAfter(end)) {
                if (cursor.isoWeekday() <= 5) count += 1;
                cursor.add(1, 'day');
            }
            return count;
        },
        getSpecialLeaveExpiryRule: (typeKey) => {
            const meta = app.getSpecialLeaveTypeMeta(typeKey);
            const dayCountMode = security.normalizeSpecialLeaveDayCountMode(meta && meta.dayCountMode);
            const expiryDirection = String(meta && meta.expiryDirection || '').trim().toLowerCase();
            const expiryDays = Math.max(0, Number(meta && meta.expiryDays || 0));
            if (dayCountMode !== 'business_days' || !['before', 'after', 'both'].includes(expiryDirection) || expiryDays <= 0) {
                return {
                    applies: false,
                    expiryBasis: '',
                    expiryDirection: '',
                    expiryDays: 0
                };
            }
            return {
                applies: true,
                expiryBasis: 'event_date',
                expiryDirection,
                expiryDays
            };
        },
        getSpecialLeaveUsableWindow: (grantLike = {}, typeMeta = null) => {
            const eventDate = security.normalizeDate(grantLike.eventDate, '');
            const meta = typeMeta || app.getSpecialLeaveTypeMeta(grantLike.typeKey);
            const rule = app.getSpecialLeaveExpiryRule(meta && meta.typeKey ? meta.typeKey : grantLike.typeKey);
            if (!eventDate || !rule.applies) {
                return {
                    usableFromDate: security.normalizeDate(grantLike.usableFromDate, ''),
                    usableToDate: security.normalizeDate(grantLike.usableToDate, '')
                };
            }
            if (rule.expiryDirection === 'before') {
                return {
                    usableFromDate: app.addWeekdaysExcludingEventDate(eventDate, rule.expiryDays, 'before'),
                    usableToDate: app.addWeekdaysExcludingEventDate(eventDate, 1, 'before')
                };
            }
            if (rule.expiryDirection === 'after') {
                return {
                    usableFromDate: app.addWeekdaysExcludingEventDate(eventDate, 1, 'after'),
                    usableToDate: app.addWeekdaysExcludingEventDate(eventDate, rule.expiryDays, 'after')
                };
            }
            return {
                usableFromDate: app.addWeekdaysExcludingEventDate(eventDate, rule.expiryDays, 'before'),
                usableToDate: app.addWeekdaysExcludingEventDate(eventDate, rule.expiryDays, 'after')
            };
        },
        getSpecialLeaveGrantEntryById: (grantId) => {
            const safeGrantId = security.cleanInlineValue(grantId);
            return (Array.isArray(appData.userSpecialLeaves) ? appData.userSpecialLeaves : [])
                .map((item) => security.sanitizeUserSpecialLeave(item))
                .find((item) => String(item.grantId || item.id) === String(safeGrantId)) || null;
        },
        getUserSpecialLeaveGrantEntries: (userId, options = {}) => {
            const safeUserId = security.cleanInlineValue(userId);
            const enabledOnly = !!options.enabledOnly;
            const includeZero = !!options.includeZero;
            const today = security.normalizeDate(options.today, moment().format('YYYY-MM-DD'));
            const grants = (Array.isArray(appData.userSpecialLeaves) ? appData.userSpecialLeaves : [])
                .map((item) => security.sanitizeUserSpecialLeave(item))
                .filter((item) => String(item.userId) === String(safeUserId))
                .filter((item) => item.typeKey);
            const requestList = Array.isArray(appData.requests) ? appData.requests : [];
            return grants
                .map((grant) => {
                    const meta = app.getSpecialLeaveTypeMeta(grant.typeKey);
                    if (!meta) return null;
                    if (enabledOnly && !meta.enabled) return null;
                    const relatedRequests = requestList.filter((req) => {
                        if (String(req.userId) !== String(safeUserId)) return false;
                        if (security.cleanInlineValue(req.specialLeaveGrantId || '') === String(grant.grantId)) return true;
                        return !req.specialLeaveGrantId && security.normalizeSpecialLeaveTypeKey(req.specialLeaveTypeKey) === grant.typeKey && String(grant.grantId).endsWith(`__${grant.typeKey}`);
                    });
                    let approvedRequestHours = 0;
                    let pendingHours = 0;
                    relatedRequests.forEach((req) => {
                        const hours = Number(req.hours || 0);
                        if (['approved', 'cancel_requested'].includes(req.status)) approvedRequestHours += hours;
                        else if (req.status === 'pending') pendingHours += hours;
                    });
                    const grantedHours = Number((grant.grantedHours ?? grant.totalHours) || 0);
                    const manualUsedHours = Number(grant.usedHours || 0);
                    const totalUsedHours = manualUsedHours + approvedRequestHours;
                    const availableHours = grantedHours - totalUsedHours - pendingHours;
                    const remainingHours = grantedHours - totalUsedHours;
                    const expiryRule = app.getSpecialLeaveExpiryRule(grant.typeKey);
                    const window = app.getSpecialLeaveUsableWindow(grant, meta);
                    const missingEventDate = expiryRule.applies && !grant.eventDate;
                    const isExpired = !!(window.usableToDate && today > window.usableToDate && availableHours > 0);
                    const requiredUseDays = availableHours > 0 ? Math.max(1, Math.ceil(availableHours / 8)) : 0;
                    const remainingWeekdaysUntilExpiry = window.usableToDate
                        ? app.countWeekdaysBetweenInclusive(today, window.usableToDate)
                        : 0;
                    const shouldWarn = availableHours > 0 && !!window.usableToDate && remainingWeekdaysUntilExpiry > 0 && remainingWeekdaysUntilExpiry <= requiredUseDays;
                    const grantStatus = availableHours <= 0
                        ? 'consumed'
                        : (grant.grantStatus === 'inactive' || missingEventDate
                            ? 'inactive'
                            : (isExpired ? 'expired' : 'active'));
                    return {
                        ...meta,
                        ...grant,
                        grantId: grant.grantId || `${safeUserId}__${grant.typeKey}`,
                        userId: safeUserId,
                        grantedHours,
                        totalHours: grantedHours,
                        manualUsedHours,
                        approvedRequestHours,
                        pendingHours,
                        usedHours: totalUsedHours,
                        remainingHours,
                        availableHours,
                        usableFromDate: window.usableFromDate,
                        usableToDate: window.usableToDate,
                        requiredUseDays,
                        remainingWeekdaysUntilExpiry,
                        shouldWarn,
                        isExpired,
                        grantStatus,
                        granted: grantedHours > 0 || totalUsedHours > 0 || pendingHours > 0,
                        canRequest: grantStatus === 'active' && availableHours > 0
                    };
                })
                .filter(Boolean)
                .filter((item) => includeZero || item.granted)
                .sort((a, b) =>
                    String(a.usableToDate || '9999-12-31').localeCompare(String(b.usableToDate || '9999-12-31')) ||
                    String(a.eventDate || '9999-12-31').localeCompare(String(b.eventDate || '9999-12-31')) ||
                    String(a.label || '').localeCompare(String(b.label || ''), 'ko')
                );
        },
        getSpecialLeaveLoginPopupSummary: (userId, options = {}) => {
            const today = security.normalizeDate(options.today, moment().format('YYYY-MM-DD'));
            const entries = app.getUserSpecialLeaveGrantEntries(userId, { enabledOnly: false, includeZero: true, today });
            const expired = entries.filter((item) => item.grantStatus === 'expired' && Number(item.availableHours || 0) > 0);
            const warning = entries.filter((item) => item.grantStatus === 'active' && item.shouldWarn);
            return { today, expired, warning };
        },
        getSpecialRequestOptionValue: (grantId) => `specialgrant:${security.cleanInlineValue(grantId)}`,
        parseRequestTypeSelection: (value) => {
            const raw = String(value || '').trim();
            if (raw.startsWith('specialgrant:')) {
                const grantId = security.cleanInlineValue(raw.slice('specialgrant:'.length));
                const grant = app.getSpecialLeaveGrantEntryById(grantId);
                const meta = grant ? app.getSpecialLeaveTypeMeta(grant.typeKey) : null;
                return {
                    uiValue: app.getSpecialRequestOptionValue(grantId),
                    baseType: '연차',
                    isSpecial: true,
                    specialLeaveGrantId: grantId,
                    specialLeaveTypeKey: grant ? grant.typeKey : '',
                    specialLeaveTypeLabel: meta ? meta.label : '',
                    specialLeaveEventDate: grant ? security.normalizeDate(grant.eventDate, '') : '',
                    requestMode: security.normalizeSpecialLeaveRequestMode(meta && meta.requestMode),
                    grantHours: Number(meta && meta.grantHours || 0),
                    allowHolidayRequest: !!(meta && meta.allowHolidayRequest),
                    dayCountMode: security.normalizeSpecialLeaveDayCountMode(meta && meta.dayCountMode)
                };
            }
            if (raw.startsWith('special:')) {
                const typeKey = security.normalizeSpecialLeaveTypeKey(raw.slice('special:'.length));
                const meta = app.getSpecialLeaveTypeMeta(typeKey);
                return {
                    uiValue: raw,
                    baseType: '연차',
                    isSpecial: true,
                    specialLeaveGrantId: '',
                    specialLeaveTypeKey: typeKey,
                    specialLeaveTypeLabel: meta ? meta.label : '',
                    specialLeaveEventDate: '',
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
                specialLeaveGrantId: '',
                specialLeaveTypeKey: '',
                specialLeaveTypeLabel: '',
                specialLeaveEventDate: '',
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
        getCurrentRequestDateRange: () => {
            const startDate = security.normalizeDate(document.getElementById('req-start-date')?.value, '');
            const endDate = security.normalizeDate(document.getElementById('req-end-date')?.value, startDate || '');
            return {
                startDate,
                endDate: endDate || startDate || ''
            };
        },
        getRequestEditSelectionValue: (req) => {
            if (app.isSpecialLeaveRequest(req)) {
                if (req.specialLeaveGrantId) return app.getSpecialRequestOptionValue(req.specialLeaveGrantId);
                return `special:${security.normalizeSpecialLeaveTypeKey(req.specialLeaveTypeKey)}`;
            }
            return security.normalizeType((req && req.type) || '연차');
        },
        getUserSpecialLeaveEntries: (userId, options = {}) => {
            const safeUserId = security.cleanInlineValue(userId);
            const includeZero = !!options.includeZero;
            const enabledOnly = !!options.enabledOnly;
            const grantEntries = app.getUserSpecialLeaveGrantEntries(safeUserId, { enabledOnly, includeZero: true, today: options.today });
            const grouped = new Map();
            grantEntries.forEach((grant) => {
                if (grant.grantStatus === 'consumed' || grant.grantStatus === 'expired' || grant.grantStatus === 'inactive') return;
                const key = grant.typeKey;
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        ...grant,
                        totalHours: 0,
                        manualUsedHours: 0,
                        requestUsedHours: 0,
                        pendingHours: 0,
                        usedHours: 0,
                        remainingHours: 0,
                        availableHours: 0,
                        granted: false,
                        note: '',
                        grantCount: 0,
                        displayUsableFromDate: '',
                        displayUsableToDate: '',
                        mixedUsableWindow: false,
                        usableWindowCount: 0
                    });
                }
                const entry = grouped.get(key);
                entry.totalHours += Number(grant.totalHours || 0);
                entry.manualUsedHours += Number(grant.manualUsedHours || 0);
                entry.requestUsedHours += Number(grant.approvedRequestHours || 0);
                entry.pendingHours += Number(grant.pendingHours || 0);
                entry.usedHours += Number(grant.usedHours || 0);
                entry.remainingHours += Number(grant.remainingHours || 0);
                entry.availableHours += Number(grant.availableHours || 0);
                entry.granted = entry.totalHours > 0 || entry.usedHours > 0 || entry.pendingHours > 0;
                entry.grantCount += 1;
                if (grant.usableFromDate && grant.usableToDate) {
                    entry.usableWindowCount += 1;
                    if (!entry.displayUsableFromDate && !entry.displayUsableToDate) {
                        entry.displayUsableFromDate = grant.usableFromDate;
                        entry.displayUsableToDate = grant.usableToDate;
                    } else if (
                        entry.displayUsableFromDate !== grant.usableFromDate ||
                        entry.displayUsableToDate !== grant.usableToDate
                    ) {
                        entry.mixedUsableWindow = true;
                    }
                }
            });
            return [...grouped.values()]
                .map((item) => ({
                    ...item,
                    usableWindowText: item.usableWindowCount <= 0
                        ? ''
                        : (item.mixedUsableWindow
                            ? `사용 가능 기간 상이 (${item.usableWindowCount}건)`
                            : `${item.displayUsableFromDate} ~ ${item.displayUsableToDate}`)
                }))
                .filter((item) => includeZero || item.granted);
        },
        getAvailableSpecialLeaveGrantEntries: (userId, options = {}) => {
            const includeGrantId = security.cleanInlineValue(options.includeGrantId);
            const targetDate = security.normalizeDate(options.dateStr, '');
            const targetEndDate = security.normalizeDate(options.endDateStr, targetDate || '');
            return app.getUserSpecialLeaveGrantEntries(userId, { enabledOnly: false, includeZero: false, today: options.today })
                .filter((item) => item.granted)
                .filter((item) => item.canRequest || item.grantId === includeGrantId)
                .filter((item) => {
                    if (!targetDate) return true;
                    const rangeEnd = targetEndDate || targetDate;
                    if (item.grantId === includeGrantId && !options.strictDateFilter) return true;
                    if (!item.usableFromDate || !item.usableToDate) return false;
                    return targetDate >= item.usableFromDate && rangeEnd <= item.usableToDate;
                });
        },
        getRequestTypeOptions: (selectedValue = '연차', options = {}) => {
            const safeSelected = String(selectedValue || '연차');
            const requestUser = app.getRequestModalTargetUser();
            const dateRange = {
                startDate: security.normalizeDate(options.dateStr, app.getCurrentRequestDateRange().startDate),
                endDate: security.normalizeDate(options.endDateStr, app.getCurrentRequestDateRange().endDate)
            };
            const regularOptions = [
                { value: '연차', label: '연차' },
                { value: '반차(오전)', label: '반차 (4시간/오전)' },
                { value: '반차(오후)', label: '반차 (4시간/오후)' },
                { value: '시간차(퇴근)', label: '시간차(퇴근)' },
                { value: '시간차(외출)', label: '시간차(외출)' }
            ];
            const selection = app.parseRequestTypeSelection(safeSelected);
            if (selection.isSpecial && !selection.specialLeaveGrantId && requestUser) {
                const sameTypeGrants = app.getAvailableSpecialLeaveGrantEntries(requestUser.id, {
                    dateStr: dateRange.startDate,
                    endDateStr: dateRange.endDate
                })
                    .filter((item) => item.typeKey === selection.specialLeaveTypeKey);
                if (sameTypeGrants.length === 1) {
                    selection.specialLeaveGrantId = sameTypeGrants[0].grantId;
                    selection.specialLeaveEventDate = sameTypeGrants[0].eventDate || '';
                }
            }
            const specialOptions = requestUser
                ? app.getAvailableSpecialLeaveGrantEntries(requestUser.id, {
                    dateStr: dateRange.startDate,
                    endDateStr: dateRange.endDate
                }).map((entry) => ({
                    value: app.getSpecialRequestOptionValue(entry.grantId),
                    label: `특별휴가(${entry.label} / 발생일 ${entry.eventDate || '-'})`
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
            const allOptions = [...regularOptions, ...specialOptions, ...workReportOptions];
            const optionValues = new Set(allOptions.map((option) => option.value));
            const resolvedValue = optionValues.has(safeSelected)
                ? safeSelected
                : (allOptions[0]?.value || '연차');
            return {
                options: allOptions,
                resolvedValue
            };
        },
        getRequestTypeOptionsHtml: (selectedValue = '연차', options = {}) => {
            const payload = app.getRequestTypeOptions(selectedValue, options);
            return payload.options
                .map((option) => `<option value="${option.value}" ${option.value === payload.resolvedValue ? 'selected' : ''}>${option.label}</option>`)
                .join('');
        },
        refreshRequestTypeOptions: (selectedValue = '', options = {}) => {
            const selectEl = document.getElementById('req-type');
            if (!selectEl) return;
            const nextValue = String(selectedValue || selectEl.value || '연차');
            const payload = app.getRequestTypeOptions(nextValue, options);
            selectEl.innerHTML = payload.options
                .map((option) => `<option value="${option.value}" ${option.value === payload.resolvedValue ? 'selected' : ''}>${option.label}</option>`)
                .join('');
            selectEl.value = payload.resolvedValue;
            return payload.resolvedValue;
        },
        getRequestBucketSummary: (user, selection, editingReq = null) => {
            if (!user) {
                return { ok: false, availableHours: 0, message: '사용자 정보가 없습니다.' };
            }
            if (selection && ['잔업', '특근'].includes(selection.baseType)) {
                return { ok: true, availableHours: Number.MAX_SAFE_INTEGER, bucket: 'report', label: selection.baseType };
            }
            if (selection && selection.isSpecial) {
                let grantEntry = app.getUserSpecialLeaveGrantEntries(user.id, { enabledOnly: false, includeZero: true })
                    .find((item) => item.grantId === selection.specialLeaveGrantId);
                if (!grantEntry && selection.specialLeaveTypeKey) {
                    const sameTypeEntries = app.getUserSpecialLeaveGrantEntries(user.id, { enabledOnly: false, includeZero: true })
                        .filter((item) => item.typeKey === selection.specialLeaveTypeKey);
                    if (sameTypeEntries.length === 1) {
                        grantEntry = sameTypeEntries[0];
                    }
                }
                if (!grantEntry || !grantEntry.granted) {
                    return { ok: false, availableHours: 0, message: '부여된 특별연차가 아닙니다.' };
                }
                let availableHours = Number(grantEntry.availableHours || 0);
                if (
                    editingReq &&
                    editingReq.status === 'pending' &&
                    security.cleanInlineValue(editingReq.specialLeaveGrantId || '') === selection.specialLeaveGrantId
                ) {
                    availableHours += Number(editingReq.hours || 0);
                }
                return {
                    ok: true,
                    bucket: 'special',
                    availableHours,
                    label: grantEntry.label || selection.specialLeaveTypeLabel || '특별연차',
                    grantId: grantEntry.grantId,
                    eventDate: grantEntry.eventDate || ''
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
                        ${entry.usableWindowText ? `<div class="mt-0.5 text-[10px] text-gray-500 truncate">사용 가능 기간 ${entry.usableWindowText}</div>` : ''}
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
                    ${entry.usableWindowText ? `<div class="mt-1 text-[11px] text-gray-500">사용 가능 기간 ${entry.usableWindowText}</div>` : ''}
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
            return { absent: true, category };
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
        calcTimeOffOutEndHour: (startHour, durationHour, shiftEndHour = 18) => {
            const safeStart = Number(startHour);
            const safeDuration = Number(durationHour);
            const safeShiftEnd = Number(shiftEndHour);
            if (!Number.isFinite(safeStart) || !Number.isFinite(safeDuration) || !Number.isFinite(safeShiftEnd)) return null;
            if (safeDuration <= 0) return null;
            let end = safeStart;
            let remain = safeDuration;
            while (remain > 0) {
                if (end !== 12) remain--;
                end++;
                if (end >= safeShiftEnd) return null;
            }
            return end;
        },
        getTimeOffOutValidation: (user, dateStr, startHour, durationHour) => {
            const shift = app.getWorkShiftRangeForDate(user, dateStr);
            const safeStart = Number(startHour);
            const safeDuration = Number(durationHour);
            if (!Number.isFinite(safeStart) || !Number.isFinite(safeDuration) || safeDuration <= 0) {
                return {
                    valid: false,
                    reason: 'invalid_input',
                    shiftStartHour: shift.startHour,
                    shiftEndHour: shift.endHour,
                    endHour: null
                };
            }
            if (safeStart < shift.startHour) {
                return {
                    valid: false,
                    reason: 'before_shift_start',
                    shiftStartHour: shift.startHour,
                    shiftEndHour: shift.endHour,
                    endHour: null
                };
            }
            const endHour = app.calcTimeOffOutEndHour(safeStart, safeDuration, shift.endHour);
            if (!Number.isFinite(endHour)) {
                return {
                    valid: false,
                    reason: 'at_or_after_shift_end',
                    shiftStartHour: shift.startHour,
                    shiftEndHour: shift.endHour,
                    endHour: null
                };
            }
            return {
                valid: true,
                reason: '',
                shiftStartHour: shift.startHour,
                shiftEndHour: shift.endHour,
                startHour: safeStart,
                durationHour: safeDuration,
                endHour
            };
        },
        getTimeOffOutStartHourCandidates: (user, dateStr, durationHour) => {
            const shift = app.getWorkShiftRangeForDate(user, dateStr);
            const candidates = [];
            for (let hour = shift.startHour; hour < shift.endHour; hour++) {
                const validation = app.getTimeOffOutValidation(user, dateStr, hour, durationHour);
                if (validation.valid) candidates.push(hour);
            }
            return candidates;
        },
        syncTimeOffOutOptions: () => {
            const startEl = document.getElementById('req-start-time-out');
            const durationEl = document.getElementById('req-duration-out');
            const startDateEl = document.getElementById('req-start-date');
            const previewEl = document.getElementById('req-out-preview');
            if (!startEl || !durationEl) return;
            const requestUser = app.getRequestModalTargetUser() || app.currentUser;
            const dateStr = security.normalizeDate(startDateEl?.value, moment().format('YYYY-MM-DD'));
            const duration = parseInt(durationEl.value, 10);
            const candidates = app.getTimeOffOutStartHourCandidates(requestUser, dateStr, duration);
            const previousValue = String(startEl.value || '');
            if (!candidates.length) {
                startEl.innerHTML = '<option value="">선택 불가</option>';
                startEl.value = '';
                if (previewEl) {
                    const shift = app.getWorkShiftRangeForDate(requestUser, dateStr);
                    previewEl.innerText = `* ${String(shift.startHour).padStart(2, '0')}:00 ~ ${String(shift.endHour).padStart(2, '0')}:00 근무 안에서 가능한 시작 시간이 없습니다.`;
                    previewEl.style.color = '#dc2626';
                }
                return;
            }
            startEl.innerHTML = candidates.map((hour) => {
                const label = `${String(hour).padStart(2, '0')}:00`;
                return `<option value="${hour}">${label}</option>`;
            }).join('');
            if (candidates.some((hour) => String(hour) === previousValue)) startEl.value = previousValue;
            else startEl.value = String(candidates[0]);
        },
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
            if (type === '시간차(외출)') {
                app.syncTimeOffOutOptions();
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
        canReadBoard: () => {
            if (!app.currentUser) return false;
            if (!app.isBoardFeatureEnabled()) return false;
            const perms = app.getCurrentPermissions();
            return !!perms.boardRead;
        },
        canWriteBoard: () => {
            if (!app.currentUser) return false;
            if (!app.canReadBoard()) return false;
            if (app.currentUser.role === 'master') return true;
            const perms = app.getCurrentPermissions();
            return !!perms.boardWrite;
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
        getApproverUser: (requester = app.currentUser) => {
            if (!requester) return null;
            if (requester.role === 'master') return null;

            const candidates = appData.users.filter(u => String(u.id) !== String(requester.id));
            const ceoUser = candidates.find(u => u.role === 'ceo') || null;

            if (requester.role === 'team_leader') {
                if (ceoUser) return ceoUser;
                return appData.users.find(u => u.role === 'master') || null;
            }

            if (requester.role === 'employee' || requester.role === 'part_leader') {
                const deptLeader = candidates.find(u => u.role === 'team_leader' && u.dept === requester.dept);
                if (deptLeader) return deptLeader;
                if (ceoUser) return ceoUser;
                return appData.users.find(u => u.role === 'master') || null;
            }

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
        logUserAction: async (logType, detail = '') => {
            if (!app.currentUser) return;
            await db.logAccess({
                userId: app.currentUser.id,
                userName: app.currentUser.name,
                logType,
                detail
            });
        },
});

