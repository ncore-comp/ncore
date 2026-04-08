"use strict";

Object.assign(app, {
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
        const allowedModes = allModes.filter((mode) => app.getAllowedCalendarModes().includes(mode));
        return `<div class="inline-flex flex-wrap items-end gap-1">${allowedModes.map(mode => {
            const isActive = app.calendarMode===mode;
            const isAllowed = true;
            const baseClass = app.isMobileViewport
                ? 'px-2.5 py-1.5 rounded-t-lg rounded-b-md text-xs font-bold border transition'
                : 'px-3 py-1.5 rounded-t-lg rounded-b-md text-sm font-bold border transition';
            const stateClass = isActive
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-200 relative top-[1px]'
                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200';
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
            validRequests.filter(r => app.requestBelongsToUser(r, viewer)).forEach(pushIfNew);
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
            if (!app.requestBelongsToUser(r, viewer)) return false;
            if (app.isWorkReportRequest(r)) return r.status === 'reported';
            return ['approved', 'cancel_requested'].includes(r.status);
        });
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
    getCalendarSpecialLeaveChipClasses: (color) => {
        const safeColor = security.normalizeSpecialLeaveColor(color);
        if (safeColor === 'rose') return 'bg-rose-50 text-rose-700 border-rose-200';
        if (safeColor === 'sky') return 'bg-sky-50 text-sky-700 border-sky-200';
        if (safeColor === 'emerald') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (safeColor === 'amber') return 'bg-amber-50 text-amber-700 border-amber-200';
        if (safeColor === 'violet') return 'bg-violet-50 text-violet-700 border-violet-200';
        if (safeColor === 'indigo') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        return 'bg-slate-50 text-slate-700 border-slate-200';
    },
    getCalendarSpecialLeaveBarClasses: (color) => {
        const safeColor = security.normalizeSpecialLeaveColor(color);
        if (safeColor === 'rose') return 'bg-rose-400 border-rose-200';
        if (safeColor === 'sky') return 'bg-sky-400 border-sky-200';
        if (safeColor === 'emerald') return 'bg-emerald-400 border-emerald-200';
        if (safeColor === 'amber') return 'bg-amber-400 border-amber-200';
        if (safeColor === 'violet') return 'bg-violet-400 border-violet-200';
        if (safeColor === 'indigo') return 'bg-indigo-400 border-indigo-200';
        return 'bg-slate-400 border-slate-200';
    },
    getCalendarSpecialLeaveDecorations: (viewer, year = app.viewYear, month = app.viewMonth) => {
        const safeViewerId = security.cleanInlineValue(viewer && viewer.id);
        if (!safeViewerId || app.calendarMode !== 'self') {
            return { eventMap: {}, barMap: {} };
        }
        const monthStart = moment({ year, month, day: 1 }).startOf('day');
        const monthEnd = monthStart.clone().endOf('month');
        const today = moment().startOf('day');
        const eventMap = {};
        const barMap = {};
        const entries = app.getUserSpecialLeaveGrantEntries(safeViewerId, {
            enabledOnly: false,
            includeZero: true,
            today: today.format('YYYY-MM-DD')
        }).filter((entry) => entry.grantStatus === 'active' && entry.eventDate);

        entries.forEach((entry) => {
            const eventDate = moment(entry.eventDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
            const usableFrom = moment(entry.usableFromDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');
            const usableTo = moment(entry.usableToDate, ['YYYY-MM-DD', moment.ISO_8601], true).startOf('day');

            if (eventDate.isValid() && eventDate.isSame(monthStart, 'month')) {
                const dateKey = eventDate.format('YYYY-MM-DD');
                if (!eventMap[dateKey]) eventMap[dateKey] = [];
                eventMap[dateKey].push({
                    grantId: entry.grantId,
                    label: entry.label,
                    color: entry.color
                });
            }

            if (!usableFrom.isValid() || !usableTo.isValid() || usableFrom.isAfter(usableTo, 'day')) return;
            const renderStart = moment.max(usableFrom.clone(), monthStart.clone()).startOf('day');
            const renderEnd = moment.min(usableTo.clone(), monthEnd.clone()).startOf('day');
            if (renderStart.isAfter(renderEnd, 'day')) return;

            const cursor = renderStart.clone();
            while (cursor.isSameOrBefore(renderEnd, 'day')) {
                if (cursor.isoWeekday() <= 5) {
                    const dateKey = cursor.format('YYYY-MM-DD');
                    if (!barMap[dateKey]) barMap[dateKey] = [];
                    barMap[dateKey].push({
                        grantId: entry.grantId,
                        label: entry.label,
                        color: entry.color,
                        isStart: cursor.isSame(usableFrom, 'day'),
                        isEnd: cursor.isSame(usableTo, 'day'),
                        isPast: cursor.isBefore(today, 'day'),
                        isToday: cursor.isSame(today, 'day')
                    });
                }
                cursor.add(1, 'day');
            }
        });

        return { eventMap, barMap };
    },
    renderCalendarSpecialLeaveEventChips: (items = [], options = {}) => {
        if (!Array.isArray(items) || !items.length) return '';
        const mobile = !!options.mobile;
        const visibleItems = items.slice(0, mobile ? 1 : 2);
        const moreCount = items.length - visibleItems.length;
        return `<div class="px-1 mb-1 space-y-1">
            ${visibleItems.map((item) => `<div class="text-[10px] px-1.5 py-0.5 rounded border truncate ${app.getCalendarSpecialLeaveChipClasses(item.color)}">+ ${item.label} 발생</div>`).join('')}
            ${moreCount > 0 ? `<div class="text-[10px] font-bold text-gray-400 px-1">+${moreCount}건</div>` : ''}
        </div>`;
    },
    renderCalendarSpecialLeaveBars: (items = []) => {
        if (!Array.isArray(items) || !items.length) return '';
        const visibleItems = items.slice(0, 2);
        const moreCount = items.length - visibleItems.length;
        return `<div class="px-1 mt-1 space-y-1">
            ${visibleItems.map((item) => {
                const baseClass = app.getCalendarSpecialLeaveBarClasses(item.color);
                const radiusClass = item.isStart && item.isEnd
                    ? 'rounded-full'
                    : (item.isStart ? 'rounded-l-full' : (item.isEnd ? 'rounded-r-full' : ''));
                const opacityClass = item.isToday ? 'opacity-100' : (item.isPast ? 'opacity-80' : 'opacity-35');
                return `<div class="h-1.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                    <div class="h-full ${baseClass.split(' ')[0]} ${radiusClass} ${opacityClass}" style="width:100%"></div>
                </div>`;
            }).join('')}
            ${moreCount > 0 ? `<div class="text-[10px] font-bold text-gray-400 px-0.5">+${moreCount}건</div>` : ''}
        </div>`;
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
    handleCalendarDateDoubleClick: (dateStr) => {
        if (!app.canUseCalendarClickRequest()) return;
        const result = app.canOpenCalendarRequestOnDate(dateStr);
        if (!result.ok) {
            alert(result.message);
            return;
        }
        app.openRequestModal(result.dateStr);
    },
    renderCal: (requests, viewer) => {
        const year = app.viewYear, month = app.viewMonth, today = moment().startOf('day');
        const calendarData = app.buildMonthlyCalendarData(requests, viewer, year, month);
        const specialLeaveDecorations = app.getCalendarSpecialLeaveDecorations(viewer, year, month);
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
            const specialGrantEvents = specialLeaveDecorations.eventMap[dateStr] || [];
            const specialGrantBars = specialLeaveDecorations.barMap[dateStr] || [];
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
            const specialLeaveDecorationHtml = `${app.renderCalendarSpecialLeaveEventChips(specialGrantEvents, { mobile: app.isMobileViewport })}${app.renderCalendarSpecialLeaveBars(specialGrantBars)}`;
            const hasSpecialLeaveDecoration = !!specialLeaveDecorationHtml;
            const specialLeaveBottomHtml = hasSpecialLeaveDecoration
                ? `<div class="absolute left-1 right-1 bottom-1 z-[2] ${applyShading ? 'opacity-60 grayscale' : ''}">${specialLeaveDecorationHtml}</div>`
                : '';
            const eventBody = app.isMobileViewport
                ? `<div class="${applyShading ? 'opacity-60 grayscale' : ''} ${hasSpecialLeaveDecoration ? 'pb-10' : ''}">${app.renderMobileCalendarDaySummary(evts)}</div>`
                : `<div class="px-1 ${applyShading ? 'opacity-60 grayscale' : ''} ${hasSpecialLeaveDecoration ? 'pb-10' : ''}">${evtHtml ? `<div class="grid grid-cols-2 gap-1 overflow-y-auto max-h-[82px] custom-scrollbar">${evtHtml}</div>` : ''}</div>`;
            html += `<div class="calendar-cell hover:bg-gray-50 ${applyShading ? 'bg-gray-50' : ''} ${todayClass} ${selectedClass}" data-cal-date="${dateStr}" ${clickAttr} ${dblClickAttr} ${hoverAttrs}><div class="flex justify-between items-start mb-1 ${applyShading ? 'opacity-40' : ''}"><span class="text-sm font-bold ml-1 mt-1 ${isToday?'today-circle':(isRed?'holiday-text':(isSat?'sat-text':'text-gray-700'))}">${d}</span>${holName ? `<span class="text-[10px] text-white bg-red-400 px-1 rounded truncate max-w-[60px]">${holName}</span>` : ''}</div>${eventBody}${specialLeaveBottomHtml}</div>`;
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
});
