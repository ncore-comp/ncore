"use strict";

Object.assign(app, {
        openRequestModal: (presetDate = '', options = {}) => {
            const modal = document.getElementById('req-modal');
            if (!modal) return;
            app.initModal(presetDate, options);
            modal.classList.remove('hidden');
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
                        app.syncTimeOffOutOptions();
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
                    const validation = app.getTimeOffOutValidation(requestUser, sDate, s, d);
                    if (!validation.valid) {
                        if (validation.reason === 'before_shift_start') {
                            return alert(`선택한 직원의 출근시간(${String(validation.shiftStartHour).padStart(2, '0')}:00) 이전에는 외출을 등록할 수 없습니다.`);
                        }
                        if (validation.reason === 'at_or_after_shift_end') {
                            return alert(`선택한 직원의 퇴근시간(${String(validation.shiftEndHour).padStart(2, '0')}:00)을 포함하거나 지난 외출은 등록할 수 없습니다.`);
                        }
                        return alert('외출 시간을 다시 확인해주세요.');
                    }
                    hours = d; timeRange = `${s}:00~${validation.endHour}:00`;
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

                if (selection.isSpecial) {
                    const grantEntry = app.getUserSpecialLeaveGrantEntries(requestUser.id, { enabledOnly: false, includeZero: true })
                        .find((item) => item.grantId === selection.specialLeaveGrantId);
                    if (!grantEntry) {
                        return alert('선택한 특별휴가 부여 건을 찾을 수 없습니다.');
                    }
                    if (grantEntry.grantStatus === 'inactive') {
                        return alert('선택한 특별휴가는 현재 신청에 사용할 수 없습니다.');
                    }
                    if (grantEntry.usableFromDate && grantEntry.usableToDate) {
                        if (sDate < grantEntry.usableFromDate || eDate > grantEntry.usableToDate) {
                            return alert(`선택한 특별휴가는 사용 가능 기간만 신청할 수 있습니다.\n사용 가능: ${grantEntry.usableFromDate} ~ ${grantEntry.usableToDate}`);
                        }
                    }
                    if (selection.requestMode === 'day_only' && (sDate !== eDate || type !== '연차' || hours % 8 !== 0)) {
                        return alert('이 특별휴가는 1일 단위로만 사용할 수 있습니다.');
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
                            specialLeaveTypeLabel: selection.specialLeaveTypeLabel,
                            specialLeaveGrantId: selection.specialLeaveGrantId
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
                        specialLeaveTypeLabel: selection.specialLeaveTypeLabel,
                        specialLeaveGrantId: selection.specialLeaveGrantId
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


});

Object.assign(app, {
    togglePastDates: () => {
        const allowPast = document.getElementById('allow-past')?.checked;
        const sDate = document.getElementById('req-start-date');
        const eDate = document.getElementById('req-end-date');
        const today = moment().format('YYYY-MM-DD');
        if (sDate) {
            if (allowPast) {
                sDate.removeAttribute('min');
                if (eDate) eDate.removeAttribute('min');
            } else {
                sDate.min = today;
                if (sDate.value && sDate.value < today) {
                    sDate.value = today;
                    if (eDate) eDate.value = today;
                }
            }
        }
    },
});

