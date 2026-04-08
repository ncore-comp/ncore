"use strict";

Object.assign(app, {
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
});

