"use strict";

Object.assign(app, {
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
        if(!inputUser.employeeNo) return alert('사번은 필수 입력입니다.');
        if (!inputUser.workQ1 || !inputUser.workQ2 || !inputUser.workQ3 || !inputUser.workQ4) {
            return alert('근무시간 분기(Q1~Q4) 중 미등록 항목이 있습니다. 모두 입력 후 저장해 주세요.');
        }
        if(inputUser.password.length < 4) return alert('비밀번호는 4자 이상으로 입력하세요.');
        if(!security.isValidEmail(inputUser.email)) return alert('이메일 형식이 올바르지 않습니다.');
        if(appData.users.some(u => String(u.id) === String(inputUser.id))) return alert('이미 존재하는 ID입니다.');
        if(appData.users.some(u => String(u.employeeNo || '') === String(inputUser.employeeNo))) return alert('이미 존재하는 사번입니다.');

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
            const nextName = nameInput ? security.cleanText(nameInput.value) : '';
            const nextEmployeeNo = empInput ? security.cleanInlineValue(empInput.value) : '';
            if (!nextName) throw new Error('이름은 필수 입력입니다.');
            if (!nextEmployeeNo) throw new Error('사번은 필수 입력입니다.');
            const duplicateEmployeeNoUser = appData.users.find((user) => String(user.id) !== String(safeId) && String(user.employeeNo || '') === nextEmployeeNo);
            if (duplicateEmployeeNoUser) {
                throw new Error('이미 존재하는 사번입니다.');
            }
            if(nameInput) u.name = nextName;
            if(roleInput) u.role = security.normalizeRole(roleInput.value);
            if(deptInput) u.dept = security.cleanText(deptInput.value);
            if(rankInput) u.rank = security.cleanText(rankInput.value);
            if(daysInput) { const days = parseFloat(daysInput.value); if (!isNaN(days)) u.totalHours = days * 8; }
            if(empInput) u.employeeNo = nextEmployeeNo;
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
});
