"use strict";

Object.assign(app, {
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

        const history = appData.requests.filter(r => app.requestBelongsToUser(r, u) && ['approved', 'cancel_requested'].includes(r.status)).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
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
    getMemberCardSpecialLeaveHistoryEntries: (userId) => {
        const safeUserId = security.cleanInlineValue(userId);
        return app.getUserSpecialLeaveGrantEntries(safeUserId, { enabledOnly: false, includeZero: true })
            .filter((entry) => ['consumed', 'expired'].includes(String(entry.grantStatus || '')))
            .sort((a, b) =>
                String(b.eventDate || '').localeCompare(String(a.eventDate || '')) ||
                String(b.usableToDate || '').localeCompare(String(a.usableToDate || '')) ||
                String(a.label || '').localeCompare(String(b.label || ''), 'ko')
            );
    },
    renderMemberCardSpecialLeaveHistory: (member) => {
        const entries = app.getMemberCardSpecialLeaveHistoryEntries(member && member.id);
        if (!entries.length) return '';
        return `
            <div class="mt-6 pt-5 border-t border-gray-100">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <div class="text-sm font-bold text-gray-800">소진/소멸 특별연차 이력</div>
                        <div class="text-xs text-gray-400 mt-0.5">모두 사용했거나 소멸된 특별연차 내역입니다.</div>
                    </div>
                    <div class="text-xs font-bold text-gray-400">${entries.length}건</div>
                </div>
                <div class="space-y-2">
                    ${entries.map((entry) => {
                        const colorClass = app.getSpecialLeaveColorClasses(entry.color);
                        const percent = app.getUsageGaugePercent(entry.usedHours, entry.totalHours);
                        const percentText = percent.toFixed(0).replace(/\.0$/, '');
                        const gaugeWidth = percent <= 0 ? '0%' : (percent < 2 ? '2%' : `${percent}%`);
                        const statusText = entry.grantStatus === 'expired' ? '소멸' : '사용 완료';
                        const statusClass = entry.grantStatus === 'expired'
                            ? 'text-red-600 bg-red-50 border-red-200'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200';
                        const subText = entry.grantStatus === 'expired'
                            ? `사용 ${app.fmtTime(entry.usedHours)} / 총 ${app.fmtTime(entry.totalHours)} · 미사용 ${app.fmtTime(entry.availableHours)} 소멸`
                            : `사용 ${app.fmtTime(entry.usedHours)} / 총 ${app.fmtTime(entry.totalHours)}`;
                        const periodText = entry.usableFromDate && entry.usableToDate
                            ? `사용 가능: ${entry.usableFromDate} ~ ${entry.usableToDate}`
                            : '';
                        return `<div class="rounded-xl border px-4 py-3 ${colorClass}">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <div class="text-sm font-bold text-gray-800 break-words">+ ${entry.label}</div>
                                    <div class="text-xs text-gray-500 mt-1">발생일 ${entry.eventDate || '-'}</div>
                                </div>
                                <div class="shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass}">${statusText}</div>
                            </div>
                            <div class="mt-2 text-[11px] font-bold text-gray-500">${subText}</div>
                            ${periodText ? `<div class="mt-1 text-[11px] text-gray-400">${periodText}</div>` : ''}
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
                    }).join('')}
                </div>
            </div>
        `;
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
        const specialLeaveHistory = app.renderMemberCardSpecialLeaveHistory(member);
        bodyEl.innerHTML = `
            <div class="mb-3">
                <div class="text-lg font-bold text-gray-800">${member.name || '-'}</div>
                <div class="text-xs text-gray-500 mt-0.5">${member.dept || '-'} / ${app.getUserTitleText(member)}</div>
            </div>
            <div class="space-y-2">
                ${rows.map(item => `<div class="grid grid-cols-[140px_1fr] gap-2 items-center text-sm"><div class="text-gray-500">${item.label}</div><div class="font-semibold text-gray-800 break-all">${item.value}</div></div>`).join('')}
            </div>
            ${specialLeaveHistory}
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
        const u = app.currentUser, reqs = app.sortRequestsByRecent(appData.requests.filter(r => app.requestBelongsToUser(r, u)));
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
                const isOpen = app.isMobileMemberSectionOpen(deptName);
                const titleBlock = `<div class="flex items-center gap-2 text-left flex-1 min-w-0">
                        <h3 class="font-bold ${titleColor} flex items-center min-w-0"><i class="fa-solid fa-users mr-2 ${iconColor}"></i><span class="truncate">팀원 연차 현황 / ${deptName}</span></h3>
                    </div>`;
                const collapseButton = `<button onclick="app.toggleMobileMemberSection('${safeDept}')" class="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-bold ${titleColor} shadow-sm hover:bg-white">
                        <span>${isOpen ? '접기' : '펼치기'}</span>
                        <i class="fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs ${iconColor}"></i>
                    </button>`;
                const controlsClass = 'flex items-center gap-2 md:gap-3 ml-auto shrink-0';
                const contentClass = isOpen ? 'grid' : 'hidden';
                return `<div class="${bgStyle} p-5 rounded-xl shadow-sm border mb-8"><div class="flex justify-between items-center mb-4 gap-3">${titleBlock}<div class="${controlsClass}"><label class="inline-flex items-center cursor-pointer"><input type="checkbox" class="sr-only peer" onchange="app.toggleUsage()" ${app.showUsage ? 'checked' : ''}><div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div><span class="ms-2 text-xs font-medium text-gray-500 hidden md:inline">사용 내역</span></label>${collapseButton}</div></div><div class="${contentClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${deptMembers.map(m => { const safeId = security.cleanInlineValue(m.id); const clickAttr = cardFeatureEnabled ? `onclick=\"app.openMemberCard('${safeId}')\"` : ''; const isSelected = cardFeatureEnabled && String(app.selectedMemberId) === String(safeId); const selectedClass = isSelected ? 'member-card-selected' : ''; const cardClass = cardFeatureEnabled ? 'cursor-pointer hover:shadow-md hover:border-indigo-200' : 'cursor-default'; const absenceState = app.getMemberAbsenceState(m); const absentClass = absenceState.absent ? 'member-card-absent' : ''; const absenceBadge = absenceState.absent ? `<div class="member-absence-badge">${absenceState.label}</div>` : ''; const usedGaugePercent = app.getUsageGaugePercent(m.usedHours, m.totalHours); const usedGaugeText = usedGaugePercent.toFixed(0).replace(/\.0$/, ''); const usedGaugeWidth = usedGaugePercent <= 0 ? '0%' : (usedGaugePercent < 3 ? '3%' : `${usedGaugePercent}%`); const specialLeaveSummary = app.renderSpecialLeaveSummary(m, { compact: true }); const specialLeaveFooter = specialLeaveSummary ? `<div class="mt-2 pt-2 border-t border-emerald-100"><div class="space-y-1">${specialLeaveSummary}</div></div>` : ''; return `<div data-member-card="1" data-member-id="${safeId}" class="bg-white border border-white/50 rounded-lg p-3 shadow-sm transition ${cardClass} ${selectedClass} ${absentClass} group" ${clickAttr} onmouseenter="app.showMemberHistory('${safeId}', event)" onmousemove="app.moveTooltip(event)" onmouseleave="app.hideTooltip()"><div class="flex justify-between items-start gap-3"><div class="min-w-0 flex-1 pr-2"><div class="flex items-center gap-2 min-w-0"><div class="font-bold text-gray-800 truncate">${m.name} <span class="text-xs text-gray-500">(${app.getUserTitleText(m)})</span></div>${absenceBadge}</div>${app.showUsage ? `<div class="mt-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded inline-block">사용: ${app.fmtTime(m.usedHours)}</div>` : ''}</div><div class="flex min-w-[150px] flex-col items-end text-right shrink-0"><div class="text-sm font-bold ${m.totalHours-m.usedHours<0?'text-red-600':'text-indigo-600'}">${app.fmtTime(m.totalHours-m.usedHours)} 남음</div><div class="text-[10px] text-gray-400 mt-0.5">/ 총 ${app.fmtTime(m.totalHours)}</div></div></div><div class="mt-3 flex items-center gap-2"><div class="h-2.5 flex-1 rounded-full bg-slate-100 border border-slate-200 overflow-hidden"><div class="h-full rounded-full bg-indigo-500 transition-all duration-300" style="width:${usedGaugeWidth}; ${usedGaugePercent <= 0 ? 'display:none;' : ''}"></div></div><div class="text-[10px] font-bold text-gray-400 min-w-[28px] text-right">${usedGaugeText}%</div></div>${specialLeaveFooter}</div>`; }).join('')}</div></div>`;
            }).join('');
        }
        
        // [수정] 관리자 모드에서도 '승인 대기' 연차 표시 (Case C 적용)
        const myStatusCard = isEffectiveCEO ? '' : app.renderMyStatusCard(app.currentUser, {
            titleClass: 'text-lg',
            remainClass: 'text-3xl',
            subtitle: app.getEnglishRoleLabel(app.currentUser)
        });
        const myReqs = app.sortRequestsByRecent(appData.requests.filter(r => app.requestBelongsToUser(r, u)));
        const myReqsSection = isEffectiveCEO ? '' : app.renderRecentRequestList('내 최근 신청 내역', myReqs, '신청 내역이 없습니다.');

        let dashboardTitle = (u.role === 'team_leader') ? '팀리더 대시보드' : (u.role === 'part_leader' ? '파트리더 대시보드' : '직원 대시보드');
        if (hasMasterLevel) dashboardTitle = '시스템 최고 관리자 대시보드';
        else if (isEffectiveCEO) dashboardTitle = '대표 대시보드';

        const showWorkReportPendingSection = canApprove && app.isAnyWorkReportFeatureEnabled();
        const workReportPendingSummaries = showWorkReportPendingSection
            ? app.getPendingWorkReportSettlementSummaries()
            : [];
        const workReportPendingSection = !showWorkReportPendingSection ? '' : `<div class="my-5 border-t border-dashed border-gray-200"></div><div class="mb-3"><h4 class="font-bold text-slate-700 flex items-center"><i class="fa-regular fa-clipboard mr-2"></i> 잔업/특근 제출 대기</h4><p class="mt-1 text-xs text-gray-400">홈에서는 상세확인만 제공하고, 승인/반려는 상세 화면에서 처리합니다.</p></div><div class="space-y-3">${workReportPendingSummaries.map(item => `<div class="border border-slate-200 bg-slate-50/80 p-4 rounded-lg flex justify-between items-center gap-4"><div><div><span class="font-bold">${security.cleanText(item.userName || '-')}</span> <span class="text-xs text-gray-500">${security.cleanText(item.dept || '')}</span></div><div class="text-sm text-slate-700 font-bold mt-1">잔업 ${item.overtimeText}h · 특근 ${Number(item.holidayWorkDayCount || 0)}일</div><div class="text-xs text-gray-400 mt-1">${app.getReportBoardPeriodLabel(item.periodYear, item.periodMonth)} · ${item.latestSubmittedAt || '승인 요청 완료'}</div></div><div class="flex flex-col gap-1"><button onclick="app.openWorkReportOverviewBoard(${Number(item.periodYear)}, ${Number(item.periodMonth)}); setTimeout(() => app.openReportUserDetail('${security.cleanInlineValue(item.userId)}'), 60);" class="bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-bold">상세확인</button></div></div>`).join('') || '<div class="text-center text-gray-400 py-4">대기 없음</div>'}</div>`;
        const approvalSection = !canApprove ? '' : `<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"><div class="bg-white rounded-xl shadow-sm border p-5"><div class="flex justify-between items-center mb-4"><h3 class="font-bold text-indigo-800 flex items-center"><i class="fa-regular fa-clock mr-2"></i> 결재 대기</h3><button onclick="app.approveAll('pending')" class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-bold transition">모두 승인</button></div><div class="space-y-3">${pendings.filter(r=>r.status==='pending').map(r=> { const displayType = app.getRequestDisplayType(r); return `<div class="border border-sky-200 bg-sky-50/70 p-4 rounded-lg flex justify-between items-center"><div><span class="font-bold">${r.userName}</span> <span class="text-xs text-gray-500">${r.dept}</span><div class="text-sm text-indigo-600 font-bold mt-1">${displayType} | ${r.reason}</div><div class="text-xs text-gray-400 mt-1">${app.fmtDate(r.startDate)}${r.startDate!==r.endDate ? ' ~ '+app.fmtDate(r.endDate) : ''}</div></div><div class="flex flex-col gap-1"><button onclick="app.processReq('${r.id}','approve')" class="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold">승인</button><button onclick="app.processReq('${r.id}','reject')" class="bg-gray-100 text-gray-600 px-3 py-1.5 rounded text-xs">반려</button></div></div>`; }).join('') || '<div class="text-center text-gray-400 py-4">대기 없음</div>'}</div>${workReportPendingSection}</div><div class="bg-white rounded-xl shadow-sm border p-5"><div class="flex justify-between items-center mb-4"><h3 class="font-bold text-red-600 flex items-center"><i class="fa-solid fa-triangle-exclamation mr-2"></i> 취소 요청</h3><button onclick="app.approveAll('cancel')" class="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 font-bold transition">모두 승인</button></div><div class="space-y-3">${pendings.filter(r=>r.status==='cancel_requested').map(r=>`<div class="border border-amber-200 bg-amber-50/80 p-4 rounded-lg flex justify-between items-center"><div><span class="font-bold">${r.userName}</span><div class="text-xs text-red-500 font-bold mt-1">취소 요청됨</div><div class="text-xs text-gray-400">${app.fmtDate(r.startDate)}</div></div><div class="flex flex-col gap-1"><button onclick="app.processReq('${r.id}','cancel_approve')" class="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold">취소 승인</button><button onclick="app.processReq('${r.id}','cancel_reject')" class="bg-white border px-3 py-1.5 rounded text-xs">반려</button></div></div>`).join('') || '<div class="text-center text-gray-400 py-4">요청 없음</div>'}</div></div></div>`;
        const managerQuickAction = app.renderDashboardQuickActions({ includeAnnual: !isEffectiveCEO });
        document.getElementById('app-container').innerHTML = `<div class="w-full max-w-7xl mx-auto px-4 fade-in pt-8 pb-12"><div class="flex justify-between items-center mb-6"><h2 class="text-2xl font-bold">${dashboardTitle}</h2></div>${myStatusCard}${managerQuickAction}<div class="mb-8">${app.renderCal(appData.requests, app.currentUser)}</div>${approvalSection}${myReqsSection}${memberStatusHtml}</div>${app.getModal()}`;
        app.initModal();
    },
});
