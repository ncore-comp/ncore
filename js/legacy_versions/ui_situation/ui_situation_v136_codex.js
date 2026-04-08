"use strict";

Object.assign(app, {
    getSituationBoardSeatAbsentMemberUser: (item) => {
        const users = Array.isArray(appData.users) ? appData.users : [];
        const requestUserId = String(item?.request?.userId || '').trim();
        const userName = String(item?.userName || '').trim();
        return users.find((user) => String(user.id) === requestUserId)
            || users.find((user) => String(user.name || '').trim() === userName)
            || null;
    },
    renderSituationBoardSeatAbsentMemberCard: (item) => {
        const user = app.getSituationBoardSeatAbsentMemberUser(item);
        const titleText = user ? app.getUserTitleText(user) : '';
        const totalHours = Number(user?.totalHours || 0);
        const usedHours = Number(user?.usedHours || 0);
        const remainingHours = Math.max(totalHours - usedHours, 0);
        const percent = user ? app.getUsageGaugePercent(usedHours, totalHours) : 0;
        const percentText = percent.toFixed(0).replace(/\.0$/, '');
        const gaugeWidth = percent <= 0 ? '0%' : (percent < 3 ? '3%' : `${percent}%`);
        const remainMarkup = user
            ? `<div class="flex min-w-[120px] flex-col items-end text-right shrink-0"><div class="text-sm font-bold text-indigo-600">${app.fmtTime(remainingHours)} 남음</div><div class="text-[10px] text-gray-400 mt-0.5">/ 총 ${app.fmtTime(totalHours)}</div></div>`
            : '';
        const gaugeMarkup = user
            ? `<div class="mt-3 flex items-center gap-2"><div class="h-2.5 flex-1 rounded-full bg-slate-100 border border-slate-200 overflow-hidden"><div class="h-full rounded-full bg-indigo-500 transition-all duration-300" style="width:${gaugeWidth}; ${percent <= 0 ? 'display:none;' : ''}"></div></div><div class="text-[10px] font-bold text-gray-400 min-w-[28px] text-right">${percentText}%</div></div>`
            : '';
        const timeDetail = item.timeRange
            ? `<div class="mt-1 text-sm text-gray-500">${item.timeRange}</div>`
            : '';
        return `<div class="bg-white border border-white/50 rounded-lg p-3 shadow-sm transition"><div class="flex justify-between items-start gap-3"><div class="min-w-0 flex-1 pr-2"><div class="flex items-center gap-2 min-w-0"><div class="font-bold text-gray-800 truncate">${item.userName}${titleText ? ` <span class="text-xs text-gray-500">(${titleText})</span>` : ''}</div></div><div class="mt-1 text-xs text-gray-500">${item.dept}</div>${timeDetail}</div>${remainMarkup}</div>${gaugeMarkup}</div>`;
    },
    renderSituationBoardSeatMapModalContent: (dateStr) => {
        const safeDate = security.normalizeDate(dateStr, '');
        const title = safeDate ? app.fmtDate(safeDate) : '날짜 선택';
        const seats = app.getSituationBoardSeatMapSeats();
        const statusMap = app.getSituationBoardSeatStatusMap(safeDate);
        const absentTypeGroups = app.getSituationBoardSeatAbsentTypeGroups(safeDate);
        const dailyAbsentItems = absentTypeGroups
            .map((typeGroup) => {
                const isExpanded = app.isSituationBoardAbsentTypeExpanded(safeDate, typeGroup.typeKey);
                const encodedTypeKey = encodeURIComponent(typeGroup.typeKey);
                const itemMarkup = isExpanded
                    ? `<div class="mt-3 space-y-2">${typeGroup.items.map((item) => app.renderSituationBoardSeatAbsentMemberCard(item)).join('')}</div>`
                    : '';
                return `<div class="rounded-2xl border border-gray-200 bg-gray-50/80 overflow-hidden"><button type="button" class="w-full px-3 py-3 text-left hover:bg-white/70 transition" onclick="app.toggleSituationBoardAbsentTypeGroup('${safeDate}','${encodedTypeKey}')"><div class="flex items-center justify-between gap-3"><div class="min-w-0"><div class="font-bold text-gray-900">${typeGroup.typeLabel}</div><div class="mt-1 text-xs text-gray-500">${typeGroup.items.length}명</div></div><div class="flex items-center gap-2 shrink-0"><span class="px-2.5 py-1 rounded-full text-xs font-bold border ${typeGroup.toneClass}">${typeGroup.typeLabel}</span><span class="text-sm font-black text-gray-400">${isExpanded ? '-' : '+'}</span></div></div></button>${itemMarkup}</div>`;
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
    }
});
