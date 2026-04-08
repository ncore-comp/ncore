"use strict";

Object.assign(app, {
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
});
