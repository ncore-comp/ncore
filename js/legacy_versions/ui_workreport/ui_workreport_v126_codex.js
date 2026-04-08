"use strict";

Object.assign(app, {
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
    openWorkReportOverviewBoard: (year = app.viewYear, month = app.viewMonth) => {
        if (!app.canAccessAnyWorkReportView()) {
            alert('잔업/특근 현황 권한이 없습니다.');
            return;
        }
        app.reportBoardMode = 'overview';
        app.reportBoardYear = Number.isFinite(Number(year)) ? Number(year) : app.viewYear;
        app.reportBoardMonth = Number.isFinite(Number(month)) ? Number(month) : app.viewMonth;
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
        if (!app.requestBelongsToUser(req, app.currentUser)) return false;
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
            app.renderWorkReportWeeklyLimitSummary();
            return;
        }
        let startHour = parseInt(startEl.value, 10);
        const duration = parseInt(durationEl.value, 10);
        if (type === '잔업') {
            startHour = Number(app.getTimeoffEndHourForDate(app.currentUser, dateStr || moment().format('YYYY-MM-DD')));
            if (Number.isFinite(startHour)) startEl.value = String(startHour);
        }
        if (!Number.isFinite(startHour) || !Number.isFinite(duration) || duration < 1) {
            preview.innerText = '보고 시간을 선택하면 잔업 가능시간을 계산합니다.';
            preview.style.color = '#64748b';
            app.renderWorkReportWeeklyLimitSummary();
            return;
        }
        if (!Number.isFinite(startHour)) {
            preview.innerText = '';
            app.renderWorkReportWeeklyLimitSummary();
            return;
        }
        const endHour = startHour + duration;
        if (endHour > 24) {
            preview.innerText = '* 종료 시간이 24:00을 넘지 않게 설정해주세요.';
            preview.style.color = '#dc2626';
            app.renderWorkReportWeeklyLimitSummary();
            return;
        }
        preview.innerText = `${type} 시간: ${formatHour(startHour)} ~ ${formatHour(endHour)} (${duration}시간)`;
        preview.style.color = type === '특근' ? '#be123c' : '#334155';
        app.renderWorkReportWeeklyLimitSummary();
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
            if (durationEl && !durationEl.value) durationEl.value = '0';
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
        if (durationEl) durationEl.value = editingReq ? String(parseInt(String(editingReq.reportedHours || editingReq.hours || 1), 10) || 1) : '0';
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
                    app.requestBelongsToUser(req, app.currentUser) &&
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

            const weeklySummary = app.getWeeklyWorkLimitSummary({
                user: app.currentUser,
                dateStr,
                type,
                duration,
                excludeRequestId: app.workReportEditingId
            });
            if (weeklySummary && weeklySummary.overLimit) {
                return alert(`주간 예정 근로시간이 52시간을 초과하여 저장할 수 없습니다.\n- 주간 기준: ${weeklySummary.weekStart} ~ ${weeklySummary.weekEnd}\n- 기본근로시간: ${weeklySummary.basicHours}시간\n- 기존 잔업/특근: ${weeklySummary.existingReportHours}시간\n- 이번 신청: ${weeklySummary.currentRequestHours}시간\n- 예정 총 근로시간: ${weeklySummary.totalHours}시간`);
            }

            const reportCategory = type === '특근' ? 'holiday_work' : 'overtime';
            const editingId = security.cleanInlineValue(app.workReportEditingId || '');
            const baseReq = editingId ? (appData.requests || []).find((req) => String(req.id) === String(editingId)) : null;
            const newReq = security.sanitizeRequest({
                ...(baseReq || {}),
                id: editingId || Date.now(),
                userId: app.currentUser.id,
                employeeNo: app.currentUser.employeeNo || (baseReq && baseReq.employeeNo) || '',
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
    getReportSettlementStatus: (req, year = app.reportBoardYear, month = app.reportBoardMonth) => {
        if (!req) return '';
        const periodKey = app.getReportBoardPeriodKey(year, month);
        if (String(req.settlementPeriodKey || '') !== periodKey) return '';
        const safe = String(req.settlementStatus || '').trim();
        if (['submitted', 'approved', 'rejected'].includes(safe)) return safe;
        return String(req.settlementSubmittedAt || '').trim() ? 'submitted' : '';
    },
    isReportSettlementSubmitted: (req, year = app.reportBoardYear, month = app.reportBoardMonth) => {
        const safe = app.getReportSettlementStatus(req, year, month);
        return safe === 'submitted' || safe === 'approved';
    },
    canApproveWorkReportSettlementForUser: (userId, dept = '') => {
        if (!app.currentUser) return false;
        const safeUserId = security.cleanInlineValue(userId);
        if (!safeUserId) return false;
        const isSelf = String(app.currentUser.id) === String(safeUserId);
        if (isSelf && security.normalizeRole(app.currentUser.role) !== 'master') return false;
        const scope = app.getCurrentPermissions().approveScope;
        if (scope === 'all') return true;
        if (scope === 'manual') return dept === '매뉴얼팀';
        if (scope === 'parts') return dept === '파츠북팀';
        return false;
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
        const rejectedRows = safeRows.filter((req) => app.getReportSettlementStatus(req, year, month) === 'rejected');
        const unsubmittedRows = safeRows.filter((req) => !app.isReportSettlementSubmitted(req, year, month));
        const latestSubmittedAt = submittedRows
            .map((req) => String(req.settlementSubmittedAt || '').trim())
            .filter(Boolean)
            .sort()
            .slice(-1)[0] || '';
        return {
            totalCount: safeRows.length,
            submittedCount: submittedRows.length,
            rejectedCount: rejectedRows.length,
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
                    rejectedCount: 0,
                    latestSubmittedAt: '',
                    settlementStatus: 'draft'
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
            const settlementStatus = app.getReportSettlementStatus(req, app.reportBoardYear, app.reportBoardMonth);
            if (settlementStatus === 'submitted' || settlementStatus === 'approved') {
                item.submittedCount += 1;
                const submittedAt = String(req.settlementSubmittedAt || '').trim();
                if (submittedAt && (!item.latestSubmittedAt || submittedAt > item.latestSubmittedAt)) item.latestSubmittedAt = submittedAt;
            }
            if (settlementStatus === 'rejected') item.rejectedCount += 1;
        });
        return [...byUser.values()].map((item) => {
            const overtimeText = Number.isInteger(item.overtimeHours)
                ? String(item.overtimeHours)
                : String(item.overtimeHours.toFixed(2).replace(/\.?0+$/, ''));
            let submissionText = '미제출';
            let settlementStatus = 'draft';
            if (item.rejectedCount > 0) {
                submissionText = '반려';
                settlementStatus = 'rejected';
            } else if (item.totalCount > 0 && item.submittedCount === item.totalCount) {
                const approvedCount = (Array.isArray(rows) ? rows : []).filter((req) => String(req.userId) === String(item.userId) && app.getReportSettlementStatus(req, app.reportBoardYear, app.reportBoardMonth) === 'approved').length;
                if (approvedCount === item.totalCount) {
                    submissionText = '승인 완료';
                    settlementStatus = 'approved';
                } else {
                    submissionText = '승인 요청 완료';
                    settlementStatus = 'submitted';
                }
            }
            return {
                ...item,
                overtimeText,
                holidayWorkDayCount: item.holidayWorkDays.size,
                submissionText,
                settlementStatus
            };
        }).sort((a, b) => {
            const overtimeDiff = Number(b.overtimeHours || 0) - Number(a.overtimeHours || 0);
            if (overtimeDiff !== 0) return overtimeDiff;
            const holidayDiff = Number(b.holidayWorkDayCount || 0) - Number(a.holidayWorkDayCount || 0);
            if (holidayDiff !== 0) return holidayDiff;
            return String(a.userName || '').localeCompare(String(b.userName || ''), 'ko');
        });
    },
    getPendingWorkReportSettlementSummaries: () => {
        const groups = new Map();
        (appData.requests || []).forEach((req) => {
            if (!app.isWorkReportRequest(req)) return;
            if (String(req.status || '') !== 'reported') return;
            const periodKey = String(req.settlementPeriodKey || '').trim();
            if (!periodKey) return;
            const effectiveStatus = String(req.settlementStatus || '').trim() || (String(req.settlementSubmittedAt || '').trim() ? 'submitted' : '');
            if (effectiveStatus !== 'submitted') return;
            const safeUserId = security.cleanInlineValue(req.userId || '');
            if (!safeUserId) return;
            const [yearText, monthText] = periodKey.split('-');
            const periodYear = Number(yearText);
            const periodMonth = Number(monthText) - 1;
            if (!Number.isFinite(periodYear) || !Number.isFinite(periodMonth) || periodMonth < 0 || periodMonth > 11) return;
            const key = `${safeUserId}::${periodKey}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    userId: safeUserId,
                    userName: security.cleanText(req.userName || '-'),
                    dept: security.cleanText(req.dept || ''),
                    periodKey,
                    periodYear,
                    periodMonth,
                    overtimeHours: 0,
                    holidayWorkDays: new Set(),
                    latestSubmittedAt: ''
                });
            }
            const item = groups.get(key);
            const category = app.getWorkReportCategory(req);
            const hours = Number(req.reportedHours || req.hours || 0);
            if (category === 'overtime') {
                item.overtimeHours += Number.isFinite(hours) ? hours : 0;
            } else if (category === 'holiday_work') {
                const safeDate = security.normalizeDate(req.startDate, '');
                if (safeDate) item.holidayWorkDays.add(safeDate);
            }
            const submittedAt = String(req.settlementSubmittedAt || '').trim();
            if (submittedAt && (!item.latestSubmittedAt || submittedAt > item.latestSubmittedAt)) item.latestSubmittedAt = submittedAt;
        });
        return [...groups.values()]
            .filter((item) => app.canApproveWorkReportSettlementForUser(item.userId, item.dept))
            .map((item) => ({
                ...item,
                overtimeText: Number.isInteger(item.overtimeHours)
                    ? String(item.overtimeHours)
                    : String(item.overtimeHours.toFixed(2).replace(/\.?0+$/, '')),
                holidayWorkDayCount: item.holidayWorkDays.size
            }))
            .sort((a, b) => {
                const submittedDiff = String(b.latestSubmittedAt || '').localeCompare(String(a.latestSubmittedAt || ''), 'ko');
                if (submittedDiff !== 0) return submittedDiff;
                const periodDiff = String(b.periodKey || '').localeCompare(String(a.periodKey || ''), 'ko');
                if (periodDiff !== 0) return periodDiff;
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
                    settlementStatus: 'submitted',
                    settlementSubmittedAt: submittedAt,
                    settlementSubmittedBy: app.currentUser && app.currentUser.id,
                    settlementSubmittedByName: app.currentUser && app.currentUser.name,
                    settlementApprovedAt: '',
                    settlementApprovedBy: '',
                    settlementApprovedByName: '',
                    settlementRejectedAt: '',
                    settlementRejectedBy: '',
                    settlementRejectedByName: '',
                    settlementRejectReason: ''
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
    applyWorkReportSettlementResultToRequests: (result = {}, extra = {}) => {
        const requestIdSet = new Set((Array.isArray(result.requestIds) ? result.requestIds : []).map((id) => String(id)));
        if (!requestIdSet.size) return;
        appData.requests = appData.requests.map((req) => {
            if (!requestIdSet.has(String(req.id))) return req;
            return security.sanitizeRequest({
                ...req,
                settlementPeriodKey: String(result.periodKey || req.settlementPeriodKey || ''),
                settlementStatus: String(result.status || extra.status || req.settlementStatus || ''),
                settlementSubmittedAt: String(extra.submittedAt || req.settlementSubmittedAt || ''),
                settlementSubmittedBy: extra.submittedBy || req.settlementSubmittedBy || '',
                settlementSubmittedByName: extra.submittedByName || req.settlementSubmittedByName || '',
                settlementApprovedAt: String(result.approvedAt || ''),
                settlementApprovedBy: extra.approvedBy || '',
                settlementApprovedByName: extra.approvedByName || '',
                settlementRejectedAt: String(result.rejectedAt || ''),
                settlementRejectedBy: extra.rejectedBy || '',
                settlementRejectedByName: extra.rejectedByName || '',
                settlementRejectReason: String(result.rejectReason || '')
            });
        });
        appData.meta.requestDataVersion += 1;
    },
    approveCurrentWorkReportSettlement: async () => {
        const targetUserId = security.cleanInlineValue(app.reportDetailUserId || '');
        const rows = app.getReportBoardRowsForUser(targetUserId, app.reportBoardYear, app.reportBoardMonth);
        if (!rows.length) return alert('승인할 잔업/특근 정산 내역이 없습니다.');
        if (!app.canApproveWorkReportSettlementForUser(targetUserId, rows[0].dept)) return alert('승인 권한이 없습니다.');
        if (!confirm(`${security.cleanText(rows[0].userName || '신청자')}님의 ${app.getReportBoardPeriodLabel(app.reportBoardYear, app.reportBoardMonth)} 잔업/특근 정산을 승인할까요?`)) return;
        try {
            document.getElementById('loading-text').innerText = '잔업/특근 승인 처리 중...';
            document.getElementById('loading-overlay').style.display = 'flex';
            const result = await db.approveWorkReportSettlement(targetUserId, app.reportBoardYear, app.reportBoardMonth);
            app.applyWorkReportSettlementResultToRequests(result, {
                approvedBy: app.currentUser && app.currentUser.id,
                approvedByName: app.currentUser && app.currentUser.name
            });
            const targetUser = appData.users.find((u) => String(u.id) === String(targetUserId));
            if (targetUser && security.isValidEmail(targetUser.email)) {
                const subject = `[잔업/특근 승인] ${app.getReportBoardPeriodLabel(app.reportBoardYear, app.reportBoardMonth)} 정산이 승인되었습니다.`;
                const body = `${targetUser.name} ${targetUser.rank || ''}님,\n\n신청하신 ${app.getReportBoardPeriodLabel(app.reportBoardYear, app.reportBoardMonth)} 잔업/특근 정산이 승인되었습니다.\n\n접속주소: ${window.location.origin}/`;
                openOutlookDraft(security.cleanEmail(targetUser.email), subject, body, '');
                alert('승인 처리했고 요청자에게 보낼 메일 작성창을 열었습니다.');
            } else {
                alert('승인 처리했습니다. (요청자 이메일 정보가 없습니다.)');
            }
            app.openWorkReportOverviewBoard();
            app.openReportUserDetail(targetUserId);
        } catch (err) {
            alert(`오류: ${err.message || err}`);
        } finally {
            document.getElementById('loading-overlay').style.display = 'none';
        }
    },
    rejectCurrentWorkReportSettlement: async () => {
        const targetUserId = security.cleanInlineValue(app.reportDetailUserId || '');
        const rows = app.getReportBoardRowsForUser(targetUserId, app.reportBoardYear, app.reportBoardMonth);
        if (!rows.length) return alert('반려할 잔업/특근 정산 내역이 없습니다.');
        if (!app.canApproveWorkReportSettlementForUser(targetUserId, rows[0].dept)) return alert('승인 권한이 없습니다.');
        const rejectReason = await app.openReasonModal({
            title: '반려 사유 입력',
            subtitle: `${security.cleanText(rows[0].userName || '신청자')}님의 ${app.getReportBoardPeriodLabel(app.reportBoardYear, app.reportBoardMonth)} 잔업/특근 정산을 반려합니다.`,
            placeholder: '예: 업무내용 보완 후 다시 제출해 주세요.',
            confirmLabel: '반려',
            emptyMessage: '반려 사유를 입력해 주세요.'
        });
        if (rejectReason === null) return;
        try {
            document.getElementById('loading-text').innerText = '잔업/특근 반려 처리 중...';
            document.getElementById('loading-overlay').style.display = 'flex';
            const result = await db.rejectWorkReportSettlement(targetUserId, app.reportBoardYear, app.reportBoardMonth, rejectReason);
            app.applyWorkReportSettlementResultToRequests(result, {
                rejectedBy: app.currentUser && app.currentUser.id,
                rejectedByName: app.currentUser && app.currentUser.name
            });
            const targetUser = appData.users.find((u) => String(u.id) === String(targetUserId));
            if (targetUser && security.isValidEmail(targetUser.email)) {
                const subject = `[잔업/특근 반려] ${app.getReportBoardPeriodLabel(app.reportBoardYear, app.reportBoardMonth)} 정산이 반려되었습니다.`;
                const body = `${targetUser.name} ${targetUser.rank || ''}님,\n\n신청하신 ${app.getReportBoardPeriodLabel(app.reportBoardYear, app.reportBoardMonth)} 잔업/특근 정산이 반려되었습니다.\n\n반려 사유: ${security.cleanText(rejectReason)}\n\n접속주소: ${window.location.origin}/`;
                openOutlookDraft(security.cleanEmail(targetUser.email), subject, body, '');
                alert('반려 처리했고 요청자에게 보낼 메일 작성창을 열었습니다.');
            } else {
                alert('반려 처리했습니다. (요청자 이메일 정보가 없습니다.)');
            }
            app.openWorkReportOverviewBoard();
            app.openReportUserDetail(targetUserId);
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
        const overviewHeadcounts = isOverviewMode ? {
            overtimeUsers: summaryRows.filter((item) => Number(item.overtimeHours || 0) > 0).length,
            holidayWorkUsers: summaryRows.filter((item) => Number(item.holidayWorkDayCount || 0) > 0).length
        } : null;
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
                        <div class="text-xs font-bold text-slate-500">${isOverviewMode ? '총 잔업 인원' : '내 총 잔업시간'}</div>
                        <div class="mt-1 text-2xl font-extrabold text-slate-800">${isOverviewMode ? `${overviewHeadcounts.overtimeUsers}명` : `${totals.overtimeText}h`}</div>
                    </div>
                    <div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                        <div class="text-xs font-bold text-rose-500">${isOverviewMode ? '총 특근 인원' : '내 총 특근일수'}</div>
                        <div class="mt-1 text-2xl font-extrabold text-rose-700">${isOverviewMode ? `${overviewHeadcounts.holidayWorkUsers}명` : `${totals.holidayWorkDays}일`}</div>
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
        const settlementStatus = app.getReportSettlementStatus(rows[0], app.reportBoardYear, app.reportBoardMonth);
        const canApproveSettlement = settlementStatus === 'submitted' && app.canApproveWorkReportSettlementForUser(safeUserId, rows[0].dept);
        const statusTone = settlementStatus === 'approved'
            ? 'bg-emerald-50 text-emerald-700'
            : (settlementStatus === 'rejected'
                ? 'bg-rose-50 text-rose-700'
                : (settlementStatus === 'submitted' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'));
        const statusText = settlementStatus === 'approved'
            ? '승인 완료'
            : (settlementStatus === 'rejected'
                ? `반려${rows[0].settlementRejectReason ? ` · ${security.cleanText(rows[0].settlementRejectReason)}` : ''}`
                : (settlementStatus === 'submitted' ? '승인 요청 완료' : '미제출'));
        app.reportDetailUserId = safeUserId;
        app.reportDetailRequestId = '';
        body.innerHTML = `
            <div class="space-y-4">
                <div class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                            <div class="text-sm font-bold text-gray-800">${userName} · ${app.getReportBoardPeriodLabel(app.reportBoardYear, app.reportBoardMonth)} 상세</div>
                            <div class="mt-1 text-xs text-gray-500">집계 기준: ${start.format('YYYY-MM-DD')} ~ ${end.format('YYYY-MM-DD')}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            ${canApproveSettlement ? `<button type="button" onclick="app.approveCurrentWorkReportSettlement()" class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold">승인</button>` : ''}
                            ${canApproveSettlement ? `<button type="button" onclick="app.rejectCurrentWorkReportSettlement()" class="px-4 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold">반려</button>` : ''}
                        </div>
                    </div>
                    <div class="mt-2 inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusTone}">
                        ${statusText}
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
});
