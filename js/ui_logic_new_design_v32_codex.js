    const app = {
        currentUser: null,
        editingId: null,
        viewYear: new Date().getFullYear(),
        viewMonth: new Date().getMonth(),
        showPastShading: true, 
        showUsage: false,
        currentPage: 1,
        currentView: 'dashboard',
        calendarMode: 'self',
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
        sessionStorageKey: 'ncore_active_session_v27',

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
        renderMyStatusCard: (user, options = {}) => {
            const titleClass = String(options.titleClass || 'text-2xl');
            const remainClass = String(options.remainClass || 'text-4xl');
            const subtitle = String(options.subtitle || '');
            const percent = app.getUsageGaugePercent(user.usedHours, user.totalHours);
            const percentText = percent.toFixed(0).replace(/\.0$/, '');
            const gaugeWidth = percent <= 0 ? '0%' : (percent < 2 ? '2%' : `${percent}%`);
            return `<div class="bg-white p-6 rounded-2xl shadow-sm border mb-8">
                <div class="flex justify-between items-center gap-4">
                    <div>
                        <h2 class="${titleClass} font-bold">내 연차 현황</h2>
                        <p class="text-sm text-gray-500 mt-1">${subtitle}</p>
                    </div>
                    <div class="text-right">
                        <div class="${remainClass} font-bold text-indigo-600">${app.fmtTime(user.totalHours-user.usedHours)} <span class="text-lg text-gray-400 font-normal">/ ${app.fmtTime(user.totalHours)}</span></div>
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
            </div>`;
        },
        formatDeductionText: (req) => {
            const type = security.normalizeType((req && req.type) || '');
            const hours = Number((req && req.hours) || 0);
            const hoursText = Number.isInteger(hours)
                ? String(hours)
                : String(hours.toFixed(2).replace(/\.?0+$/, ''));
            if (type === '연차' || type === '반차') {
                return `${hoursText}h(${app.formatDayCount(hours)}일) 차감`;
            }
            return `${hoursText}h 차감`;
        },
        shouldRenderRequestOnDate: (req, dateStr) => {
            const type = security.normalizeType((req && req.type) || '');
            if (type === '연차' || type === '반차') {
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
                all: '모두'
            };
            const allModes = ['self', 'manual', 'parts', 'all'];
            const allowedSet = new Set(app.getAllowedCalendarModes());
            return `<div class="inline-flex flex-wrap items-end gap-1">${allModes.map(mode => {
                const isAllowed = allowedSet.has(mode);
                const isActive = isAllowed && app.calendarMode===mode;
                const baseClass = 'px-3 py-1.5 rounded-t-lg rounded-b-md text-sm font-bold border transition';
                const stateClass = !isAllowed
                    ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed opacity-70'
                    : (isActive ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-200 relative top-[1px]' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200');
                const attrs = isAllowed
                    ? `onclick="app.setCalendarMode('${mode}')"`
                    : `disabled aria-disabled="true" title="권한 없음"`;
                return `<button ${attrs} class="${baseClass} ${stateClass}">${labels[mode]}</button>`;
            }).join('')}</div>`;
        },
        getCalendarRequests: (validRequests, viewer) => {
            app.ensureCalendarMode();
            if (app.calendarMode === 'all') {
                return validRequests.filter(r => ['approved', 'cancel_requested'].includes(r.status));
            }
            if (app.calendarMode === 'manual') {
                return validRequests.filter(r => r.dept === '매뉴얼팀' && ['approved', 'cancel_requested'].includes(r.status));
            }
            if (app.calendarMode === 'parts') {
                return validRequests.filter(r => r.dept === '파츠북팀' && ['approved', 'cancel_requested'].includes(r.status));
            }
            return validRequests.filter(r => String(r.userId) === String(viewer.id));
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
        hasMasterPermissionAccess: () => app.currentUser && (app.currentUser.role === 'master' || app.getCurrentPermissions().canAccessMasterSettings),
        hasUserManagePermission: () => app.getCurrentPermissions().canManageUsers,
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
        getWorkShiftText: (value) => {
            const safe = security.normalizeWorkShift(value);
            return safe || '미등록';
        },
        getMemberCardData: (user) => {
            const currentYear = new Date().getFullYear();
            return [
                { label: '이름', value: user.name || '-' },
                { label: '유형', value: app.getRoleLabelKo(user) },
                { label: '직급', value: user.rank || '-' },
                { label: '전화번호', value: user.phone || '-' },
                { label: '이메일', value: user.email || '-' },
                { label: '사번', value: user.employeeNo || user.id || '-' },
                { label: `${currentYear}년 1분기 근무시간`, value: app.getWorkShiftText(user.workQ1) },
                { label: `${currentYear}년 2분기 근무시간`, value: app.getWorkShiftText(user.workQ2) },
                { label: `${currentYear}년 3분기 근무시간`, value: app.getWorkShiftText(user.workQ3) },
                { label: `${currentYear}년 4분기 근무시간`, value: app.getWorkShiftText(user.workQ4) }
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
        logUserAction: async (logType, detail = '') => {
            if (!app.currentUser) return;
            await db.logAccess({
                userId: app.currentUser.id,
                userName: app.currentUser.name,
                logType,
                detail
            });
        },
        readSessionState: () => {
            try {
                const raw = sessionStorage.getItem(app.sessionStorageKey);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                return {
                    userId: security.cleanInlineValue(parsed.userId || ''),
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
        restoreSession: async () => {
            const saved = app.readSessionState();
            if (!saved || !saved.userId) return false;
            if (saved.lastActivityAt && (Date.now() - saved.lastActivityAt) >= app.inactivityLimitMs) {
                app.clearSessionState();
                return false;
            }

            const loadingEl = document.getElementById('loading-overlay');
            const loadingTextEl = document.getElementById('loading-text');
            if (loadingTextEl) loadingTextEl.innerText = '새로고침 복원 중...';
            if (loadingEl) loadingEl.style.display = 'flex';

            try {
                const bootResult = await db.loadBoot();
                if (!bootResult.ok) throw new Error('BOOT_LOAD_FAILED');

                const freshUser = appData.users.find((u) => String(u.id) === String(saved.userId));
                if (!freshUser) throw new Error('SESSION_USER_NOT_FOUND');

                app.currentUser = security.sanitizeUser(freshUser || {});
                delete app.currentUser.password;
                app.currentView = 'dashboard';
                app.boardCategoryFilter = 'all';
                app.boardSearchText = '';
                app.boardEditingId = null;
                app.selectedBoardId = null;
                app.unloadLogged = false;
                app.markActivity();
                app.startIdleWatch();
                app.renderNav();
                app.recalcUsedHours();
                app.refreshDashboard();

                if (appData.meta.scopedLoadSupported) {
                    db.loadDeferred()
                        .then(() => {
                            if (!app.currentUser) return;
                            app.syncCurrentUserFromUsers();
                            app.recalcUsedHours();
                            if (app.currentView === 'dashboard') app.refreshDashboard();
                        })
                        .catch((e) => console.error('deferred load error', e));
                } else {
                    await db.load();
                    app.syncCurrentUserFromUsers();
                    app.recalcUsedHours();
                    app.refreshDashboard();
                }
                return true;
            } catch (e) {
                console.warn('session restore skip', e);
                app.clearSessionState();
                app.currentUser = null;
                app.renderNav();
                app.renderLogin();
                return false;
            } finally {
                if (loadingEl) loadingEl.style.display = 'none';
            }
        },
        markActivity: () => {
            app.lastActivityAt = Date.now();
            app.saveSessionState();
        },
        bindIdleEvents: () => {
            if (app.idleEventsBound) return;
            app.idleEventsBound = true;
            const events = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'];
            events.forEach((eventName) => {
                window.addEventListener(eventName, () => app.markActivity(), { passive: true });
            });
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) app.markActivity();
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
            app.markActivity();
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
            app.markActivity();
            app.showUsage = !app.showUsage;
            app.refreshDashboard();
        },
        
        togglePwVisibility: (el) => {
            const type = el.checked ? 'text' : 'password';
            document.getElementById('pw-new').type = type;
            document.getElementById('pw-confirm').type = type;
        },

        changePage: (newPage) => {
            app.currentPage = newPage;
            app.refreshDashboard(); 
        },

        renderLogin: () => {
            document.getElementById('app-container').innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] px-4">
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

        renderNav: () => {
            const el = document.getElementById('nav-info');
            if (!app.currentUser) return el.innerHTML = '';
            const isMaster = app.currentUser.role === 'master';
            const canManageUsers = app.hasUserManagePermission();
            const canAccessMasterPermission = app.hasMasterPermissionAccess();
            const boardEnabled = app.isBoardFeatureEnabled();
            const boardBtn = boardEnabled ? `<button onclick="app.openBoardPage()" class="mr-2 text-sm ${app.currentView==='board' ? 'bg-blue-700' : 'bg-blue-600'} text-white px-3 py-2 rounded-lg font-bold">게시판</button>` : '';
            const homeBtn = app.currentView !== 'dashboard'
                ? `<button onclick="app.backToDashboard()" class="mr-2 text-sm bg-white border px-3 py-2 rounded-lg font-bold">홈</button>`
                : '';
            el.innerHTML = `<div class="flex items-center"><div class="text-right mr-3"><p class="text-sm font-bold">${app.currentUser.name} <span class="text-xs text-gray-500">${app.currentUser.rank||''}</span>${isMaster?'<span class="text-[10px] bg-red-600 text-white px-1 rounded ml-1">MASTER</span>':''}</p><p class="text-xs text-gray-500">${app.currentUser.dept}</p></div>${boardBtn}${homeBtn}${canAccessMasterPermission?`<button onclick="app.renderMasterPermissionPage()" class="mr-2 text-sm bg-purple-600 text-white px-3 py-2 rounded-lg font-bold">권한/설정</button>`:''}${canManageUsers?`<button onclick="app.renderUserManagement()" class="mr-2 text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold">구성원 관리</button>`:''}<button onclick="document.getElementById('pw-modal').classList.remove('hidden')" class="mr-2 text-sm bg-white border px-3 py-2 rounded-lg">비번변경</button><button onclick="app.logout()" class="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg font-bold">로그아웃</button></div>`;
        },

        // [수정] recalcUsedHours: 승인 대기 시간도 계산하도록 수정
        recalcUsedHours: () => {
            if (!appData.meta.requestsLoaded) return;
            appData.users.forEach(u => { u.usedHours = 0; u.pendingHours = 0; });
            appData.requests.forEach(r => {
                const u = appData.users.find(user => String(user.id) === String(r.userId));
                if (u) { 
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
            document.getElementById('loading-text').innerText = "로그인 중...";
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                db.getClientIp().catch(() => '');
                const maxLoginRetry = 2; // 총 3회 시도
                const loginBaseDelayMs = 300;
                let json = null;
                let lastError = null;
                let useLegacyLogin = false;
                let usedBundledBoot = false;

                for (let attempt = 0; attempt <= maxLoginRetry; attempt++) {
                    try {
                        const loginAction = useLegacyLogin ? 'login' : 'login_boot';
                        const response = await fetch(GOOGLE_SCRIPT_URL, {
                            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                            body: JSON.stringify({ action: loginAction, id: id, password: pw })
                        });
                        json = await response.json();

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
                        document.getElementById('loading-text').innerText = "로그인 재시도 중... 잠시만 기다려주세요.";
                        await db.waitRetry(waitMs);
                    } catch (e) {
                        lastError = e;
                        if (attempt >= maxLoginRetry) throw e;
                        const jitterMs = Math.floor(Math.random() * 301) + 100; // 100~400ms 무작위 지연
                        const waitMs = loginBaseDelayMs * Math.pow(2, attempt) + jitterMs;
                        document.getElementById('loading-text').innerText = "로그인 재시도 중... 잠시만 기다려주세요.";
                        await db.waitRetry(waitMs);
                    }
                }

                if (!json && lastError) throw lastError;
                if (json.result === 'success') {
                    app.currentUser = security.sanitizeUser(json.user || {});
                    delete app.currentUser.password;
                    appData.users = [];
                    appData.requests = [];
                    appData.boardPosts = [];
                    appData.holidays = {};
                    app.currentView = 'dashboard';
                    app.boardCategoryFilter = 'all';
                    app.boardSearchText = '';
                    app.boardEditingId = null;
                    app.selectedBoardId = null;
                    appData.meta.requestsLoaded = false;
                    app.unloadLogged = false;
                    app.markActivity();
                    app.startIdleWatch();
                    app.renderNav();
                    document.getElementById('app-container').innerHTML = `<div class="w-full max-w-3xl mx-auto px-4 pt-16 pb-12 fade-in">
                        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
                            <div class="text-xl font-bold text-gray-800 mb-2">로그인 완료</div>
                            <div class="text-sm text-gray-500">기본 화면을 여는 중입니다.</div>
                        </div>
                    </div>`;
                    document.getElementById('loading-overlay').style.display = 'none';

                    const bundledData = (json.data && typeof json.data === 'object') ? json.data : null;
                    if (bundledData) {
                        db.applyLoadData(bundledData, { users: true, requests: false, boardPosts: false, holidays: true });
                        const meta = (json.meta && typeof json.meta === 'object') ? json.meta : {};
                        appData.meta.scopedLoadSupported = !!meta.scopedLoad;
                        appData.meta.lastLoadScope = String(meta.scope || 'boot');
                        usedBundledBoot = true;
                        app.syncCurrentUserFromUsers();
                    }
                    app.refreshDashboard();

                    if (!usedBundledBoot) {
                        const bootResult = await db.loadBoot();
                        if (!bootResult.ok) {
                            await db.load();
                        }
                        app.syncCurrentUserFromUsers();
                        app.refreshDashboard();
                        if (!(bootResult.ok && bootResult.scopedLoadSupported)) return;
                    }

                    if (appData.meta.scopedLoadSupported) {
                        db.loadDeferred()
                            .then(() => {
                                if (!app.currentUser) return;
                                app.syncCurrentUserFromUsers();
                                app.recalcUsedHours();
                                if (app.currentView === 'dashboard') app.refreshDashboard();
                            })
                            .catch((e) => console.error('deferred load error', e));
                    }
                } else { alert(json.message || "아이디/비밀번호 확인"); }
            } catch(e) { console.error(e); alert("서버 통신 오류"); } finally { document.getElementById('loading-overlay').style.display = 'none'; }
        },

        logout: async (reason = 'manual') => {
            const isManual = reason === 'manual';
            if (isManual && !confirm('로그아웃 하시겠습니까?')) return;

            const userSnapshot = app.currentUser
                ? { id: app.currentUser.id, name: app.currentUser.name }
                : null;
            app.unloadLogged = true;
            app.stopIdleWatch();
            app.clearSessionState();
            app.currentUser = null;
            app.currentView = 'dashboard';
            app.renderNav();
            app.renderLogin();
            if (!isManual) alert('입력이 10분 이상 없어 자동 로그아웃되었습니다.');

            if (userSnapshot) {
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
            const newPw = document.getElementById('pw-new').value.trim();
            const cfmPw = document.getElementById('pw-confirm').value.trim();

            if (!app.currentUser) {
                return alert('로그인이 필요합니다.');
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
                    { action: 'change_password', newPassword: newPw, actor: db.getActor() },
                    { retries: 6, baseDelayMs: 250, maxRetryWaitMs: 5000 }
                );
                if (!json || json.result !== 'success') {
                    const msg = String((json && json.message) || '');
                    if (msg.includes('지원하지 않는 action') || msg.toLowerCase().includes('unsupported')) {
                        throw new Error('서버에 비밀번호 변경 기능이 아직 배포되지 않았습니다.');
                    }
                    throw new Error(msg || '비밀번호 저장 실패');
                }

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

        openBoardPage: () => {
            if (!app.isBoardFeatureEnabled()) {
                alert('게시판 기능이 꺼져 있습니다.');
                return;
            }
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
            if(!app.currentUser) return app.renderLogin();
            if (app.currentView === 'board') return app.renderBoardPage();
            app.currentView = 'dashboard';
            app.renderNav();
            app.markActivity();
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
            app.refreshDashboard();
        },

        togglePastShading: () => { app.showPastShading = !app.showPastShading; app.refreshDashboard(); },

        showTooltip: (dateStr, event) => {
            const tooltip = document.getElementById('custom-tooltip');
            if (!app.currentUser) return;
            app.ensureCalendarMode();
            const validRequests = appData.requests.filter(r => !['cancelled', 'rejected'].includes(r.status));
            const scopedRequests = app.getCalendarRequests(validRequests, app.currentUser);
            const daysEvents = scopedRequests.filter(r =>
                moment(dateStr).isBetween(r.startDate, r.endDate, 'day', '[]') &&
                app.shouldRenderRequestOnDate(r, dateStr)
            );
            if(daysEvents.length === 0) {
                tooltip.style.display = 'none';
                return;
            }
            const typePriority = { '연차': 1, '반차': 2, '시간차(퇴근)': 3, '시간차(외출)': 4 };
            daysEvents.sort((a, b) => {
                const pA = typePriority[security.normalizeType(a.type)] || 99; const pB = typePriority[security.normalizeType(b.type)] || 99;
                if (pA !== pB) return pA - pB; return String(a.userName||'').localeCompare(String(b.userName||''), 'ko');
            });
            let html = `<div class="font-bold border-b pb-1 mb-2 text-gray-700">${moment(dateStr).format('M월 D일')} 일정</div>`;
            daysEvents.forEach(e => {
                const displayType = security.normalizeType(e.type);
                let detail = '';
                if (displayType === '시간차(퇴근)' || displayType === '시간차(외출)') detail = ` <span class="text-xs text-gray-500">(${e.timeRange} / ${e.hours}h)</span>`;
                html += `<div class="mb-2 last:mb-0"><div class="flex items-center flex-wrap gap-1"><span class="font-bold text-gray-800">${e.userName}</span><span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">${displayType}</span>${detail}</div>${e.reason ? `<div class="text-xs text-gray-500 mt-0.5 pl-2">- ${e.reason}</div>` : ''}</div>`;
            });
            tooltip.innerHTML = html; tooltip.style.display = 'block'; app.moveTooltip(event);
        },
        
        showMemberHistory: (userId, event) => {
            if (!app.showUsage) return;

            const tooltip = document.getElementById('custom-tooltip');
            const u = appData.users.find(user => String(user.id) === String(userId));
            if (!u) return;

            const history = appData.requests.filter(r => String(r.userId) === String(userId) && ['approved', 'cancel_requested'].includes(r.status)).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

            let html = `<div class="font-bold border-b pb-1 mb-2 text-gray-700">${u.name} 사용 내역 <span class="text-xs font-normal text-gray-500">(총 ${app.fmtTime(u.usedHours)})</span></div>`;
            if (history.length === 0) { html += '<div class="text-xs text-gray-400 p-1">사용 내역 없음</div>'; } 
            else {
                html += '<div>';
                history.forEach(r => {
                    const displayType = security.normalizeType(r.type);
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
                return app.canApproveRequest(r);
            });

            if (targets.length === 0) return alert('처리할 내역이 없습니다.');
            const msg = type === 'pending' ? '승인' : '취소 승인';
            if (!confirm(`총 ${targets.length}건을 일괄 ${msg} 하시겠습니까?`)) return;
            
            document.getElementById('loading-text').innerText = "일괄 처리 중...";
            document.getElementById('loading-overlay').style.display = 'flex';

            let emailList = [];
            for (const r of targets) {
                if (type === 'cancel' && moment(r.startDate).isBefore(moment().startOf('day'))) continue;

                r.status = (type === 'pending' ? 'approved' : 'cancelled');
                const saved = await db.upsertReq(r);
                if (!saved) {
                    document.getElementById('loading-overlay').style.display = 'none';
                    return;
                }
                let user = appData.users.find(user => String(user.id) === String(r.userId));
                if (user && user.email && !emailList.includes(user.email)) emailList.push(user.email);
            }
            document.getElementById('loading-overlay').style.display = 'none';
            if (emailList.length > 0) {
                const recipients = emailList.join(';'); 
                const subject = `[NCORE 연차관리] 연차 신청 건이 일괄 ${msg}되었습니다.`;
                const body = `안녕하세요,\n\n아래 대상자의 연차 내역이 관리자에 의해 일괄 [${msg}] 처리되었습니다.\n\n접속주소: https://ncore-comp.github.io/ncore/`;
                openOutlookDraft(recipients, subject, body);
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
            document.getElementById('req-type').value = req.type;
            const sEl = document.getElementById('req-start-date'); const eEl = document.getElementById('req-end-date');
            sEl.value = moment(req.startDate).format('YYYY-MM-DD'); eEl.value = moment(req.endDate).format('YYYY-MM-DD');
            document.getElementById('req-reason').value = req.reason;
            document.getElementById('is-multi-day').checked = req.startDate !== req.endDate;
            toggleInputs();
            if (req.timeRange && req.timeRange.includes('~')) {
                const [rawStart, rawEnd] = String(req.timeRange).split('~');
                const startHour = parseInt(rawStart, 10);
                const endHour = parseInt(rawEnd, 10);
                if (Number.isFinite(startHour) && Number.isFinite(endHour) && endHour > startHour) {
                    const duration = timeLogic.getEff(startHour, endHour);
                    if (req.type === '시간차(퇴근)') {
                        const dEl = document.getElementById('req-duration-timeoff');
                        const tEl = document.getElementById('req-end-time-timeoff');
                        if (dEl && duration >= 1 && duration <= 7) dEl.value = String(duration);
                        if (tEl) tEl.value = String(endHour);
                    } else if (req.type === '시간차(외출)') {
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
                const type = security.normalizeType(document.getElementById('req-type').value);
                const rawStartDate = document.getElementById('req-start-date').value;
                if(!rawStartDate) return alert('날짜를 선택하세요');
                const sDate = security.normalizeDate(rawStartDate);
                const isMultiDay = document.getElementById('is-multi-day').checked;
                let eDate = isMultiDay ? security.normalizeDate(document.getElementById('req-end-date').value, sDate) : sDate;
                const reason = security.cleanText(document.getElementById('req-reason').value);
                
                if(!sDate) return alert('날짜 형식이 올바르지 않습니다.');
                if(!reason) return alert('사유를 선택하세요');
                
                if (holidayLogic.isRedDay(sDate) || holidayLogic.isSat(sDate)) {
                    return alert("휴일/주말에는 신청할 수 없습니다.");
                }

                const currentStart = moment(sDate);
                const currentEnd = moment(eDate);
                const duplicate = appData.requests.find(r => {
                    if (String(r.userId) !== String(app.currentUser.id)) return false; 
                    if (['cancelled', 'rejected'].includes(r.status)) return false; 
                    if (app.editingId && String(r.id) === String(app.editingId)) return false;

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
                if(type==='연차') {
                    const days = holidayLogic.calcBizDays(sDate, eDate);
                    if(days===0) return alert('선택하신 기간은 모두 휴일입니다.');
                    hours = days*8;
                } else if(type==='반차') hours = 4;
                else if(type==='시간차(퇴근)') {
                    const d = parseInt(document.getElementById('req-duration-timeoff').value);
                    const e = parseInt(document.getElementById('req-end-time-timeoff').value);
                    hours = d; timeRange = `${timeLogic.calcStart(d,e)}:00~${e}:00`;
                } else if(type==='시간차(외출)') { 
                    const s = parseInt(document.getElementById('req-start-time-out').value, 10);
                    const d = parseInt(document.getElementById('req-duration-out').value, 10);
                    const e = calcOutEndTime(s, d);
                    if(e === null) return alert('근무시간(18:00) 안에서 설정해주세요.');
                    hours = d; timeRange = `${s}:00~${e}:00`;
                } else {
                    return alert('연차 종류 오류');
                }
                
                // [수정] 가상 차감 검증: 승인 대기 시간까지 포함
                const totalUsedAndPending = app.currentUser.usedHours + (app.currentUser.pendingHours || 0);
                const remaining = app.currentUser.totalHours - totalUsedAndPending;

                if (app.editingId) {
                    const idx = appData.requests.findIndex(r => String(r.id) === String(app.editingId));
                    if (idx !== -1) {
                        const oldReq = appData.requests[idx];
                        const oldPendingHours = oldReq.status === 'pending' ? Number(oldReq.hours || 0) : 0;
                        const editableRemaining = remaining + oldPendingHours;
                        if (hours > editableRemaining) {
                            return alert(`잔여 연차 부족\n(수정 가능 잔여: ${app.fmtTime(editableRemaining)})`);
                        }

                        const updatedReq = security.sanitizeRequest({
                            ...oldReq, type, startDate: sDate, endDate: eDate, hours, 
                            timeRange: timeRange || '', reason, timestamp: new Date().toISOString() 
                        });
                        const savedEdit = await db.upsertReq(updatedReq, { keepOverlayOnSuccess: true });
                        if (!savedEdit) return;
                        await app.logUserAction('RequestEdit', `${updatedReq.id}:${updatedReq.type}:${updatedReq.startDate}`);
                        document.getElementById('req-modal').classList.add('hidden');
                        app.refreshDashboard();
                        alert('수정되었습니다.');
                        document.getElementById('loading-overlay').style.display = 'none';
                    }
                } else {
                    if (hours > remaining) return alert(`잔여 연차 부족\n(승인 대기 포함 잔여: ${app.fmtTime(remaining)})`);
                    
                    const newReq = security.sanitizeRequest({
                        id: Date.now(), userId: app.currentUser.id, userName: app.currentUser.name, 
                        dept: app.currentUser.dept, role: app.currentUser.role, type, startDate: sDate, endDate: eDate, 
                        hours, timeRange: timeRange || '', reason, status: 'pending', 
                        timestamp: new Date().toISOString() 
                    });
                    const savedNew = await db.upsertReq(newReq, { keepOverlayOnSuccess: true });
                    if (!savedNew) return;
                    await app.logUserAction('RequestCreate', `${newReq.id}:${newReq.type}:${newReq.startDate}`);
                    document.getElementById('req-modal').classList.add('hidden');
                    app.refreshDashboard();

                    const targetEmail = app.getApproverEmail(app.currentUser);

                    if(targetEmail) {
                        const userRank = app.currentUser.rank || '';
                        const subject = `[연차신청] ${app.currentUser.name} ${userRank} - ${type}`;
                        const dateRange = (sDate === eDate) ? sDate : `${sDate} ~ ${eDate}`;
                        const body = `연차가 신청 되었습니다.\n\n접속주소: https://ncore-comp.github.io/ncore/\n\n[신청 내용]\n- 이름: ${app.currentUser.name} ${userRank}\n- 종류: ${type}\n- 기간: ${dateRange} ${timeRange ? '('+timeRange+')' : ''}\n- 사유: ${reason}`;
                        openOutlookDraft(targetEmail, subject, body);
                        alert('저장이 완료되었습니다. 아웃룩 창이 뜨면 [보내기]를 눌러주세요.');
                    } else { alert('저장이 완료되었습니다.'); }
                    document.getElementById('loading-overlay').style.display = 'none';
                }
            } catch (err) {
                console.error(err);
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
            
            if(action === 'approve') { req.status = 'approved'; mailType = '승인'; }
            else if(action === 'reject') { req.status = 'rejected'; mailType = '반려'; }
            else if(action === 'cancel_req') {
                if (req.status === 'pending') {
                    if(!confirm('취소하시겠습니까?')) return;
                    req.status = 'cancelled';
                } else if (req.status === 'approved') {
                    if(!confirm('취소 요청을 올리시겠습니까?')) return;
                    req.status = 'cancel_requested';
                    shouldSendCancelRequestMail = true;
                }
            } 
            else if(action === 'cancel_approve') { req.status = 'cancelled'; mailType = '취소승인'; }
            else if(action === 'cancel_reject') { req.status = 'approved'; }

            const savedReq = await db.upsertReq(req, { keepOverlayOnSuccess: true });
            if (!savedReq) return;
            try {
                await app.logUserAction('RequestProcess', `${safeId}:${action}`);

                if (action === 'cancel_req' && shouldSendCancelRequestMail) {
                    const targetEmail = app.getApproverEmail(app.currentUser);
                    if (targetEmail) {
                        const userRank = app.currentUser.rank || '';
                        const sFmt = moment(req.startDate).format('YYYY-MM-DD');
                        const eFmt = moment(req.endDate).format('YYYY-MM-DD');
                        const dateRange = (sFmt === eFmt) ? sFmt : `${sFmt} ~ ${eFmt}`;
                        const subject = `[연차취소요청] ${app.currentUser.name} ${userRank} - ${security.normalizeType(req.type)}`;
                        const body = `연차 취소 요청이 등록되었습니다.\n\n접속주소: https://ncore-comp.github.io/ncore/\n\n[요청 내용]\n- 이름: ${app.currentUser.name} ${userRank}\n- 종류: ${security.normalizeType(req.type)}\n- 기간: ${dateRange}\n- 사유: ${req.reason || '-'}`;
                        openOutlookDraft(targetEmail, subject, body);
                        alert('취소 요청이 저장되었습니다. 아웃룩 창이 뜨면 [보내기]를 눌러주세요.');
                    } else {
                        alert('취소 요청이 저장되었습니다. (결재자 이메일 정보가 없습니다.)');
                    }
                }
                
                if (mailType && action !== 'cancel_req') {
                    let targetUser = appData.users.find(u => String(u.id) === String(req.userId));
                    if (targetUser?.email) {
                        const subject = `[연차${mailType}] 신청하신 연차가 ${mailType}되었습니다.`;
                        const sFmt = moment(req.startDate).format('YYYY-MM-DD');
                        const eFmt = moment(req.endDate).format('YYYY-MM-DD');
                        const dateRange = (sFmt === eFmt) ? sFmt : `${sFmt} ~ ${eFmt}`;
                        const body = `${targetUser.name} ${targetUser.rank || ''}님,\n\n신청하신 연차가 관리자에 의해 [${mailType}] 처리되었습니다.\n\n- 기간: ${dateRange}\n\n접속주소: https://ncore-comp.github.io/ncore/`;
                        openOutlookDraft(targetUser.email, subject, body);
                        alert(`처리되었습니다. 아웃룩 창이 뜨면 [보내기]를 눌러주세요.`);
                    } else { 
                        alert('처리되었습니다. (대상자의 이메일 정보가 없습니다.)'); 
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
            await db.deleteReq(security.cleanInlineValue(id));
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
            if(inputUser.password.length < 4) return alert('비밀번호는 4자 이상으로 입력하세요.');
            if(!security.isValidEmail(inputUser.email)) return alert('이메일 형식이 올바르지 않습니다.');
            if(appData.users.some(u => String(u.id) === String(inputUser.id))) return alert('이미 존재하는 ID입니다.');

            const days = parseFloat(rawDays || 15);
            const totalHours = Number.isFinite(days) && days > 0 ? days * 8 : 15 * 8;
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

        ensureUserEditModal: () => {
            if (document.getElementById('user-edit-modal')) return;
            const modal = document.createElement('div');
            modal.id = 'user-edit-modal';
            modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm hidden flex justify-center items-center z-50 fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
                    <div class="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 id="user-edit-title" class="font-bold text-xl text-gray-800">직원 정보 수정</h3>
                        <button onclick="app.closeUserEditModal()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                    </div>
                    <input type="hidden" id="edit-user-id">
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
                    <div id="edit-user-pw-wrap" class="mb-4">
                        <label class="block text-xs font-bold text-gray-500 mb-1">비밀번호 초기화(마스터 전용)</label>
                        <input id="edit-user-pw" type="password" placeholder="새 비밀번호(4자 이상)" class="w-full border bg-gray-50 p-2.5 rounded">
                    </div>
                    <div class="flex justify-end gap-2">
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
                const savedUser = await db.upsertUser(u);
                if (savedUser && String(savedUser.id) === String(app.currentUser.id)) {
                    app.currentUser = { ...app.currentUser, ...savedUser };
                    delete app.currentUser.password;
                }
                alert('수정 완료');
            } catch (e) { console.error(e); alert('오류: ' + e.message); } finally { app.editingId = null; app.closeUserEditModal(); app.renderUserManagement(); }
        },

        deleteUser: async (id) => {
            if (!app.hasUserManagePermission()) return alert('구성원 관리 권한이 없습니다.');
            if(!confirm('삭제하시겠습니까?')) return;
            const safeId = security.cleanInlineValue(id);
            if (!app.canManageTargetUser(safeId)) return alert('해당 구성원 삭제 권한이 없습니다.');
            const target = appData.users.find(u => String(u.id) === String(safeId));
            if (!target) return alert('사용자를 찾을 수 없습니다.');
            if (target.role === 'master') return alert('마스터 계정은 삭제할 수 없습니다.');
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
            const validRequests = requests.filter(r => !['cancelled', 'rejected'].includes(r.status));
            let viewReqs = app.getCalendarRequests(validRequests, viewer);
            let html = `<div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden"><div class="px-4 pt-3 border-b border-gray-200 bg-gray-50/60 flex flex-wrap items-end justify-between gap-2">${app.renderCalendarTabs()}<div class="flex items-center pb-1"><label class="inline-flex items-center cursor-pointer"><input type="checkbox" ${app.showPastShading ? 'checked' : ''} onchange="app.togglePastShading()" class="sr-only peer"><div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div><span class="ms-2 text-xs font-medium text-gray-500">지난 날짜 음영</span></label></div></div><div class="px-4 py-3 border-b border-gray-200 flex items-center"><button onclick="app.changeMonth(-1)" class="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition"><i class="fa-solid fa-chevron-left text-gray-600"></i></button><h3 class="text-2xl font-bold text-gray-800 mx-4">${year}년 ${month+1}월 <span class="text-base font-normal text-gray-500">(${viewer.dept})</span></h3><button onclick="app.changeMonth(1)" class="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition"><i class="fa-solid fa-chevron-right text-gray-600"></i></button></div><div class="calendar-grid"><div class="calendar-header-cell text-red-500">일</div><div class="calendar-header-cell">월</div><div class="calendar-header-cell">화</div><div class="calendar-header-cell">수</div><div class="calendar-header-cell">목</div><div class="calendar-header-cell">금</div><div class="calendar-header-cell text-blue-500">토</div>`;
            const firstDayIdx = new Date(year, month, 1).getDay(); const lastDate = new Date(year, month + 1, 0).getDate();
            for(let i=0; i<firstDayIdx; i++) html += `<div class="calendar-cell bg-gray-50/50"></div>`;
            const typePriority = { '연차': 1, '반차': 2, '시간차(퇴근)': 3, '시간차(외출)': 4 };
            for(let d=1; d<=lastDate; d++) {
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const curDate = moment(dateStr); const isToday = curDate.isSame(today, 'day'); const isPast = curDate.isBefore(today, 'day'); const applyShading = isPast && app.showPastShading;
                const evts = viewReqs.filter(r =>
                    curDate.isBetween(r.startDate, r.endDate, 'day', '[]') &&
                    app.shouldRenderRequestOnDate(r, dateStr)
                );
                evts.sort((a, b) => { const pA = typePriority[security.normalizeType(a.type)] || 99; const pB = typePriority[security.normalizeType(b.type)] || 99; if (pA !== pB) return pA - pB; return String(a.userName||'').localeCompare(String(b.userName||''), 'ko'); });
                const isRed = holidayLogic.isRedDay(dateStr); const isSat = holidayLogic.isSat(dateStr); const holName = holidayLogic.getHolName(dateStr);
                let evtHtml = evts.map(e => {
                    const isMe = String(e.userId) === String(viewer.id); const isCancel = e.status === 'cancel_requested';
                    const eventType = security.normalizeType(e.type);
                    let className = 'text-[10px] px-1 py-0.5 rounded mb-1 truncate border-l-4 '; 
                    if (isCancel) className += 'bg-white border-red-500 text-red-600 animate-pulse font-bold border-l';
                    else if (isMe) className += 'bg-indigo-600 text-white font-black border-indigo-800';
                    else { if(eventType === '연차') className += 'bg-lime-200 text-lime-800 border-lime-600'; else if(eventType === '반차') className += 'bg-orange-100 text-orange-800 border-orange-500'; else if(eventType === '시간차(퇴근)') className += 'bg-yellow-200 text-yellow-900 border-yellow-600'; else if(eventType === '시간차(외출)') className += 'bg-stone-200 text-stone-800 border-stone-500'; else className += 'bg-gray-100 text-gray-700 border-gray-500'; }
                    const displayType = eventType;
                    return `<div class="${className}">${e.userName}${displayType!=='연차'?`(${displayType})`:''}</div>`;
                }).join('');
                html += `<div class="calendar-cell hover:bg-gray-50 ${applyShading ? 'bg-gray-50' : ''}" onmouseenter="app.showTooltip('${dateStr}', event)" onmousemove="app.moveTooltip(event)" onmouseleave="app.hideTooltip()"><div class="flex justify-between items-start mb-1 ${applyShading ? 'opacity-40' : ''}"><span class="text-sm font-bold ml-1 mt-1 ${isToday?'today-circle':(isRed?'holiday-text':(isSat?'sat-text':'text-gray-700'))}">${d}</span>${holName ? `<span class="text-[10px] text-white bg-red-400 px-1 rounded truncate max-w-[60px]">${holName}</span>` : ''}</div><div class="grid grid-cols-2 gap-1 overflow-y-auto max-h-[100px] px-1 custom-scrollbar ${applyShading ? 'opacity-60 grayscale' : ''}">${evtHtml}</div></div>`;
            }
            return html + `</div>`;
        },

        renderEmployeeDashboard: () => {
            const u = app.currentUser, reqs = appData.requests.filter(r=>String(r.userId)===String(u.id)).sort((a,b)=>b.id-a.id);
            const totalItems = reqs.length;
            const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
            if (app.currentPage > totalPages && totalPages > 0) app.currentPage = Math.max(1, totalPages);
            const startIdx = (app.currentPage - 1) * ITEMS_PER_PAGE;
            const endIdx = startIdx + ITEMS_PER_PAGE;
            const pagedReqs = reqs.slice(startIdx, endIdx);

            // [수정] 승인 대기 연차 표시 및 3단계 현황판 적용 (Case C)
            const myStatusCard = app.renderMyStatusCard(u, {
                titleClass: 'text-2xl',
                remainClass: 'text-4xl',
                subtitle: app.getEnglishRoleLabel(u)
            });
            document.getElementById('app-container').innerHTML = `<div class="w-full max-w-7xl mx-auto px-4 fade-in pt-8 pb-12">${myStatusCard}<div class="mb-4 flex justify-end"><button onclick="document.getElementById('req-modal').classList.remove('hidden'); app.initModal();" class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md shadow-indigo-200"><i class="fa-solid fa-plus mr-2"></i> 연차 신청</button></div><div class="mb-10">${app.renderCal(appData.requests, u)}</div><div class="flex justify-between items-center mb-4"><h3 class="text-lg font-bold">최근 신청 내역</h3></div><div class="bg-white rounded-xl shadow-sm border overflow-hidden">${totalItems===0?'<div class="p-8 text-center text-gray-400">내역 없음</div>':pagedReqs.map(r=> {
                const displayType = security.normalizeType(r.type);
                let badgeClass = '';
                if(displayType === '연차') badgeClass = 'bg-lime-200 text-lime-900'; else if(displayType === '반차') badgeClass = 'bg-orange-100 text-orange-800'; else if(displayType === '시간차(퇴근)') badgeClass = 'bg-yellow-200 text-yellow-900'; else if(displayType === '시간차(외출)') badgeClass = 'bg-stone-200 text-stone-800'; else badgeClass = 'bg-gray-100 text-gray-700';
                const formattedDate = r.startDate===r.endDate ? app.fmtDate(r.startDate) : app.fmtDate(r.startDate)+'~'+app.fmtDate(r.endDate);
                return `<div class="p-5 border-b last:border-0 hover:bg-gray-50 flex justify-between items-center"><div class="flex-grow"><div class="flex items-center space-x-2 mb-1"><span class="px-2 py-0.5 rounded text-xs font-bold ${badgeClass}">${displayType}</span><span class="font-bold text-lg">${formattedDate}</span>${r.timeRange?`<span class="text-sm font-bold text-gray-500 bg-gray-100 px-2 rounded ml-2">(${r.timeRange})</span>`:''}</div><p class="text-sm text-gray-500 pl-1"><span class="font-medium text-gray-700">${r.reason}</span> | <span class="text-gray-400">${app.formatDeductionText(r)}</span></p></div><div class="flex flex-col items-end min-w-[80px]"><span class="font-bold px-3 py-1 rounded-full text-xs text-center ml-auto mb-1 ${r.status==='approved'?'bg-green-100 text-green-700':(r.status==='rejected'?'bg-red-100 text-red-700':(r.status==='pending'?'bg-yellow-100 text-yellow-700':'bg-gray-200 text-gray-500'))}">${r.status==='pending'?'승인 대기':(r.status==='approved'?'승인 완료':(r.status==='rejected'?'반려됨':(r.status==='cancel_requested'?'취소 요청중':'취소됨')))}</span>${r.status==='pending'?`<button onclick="app.editReq('${r.id}')" class="text-xs text-indigo-500 underline hover:text-indigo-700 font-bold text-right mb-1 pr-3">수정</button>`:''} ${app.canRequestCancel(r) ? `<button onclick="app.processReq('${r.id}','cancel_req')" class="text-xs text-gray-400 underline hover:text-red-500 text-right pr-3">취소</button>` : ''} ${['cancelled','rejected'].includes(r.status)?`<button onclick="app.deleteReq('${r.id}')" class="text-xs text-gray-400 underline hover:text-red-600 text-right pr-3"><i class="fa-regular fa-trash-can mr-1"></i>삭제</button>`:''}</div></div>`;
            }).join('')}</div>${totalItems > 0 ? `<div class="flex justify-center items-center mt-4 space-x-2"><button ${app.currentPage === 1 ? 'disabled' : ''} onclick="app.changePage(${app.currentPage - 1})" class="px-3 py-1 rounded border ${app.currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">이전</button><span class="text-sm text-gray-600 font-medium">${app.currentPage} / ${totalPages}</span><button ${app.currentPage === totalPages ? 'disabled' : ''} onclick="app.changePage(${app.currentPage + 1})" class="px-3 py-1 rounded border ${app.currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">다음</button></div>` : ''}</div>${app.getModal()}`;
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
                    return `<div class="${bgStyle} p-5 rounded-xl shadow-sm border mb-8"><div class="flex justify-between items-center mb-4"><h3 class="font-bold ${titleColor} flex items-center"><i class="fa-solid fa-users mr-2 ${iconColor}"></i> 팀원 연차 현황 / ${deptName}</h3><div class="flex items-center gap-3"><label class="inline-flex items-center cursor-pointer"><input type="checkbox" class="sr-only peer" onchange="app.toggleUsage()" ${app.showUsage ? 'checked' : ''}><div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div><span class="ms-2 text-xs font-medium text-gray-500">사용 내역</span></label><span class="text-[11px] ${cardFeatureEnabled ? 'text-indigo-600' : 'text-gray-400'}">${cardFeatureEnabled ? '직원 카드 켜짐' : '직원 카드 꺼짐'}</span></div></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${deptMembers.map(m => { const safeId = security.cleanInlineValue(m.id); const clickAttr = cardFeatureEnabled ? `onclick=\"app.openMemberCard('${safeId}')\"` : ''; const isSelected = cardFeatureEnabled && String(app.selectedMemberId) === String(safeId); const selectedClass = isSelected ? 'member-card-selected' : ''; const cardClass = cardFeatureEnabled ? 'cursor-pointer hover:shadow-md hover:border-indigo-200' : 'cursor-default'; const usedGaugePercent = app.getUsageGaugePercent(m.usedHours, m.totalHours); const usedGaugeText = usedGaugePercent.toFixed(0).replace(/\.0$/, ''); const usedGaugeWidth = usedGaugePercent <= 0 ? '0%' : (usedGaugePercent < 3 ? '3%' : `${usedGaugePercent}%`); return `<div data-member-card="1" data-member-id="${safeId}" class="bg-white border border-white/50 rounded-lg p-3 shadow-sm transition ${cardClass} ${selectedClass} group" ${clickAttr} onmouseenter="app.showMemberHistory('${safeId}', event)" onmousemove="app.moveTooltip(event)" onmouseleave="app.hideTooltip()"><div class="flex justify-between items-center"><div><div class="font-bold text-gray-800">${m.name} <span class="text-xs text-gray-500">(${app.getUserTitleText(m)})</span></div>${app.showUsage ? `<div class="mt-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded inline-block">사용: ${app.fmtTime(m.usedHours)}</div>` : ''}</div><div class="text-right"><div class="text-sm font-bold ${m.totalHours-m.usedHours<0?'text-red-600':'text-indigo-600'}">${app.fmtTime(m.totalHours-m.usedHours)} 남음</div><div class="text-[10px] text-gray-400 mt-0.5">/ 총 ${app.fmtTime(m.totalHours)}</div></div></div><div class="mt-3 flex items-center gap-2"><div class="h-2.5 flex-1 rounded-full bg-slate-100 border border-slate-200 overflow-hidden"><div class="h-full rounded-full bg-indigo-500 transition-all duration-300" style="width:${usedGaugeWidth}; ${usedGaugePercent <= 0 ? 'display:none;' : ''}"></div></div><div class="text-[10px] font-bold text-gray-400 min-w-[28px] text-right">${usedGaugeText}%</div></div></div>`; }).join('')}</div></div>`;
                }).join('');
            }
            
            // [수정] 관리자 모드에서도 '승인 대기' 연차 표시 (Case C 적용)
            const myStatusCard = isEffectiveCEO ? '' : app.renderMyStatusCard(app.currentUser, {
                titleClass: 'text-lg',
                remainClass: 'text-3xl',
                subtitle: app.getEnglishRoleLabel(app.currentUser)
            });
            const myReqs = appData.requests.filter(r=>String(r.userId)===String(u.id)).sort((a,b)=>b.id-a.id);
            const totalItems = myReqs.length;
            const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
            if (app.currentPage > totalPages && totalPages > 0) app.currentPage = Math.max(1, totalPages);
            const startIdx = (app.currentPage - 1) * ITEMS_PER_PAGE;
            const endIdx = startIdx + ITEMS_PER_PAGE;
            const pagedReqs = myReqs.slice(startIdx, endIdx);

            const myReqsSection = isEffectiveCEO ? '' : `<div class="flex justify-between items-center mb-4 px-1"><h3 class="text-lg font-bold text-gray-800">내 최근 신청 내역</h3></div><div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">${totalItems === 0 ? '<div class="p-8 text-center text-gray-400">신청 내역이 없습니다.</div>' : pagedReqs.map(r=> { const displayType = security.normalizeType(r.type); let badgeClass = ''; if(displayType === '연차') badgeClass = 'bg-lime-200 text-lime-900'; else if(displayType === '반차') badgeClass = 'bg-orange-100 text-orange-700'; else if(displayType === '시간차(퇴근)') badgeClass = 'bg-yellow-200 text-yellow-900'; else if(displayType === '시간차(외출)') badgeClass = 'bg-stone-200 text-stone-800'; else badgeClass = 'bg-gray-100 text-gray-700'; return `<div class="p-5 border-b last:border-0 hover:bg-gray-50 flex justify-between items-center"><div class="flex-grow"><div class="flex items-center space-x-2 mb-1"><span class="px-2 py-0.5 rounded text-xs font-bold ${badgeClass}">${displayType}</span><span class="font-bold text-lg">${r.startDate===r.endDate?app.fmtDate(r.startDate):app.fmtDate(r.startDate)+'~'+app.fmtDate(r.endDate)}</span>${r.timeRange?`<span class="text-sm font-bold text-gray-500 bg-gray-100 px-2 rounded ml-2">(${r.timeRange})</span>`:''}</div><p class="text-sm text-gray-500 pl-1"><span class="font-medium text-gray-700">${r.reason}</span> | <span class="text-gray-400">${app.formatDeductionText(r)}</span></p></div><div class="flex flex-col items-end min-w-[80px]"><span class="font-bold px-3 py-1 rounded-full text-xs text-center ml-auto mb-1 ${r.status==='approved'?'bg-green-100 text-green-700':(r.status==='rejected'?'bg-red-100 text-red-700':(r.status==='pending'?'bg-yellow-100 text-yellow-700':'bg-gray-200 text-gray-500'))}">${r.status==='pending'?'승인 대기':(r.status==='approved'?'승인 완료':(r.status==='rejected'?'반려됨':(r.status==='cancel_requested'?'취소 요청중':'취소됨')))}</span>${r.status==='pending'?`<button onclick="app.editReq('${r.id}')" class="text-xs text-indigo-500 underline hover:text-indigo-700 font-bold text-right mb-1 pr-3">수정</button>`:''} ${app.canRequestCancel(r)?`<button onclick="app.processReq('${r.id}','cancel_req')" class="text-xs text-gray-400 underline hover:text-red-500 text-right pr-3">취소</button>`:''} ${['cancelled','rejected'].includes(r.status)?`<button onclick="app.deleteReq('${r.id}')" class="text-xs text-gray-400 underline hover:text-red-600 text-right pr-3"><i class="fa-regular fa-trash-can mr-1"></i>삭제</button>`:''}</div></div>`; }).join('')}</div>${totalItems > 0 && !isEffectiveCEO ? `<div class="flex justify-center items-center -mt-6 mb-8 space-x-2"><button ${app.currentPage === 1 ? 'disabled' : ''} onclick="app.changePage(${app.currentPage - 1})" class="px-3 py-1 rounded border ${app.currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">이전</button><span class="text-sm text-gray-600 font-medium">${app.currentPage} / ${totalPages}</span><button ${app.currentPage === totalPages ? 'disabled' : ''} onclick="app.changePage(${app.currentPage + 1})" class="px-3 py-1 rounded border ${app.currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">다음</button></div>` : ''}`;

            let dashboardTitle = (u.role === 'team_leader') ? '팀리더 대시보드' : (u.role === 'part_leader' ? '파트리더 대시보드' : '직원 대시보드');
            if (hasMasterLevel) dashboardTitle = '시스템 최고 관리자 대시보드';
            else if (isEffectiveCEO) dashboardTitle = '대표 대시보드';

            const approvalSection = !canApprove ? '' : `<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"><div class="bg-white rounded-xl shadow-sm border p-5"><div class="flex justify-between items-center mb-4"><h3 class="font-bold text-indigo-800 flex items-center"><i class="fa-regular fa-clock mr-2"></i> 결재 대기</h3><button onclick="app.approveAll('pending')" class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-bold transition">모두 승인</button></div><div class="space-y-3">${pendings.filter(r=>r.status==='pending').map(r=> { const displayType = security.normalizeType(r.type); return `<div class="border border-sky-200 bg-sky-50/70 p-4 rounded-lg flex justify-between items-center"><div><span class="font-bold">${r.userName}</span> <span class="text-xs text-gray-500">${r.dept}</span><div class="text-sm text-indigo-600 font-bold mt-1">${displayType} | ${r.reason}</div><div class="text-xs text-gray-400 mt-1">${app.fmtDate(r.startDate)}${r.startDate!==r.endDate ? ' ~ '+app.fmtDate(r.endDate) : ''}</div></div><div class="flex flex-col gap-1"><button onclick="app.processReq('${r.id}','approve')" class="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold">승인</button><button onclick="app.processReq('${r.id}','reject')" class="bg-gray-100 text-gray-600 px-3 py-1.5 rounded text-xs">반려</button></div></div>`; }).join('') || '<div class="text-center text-gray-400 py-4">대기 없음</div>'}</div></div><div class="bg-white rounded-xl shadow-sm border p-5"><div class="flex justify-between items-center mb-4"><h3 class="font-bold text-red-600 flex items-center"><i class="fa-solid fa-triangle-exclamation mr-2"></i> 취소 요청</h3><button onclick="app.approveAll('cancel')" class="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 font-bold transition">모두 승인</button></div><div class="space-y-3">${pendings.filter(r=>r.status==='cancel_requested').map(r=>`<div class="border border-amber-200 bg-amber-50/80 p-4 rounded-lg flex justify-between items-center"><div><span class="font-bold">${r.userName}</span><div class="text-xs text-red-500 font-bold mt-1">취소 요청됨</div><div class="text-xs text-gray-400">${app.fmtDate(r.startDate)}</div></div><div class="flex flex-col gap-1"><button onclick="app.processReq('${r.id}','cancel_approve')" class="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold">취소 승인</button><button onclick="app.processReq('${r.id}','cancel_reject')" class="bg-white border px-3 py-1.5 rounded text-xs">반려</button></div></div>`).join('') || '<div class="text-center text-gray-400 py-4">요청 없음</div>'}</div></div></div>`;
            const managerQuickAction = isEffectiveCEO ? '' : `<div class="mb-4 flex justify-end"><button onclick="document.getElementById('req-modal').classList.remove('hidden'); app.initModal();" class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md shadow-indigo-200"><i class="fa-solid fa-plus mr-2"></i> 연차 신청</button></div>`;
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
                    approveScope: existingPerms.approveScope,
                    memberStatusScope: existingPerms.memberStatusScope,
                    canAccessMasterSettings: getCheckedOrExisting(`perm-master-access-${safeId}`, existingPerms.canAccessMasterSettings),
                    canManageUsers: getCheckedOrExisting(`perm-manage-${safeId}`, existingPerms.canManageUsers)
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

                if (!permissions.calendarSelf && !permissions.calendarManual && !permissions.calendarParts && !permissions.calendarAll) {
                    permissions.calendarSelf = true;
                }

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
        saveMasterSettings: async () => {
            if (!app.currentUser || app.currentUser.role !== 'master') {
                alert('설정 저장은 마스터만 가능합니다.');
                return;
            }
            const memberCardToggle = document.getElementById('global-member-card-toggle');
            const homepageToggle = document.getElementById('global-homepage-toggle');
            const boardToggle = document.getElementById('global-board-toggle');
            const memberCardEnabled = memberCardToggle ? memberCardToggle.checked : app.isMemberCardFeatureEnabled();
            const homepageEnabled = homepageToggle ? homepageToggle.checked : app.isHomepageFeatureEnabled();
            const boardEnabled = boardToggle ? boardToggle.checked : app.isBoardFeatureEnabled();
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
                    permissions: security.sanitizePermissions(masterUser.permissions || {}, 'master', masterUser.dept)
                }, {
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
                        featureBoard: savedMaster.featureBoard
                    };
                }
                try {
                    await app.logUserAction('SettingSave', `memberCard:${memberCardEnabled}|homepage:${homepageEnabled}|board:${boardEnabled}`);
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
            if (app.masterPermissionTab === 'settings') return app.saveMasterSettings();
            return app.saveMasterPermissionTable();
        },
        setMasterPermissionTab: (tab) => {
            app.masterPermissionTab = tab === 'settings' ? 'settings' : 'permissions';
            app.renderMasterPermissionPage();
        },
        setPermissionColumnOpen: (group) => {
            const safeGroup = ['calendar', 'approve', 'memberStatus'].includes(group) ? group : 'calendar';
            app.permissionColumnOpen = safeGroup;
            app.renderMasterPermissionPage();
        },
        renderMasterPermissionPage: () => {
            if (!app.hasMasterPermissionAccess()) {
                alert('권한/설정 권한이 없습니다.');
                return app.refreshDashboard();
            }
            app.currentView = 'master-permissions';
            app.renderNav();

            const activeTab = app.masterPermissionTab === 'settings' ? 'settings' : 'permissions';
            const memberCardEnabled = app.isMemberCardFeatureEnabled();
            const homepageEnabled = app.isHomepageFeatureEnabled();
            const boardEnabled = app.isBoardFeatureEnabled();
            const openGroup = ['calendar', 'approve', 'memberStatus'].includes(app.permissionColumnOpen) ? app.permissionColumnOpen : 'calendar';
            const isCalendarOpen = openGroup === 'calendar';
            const isApproveOpen = openGroup === 'approve';
            const isMemberStatusOpen = openGroup === 'memberStatus';
            const users = [...appData.users].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ko'));
            const rows = users.map(user => {
                const safeId = security.cleanInlineValue(user.id);
                const perms = security.sanitizePermissions(user.permissions || {}, user.role, user.dept);
                const isMasterRow = user.role === 'master';
                const isCeoRow = user.role === 'ceo';
                const isManagerRow = user.role === 'team_leader';
                const isPartLeaderRow = user.role === 'part_leader';
                const rowToneClass = isCeoRow
                    ? 'bg-amber-100/70'
                    : (isManagerRow ? 'bg-blue-100/70' : (isPartLeaderRow ? 'bg-rose-100/70' : ''));
                const rowClass = `border-b last:border-0 ${rowToneClass ? 'hover:brightness-95' : 'hover:bg-gray-50'}`;
                const nameBorderClass = isCeoRow
                    ? 'border-l-4 border-amber-400'
                    : (isManagerRow ? 'border-l-4 border-blue-500' : (isPartLeaderRow ? 'border-l-4 border-rose-500' : ''));
                const roleBadges = [
                    isCeoRow ? '<span class="ml-2 px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-700 font-bold">대표</span>' : '',
                    isManagerRow ? '<span class="ml-1 px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-800 font-bold">팀리더</span>' : '',
                    isPartLeaderRow ? '<span class="ml-1 px-2 py-0.5 rounded-full text-[11px] bg-rose-100 text-rose-800 font-bold">파트리더</span>' : ''
                ].join('');
                const infoCellBgClass = rowToneClass || '';
                const calCellBgClass = rowToneClass || 'bg-indigo-50';
                const approveCellBgClass = rowToneClass || 'bg-emerald-50';
                const memberStatusCellBgClass = rowToneClass || 'bg-violet-50';
                const masterAccessCellBgClass = rowToneClass || 'bg-fuchsia-50';
                const manageCellBgClass = rowToneClass || 'bg-amber-50';
                const calendarCells = `<td class="p-3 align-middle text-center border-l-2 border-indigo-100 ${calCellBgClass}"><input class="w-4 h-4 align-middle accent-indigo-600 border-gray-300 rounded" type="checkbox" id="perm-cal-self-${safeId}" ${perms.calendarSelf ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                    <td class="p-3 align-middle text-center ${calCellBgClass}"><input class="w-4 h-4 align-middle accent-indigo-600 border-gray-300 rounded" type="checkbox" id="perm-cal-manual-${safeId}" ${perms.calendarManual ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                    <td class="p-3 align-middle text-center ${calCellBgClass}"><input class="w-4 h-4 align-middle accent-indigo-600 border-gray-300 rounded" type="checkbox" id="perm-cal-parts-${safeId}" ${perms.calendarParts ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                    <td class="p-3 align-middle text-center border-r-2 border-indigo-100 ${calCellBgClass}"><input class="w-4 h-4 align-middle accent-indigo-600 border-gray-300 rounded" type="checkbox" id="perm-cal-all-${safeId}" ${perms.calendarAll ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>`;
                const approveCells = `<td class="p-3 align-middle text-center border-l-2 border-emerald-100 ${approveCellBgClass}"><input class="w-4 h-4 align-middle accent-emerald-600 border-gray-300 rounded" type="checkbox" id="perm-approve-manual-${safeId}" ${perms.approveScope==='manual' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleApproveScopeCheckbox('${safeId}','manual',this.checked)"></td>
                    <td class="p-3 align-middle text-center ${approveCellBgClass}"><input class="w-4 h-4 align-middle accent-emerald-600 border-gray-300 rounded" type="checkbox" id="perm-approve-parts-${safeId}" ${perms.approveScope==='parts' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleApproveScopeCheckbox('${safeId}','parts',this.checked)"></td>
                    <td class="p-3 align-middle text-center border-r-2 border-emerald-100 ${approveCellBgClass}"><input class="w-4 h-4 align-middle accent-emerald-600 border-gray-300 rounded" type="checkbox" id="perm-approve-all-${safeId}" ${perms.approveScope==='all' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleApproveScopeCheckbox('${safeId}','all',this.checked)"></td>`;
                const memberStatusCells = `<td class="p-3 align-middle text-center border-l-2 border-violet-100 ${memberStatusCellBgClass}"><input class="w-4 h-4 align-middle accent-violet-600 border-gray-300 rounded" type="checkbox" id="perm-member-status-manual-${safeId}" ${perms.memberStatusScope==='manual' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleMemberStatusScopeCheckbox('${safeId}','manual',this.checked)"></td>
                    <td class="p-3 align-middle text-center ${memberStatusCellBgClass}"><input class="w-4 h-4 align-middle accent-violet-600 border-gray-300 rounded" type="checkbox" id="perm-member-status-parts-${safeId}" ${perms.memberStatusScope==='parts' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleMemberStatusScopeCheckbox('${safeId}','parts',this.checked)"></td>
                    <td class="p-3 align-middle text-center border-r-2 border-violet-100 ${memberStatusCellBgClass}"><input class="w-4 h-4 align-middle accent-violet-600 border-gray-300 rounded" type="checkbox" id="perm-member-status-all-${safeId}" ${perms.memberStatusScope==='all' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleMemberStatusScopeCheckbox('${safeId}','all',this.checked)"></td>`;
                const activeGroupCells = isCalendarOpen ? calendarCells : (isApproveOpen ? approveCells : memberStatusCells);

                return `<tr class="${rowClass}">
                    <td class="p-3 align-middle font-bold ${nameBorderClass} ${infoCellBgClass}">${user.name}${isMasterRow ? ' (MASTER)' : ''}${roleBadges}</td>
                    <td class="p-3 align-middle text-sm text-gray-600 ${infoCellBgClass}">${user.dept || '-'}</td>
                    <td class="p-3 align-middle text-sm text-gray-600 ${infoCellBgClass}">${user.rank || '-'}</td>
                    <td class="p-3 align-middle text-sm text-gray-600 ${infoCellBgClass}">${app.getRoleLabelKo(user)}</td>
                    ${activeGroupCells}
                    <td class="p-3 align-middle text-center ${masterAccessCellBgClass}"><input class="w-4 h-4 align-middle accent-fuchsia-600 border-gray-300 rounded" type="checkbox" id="perm-master-access-${safeId}" ${perms.canAccessMasterSettings ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                    <td class="p-3 align-middle text-center ${manageCellBgClass}"><input class="w-4 h-4 align-middle accent-amber-600 border-gray-300 rounded" type="checkbox" id="perm-manage-${safeId}" ${perms.canManageUsers ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
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
            </div>`;

            const groupButtons = `<div class="px-4 pt-4 pb-2 bg-white">
                <div class="inline-flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200 shadow-inner">
                    <button onclick="app.setPermissionColumnOpen('calendar')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isCalendarOpen ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-600 hover:text-indigo-700'}">달력정보</button>
                    <button onclick="app.setPermissionColumnOpen('approve')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isApproveOpen ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' : 'text-gray-600 hover:text-emerald-700'}">승인권한</button>
                    <button onclick="app.setPermissionColumnOpen('memberStatus')" class="px-4 py-2 rounded-lg text-sm font-bold transition ${isMemberStatusOpen ? 'bg-white text-violet-700 shadow-sm border border-violet-100' : 'text-gray-600 hover:text-violet-700'}">팀원 연차현황</button>
                </div>
            </div>`;
            const activeGroupTitle = isCalendarOpen ? '달력정보' : (isApproveOpen ? '승인권한' : '팀원 연차현황');
            const activeGroupHeaderClass = isCalendarOpen
                ? 'bg-indigo-50 text-indigo-700 border-l border-indigo-100 border-r'
                : (isApproveOpen ? 'bg-emerald-50 text-emerald-700 border-l border-emerald-100 border-r' : 'bg-violet-50 text-violet-700 border-l border-violet-100 border-r');
            const activeGroupSubHeader = isCalendarOpen
                ? `<th class="p-3 bg-indigo-50 border-b border-gray-200 text-center border-l border-indigo-100">자기연차</th>
                    <th class="p-3 bg-indigo-50 border-b border-gray-200 text-center">매뉴얼팀</th>
                    <th class="p-3 bg-indigo-50 border-b border-gray-200 text-center">파츠북팀</th>
                    <th class="p-3 bg-indigo-50 border-b border-gray-200 text-center border-r border-indigo-100">모두</th>`
                : (isApproveOpen
                    ? `<th class="p-3 bg-emerald-50 border-b border-gray-200 text-center border-l border-emerald-100">매뉴얼</th>
                        <th class="p-3 bg-emerald-50 border-b border-gray-200 text-center">파츠북</th>
                        <th class="p-3 bg-emerald-50 border-b border-gray-200 text-center border-r border-emerald-100">모두</th>`
                    : `<th class="p-3 bg-violet-50 border-b border-gray-200 text-center border-l border-violet-100">매뉴얼</th>
                        <th class="p-3 bg-violet-50 border-b border-gray-200 text-center">파츠북</th>
                        <th class="p-3 bg-violet-50 border-b border-gray-200 text-center border-r border-violet-100">모두</th>`);
            const activeGroupColSpan = isCalendarOpen ? 4 : 3;
            const permissionColGroup = isCalendarOpen
                ? `<colgroup>
                    <col style="width: 190px;">
                    <col style="width: 120px;">
                    <col style="width: 100px;">
                    <col style="width: 100px;">
                    <col style="width: 88px;">
                    <col style="width: 88px;">
                    <col style="width: 88px;">
                    <col style="width: 88px;">
                    <col style="width: 120px;">
                    <col style="width: 120px;">
                </colgroup>`
                : `<colgroup>
                    <col style="width: 190px;">
                    <col style="width: 120px;">
                    <col style="width: 100px;">
                    <col style="width: 100px;">
                    <col style="width: 96px;">
                    <col style="width: 96px;">
                    <col style="width: 96px;">
                    <col style="width: 120px;">
                    <col style="width: 120px;">
                </colgroup>`;
            const permissionPanel = `<div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div class="p-4 border-b border-gray-200">
                    <p class="text-sm font-bold text-gray-700">권한 탭</p>
                    <p class="text-sm text-gray-600">직원별로 체크박스를 선택하세요.</p>
                    <p class="text-sm text-gray-600">승인 권한은 매뉴얼팀/파츠북팀/모두 중 하나만 체크하세요.</p>
                    <p class="text-sm text-gray-600">팀원 연차현황 권한도 매뉴얼팀/파츠북팀/모두 중 하나만 체크하세요.</p>
                    <p class="text-sm text-gray-600">한 번에 1개 그룹만 펼쳐집니다. 다른 그룹은 자동으로 닫힙니다.</p>
                    <div class="mt-2 text-xs text-gray-500 flex flex-wrap gap-2 items-center">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">팀리더 행 강조</span>
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">대표 행 강조</span>
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">파트리더 행 강조</span>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    ${groupButtons}
                    <table id="master-perm-table" class="w-full text-sm table-fixed ${isCalendarOpen ? 'min-w-[1220px]' : 'min-w-[1140px]'}">
                        ${permissionColGroup}
                        <thead class="bg-gray-50">
                            <tr>
                                <th rowspan="2" class="p-3 text-left bg-gray-50 border-b border-gray-200">이름</th>
                                <th rowspan="2" class="p-3 text-left bg-gray-50 border-b border-gray-200">부서</th>
                                <th rowspan="2" class="p-3 text-left bg-gray-50 border-b border-gray-200">직급</th>
                                <th rowspan="2" class="p-3 text-left bg-gray-50 border-b border-gray-200">유형</th>
                                <th colspan="${activeGroupColSpan}" class="p-3 text-center border-b border-gray-200 ${activeGroupHeaderClass}">${activeGroupTitle}</th>
                                <th rowspan="2" class="p-3 text-center bg-fuchsia-50 border-b border-gray-200">권한/설정 접근</th>
                                <th rowspan="2" class="p-3 text-center bg-amber-50 border-b border-gray-200">구성원 관리</th>
                            </tr>
                            <tr>
                                ${activeGroupSubHeader}
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
            const saveButton = activeTab === 'permissions'
                ? `<button onclick="app.saveMasterPermissionTable()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700">권한 저장</button>`
                : `<button onclick="app.saveMasterSettings()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700">설정 저장</button>`;
            const topTabs = `<div class="px-4 pt-3 bg-gray-100/80 border-b border-gray-200">
                <div class="flex items-end gap-1">
                    <button onclick="app.setMasterPermissionTab('permissions')" class="px-4 py-2 rounded-t-xl font-bold border transition ${activeTab === 'permissions' ? 'bg-white text-gray-900 border-gray-300 border-b-white -mb-px shadow-sm' : 'bg-gray-200 text-gray-600 border-transparent hover:bg-gray-100'}">권한 탭</button>
                    <button onclick="app.setMasterPermissionTab('settings')" class="px-4 py-2 rounded-t-xl font-bold border transition ${activeTab === 'settings' ? 'bg-white text-gray-900 border-gray-300 border-b-white -mb-px shadow-sm' : 'bg-gray-200 text-gray-600 border-transparent hover:bg-gray-100'}">설정 테이블</button>
                </div>
            </div>`;
            const activePanel = activeTab === 'permissions' ? permissionPanel : settingsPanel;

            document.getElementById('app-container').innerHTML = `<div class="w-full max-w-7xl mx-auto px-4 pt-8 pb-12 fade-in">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">마스터 권한 관리</h2>
                </div>
                <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    ${topTabs}
                    <div class="p-4">
                        ${activePanel}
                        ${appData.meta.permissionsFromDb ? '' : `<div class="mt-3 mb-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">현재 DB가 권한 컬럼을 아직 읽지 못하고 있습니다. Apps Script를 권한 연동 버전으로 교체하고, 웹앱을 새 버전으로 배포해주세요.</div>`}
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
            return `<div id="req-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden flex justify-center items-center z-50 fade-in"><div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transform scale-100"><div class="flex justify-between items-center mb-6 border-b pb-2"><h3 class="font-bold text-xl text-gray-800" id="req-modal-title">연차 신청</h3><div class="flex items-center"><label class="inline-flex items-center cursor-pointer"><input type="checkbox" id="allow-past" class="sr-only peer" onchange="app.togglePastDates()"><div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div><span class="ms-2 text-xs font-medium text-gray-500">지난 날짜 선택</span></label></div></div><div class="space-y-4 mb-6"><div><label class="block text-xs font-bold text-gray-500 mb-1">종류</label><select id="req-type" class="w-full bg-gray-50 border p-2.5 rounded-lg" onchange="toggleInputs()"><option value="연차">연차</option><option value="반차">반차 (4시간)</option><option value="시간차(퇴근)">시간차(퇴근)</option><option value="시간차(외출)">시간차(외출)</option></select></div><div id="div-date-range"><div class="flex justify-between items-center mb-1"><label class="block text-xs font-bold text-gray-500">날짜</label><label class="inline-flex items-center cursor-pointer"><span class="mr-2 text-xs text-gray-500">기간 설정</span><input type="checkbox" id="is-multi-day" class="sr-only peer" onchange="toggleInputs()"><div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div></label></div><div class="flex gap-2"><input type="date" id="req-start-date" onchange="app.checkHoliday(this)" class="w-full bg-gray-50 border p-2.5 rounded-lg"><input type="date" id="req-end-date" onchange="app.checkHoliday(this)" class="w-full bg-gray-50 border p-2.5 rounded-lg"></div><p id="date-status" class="text-[10px] font-bold mt-1 min-h-[15px]"></p></div><div id="div-timeoff" class="hidden bg-indigo-50 p-3 rounded-lg border border-indigo-100"><div class="flex gap-2 mb-2"><div class="w-1/2"><label class="text-xs font-bold text-indigo-700">사용 시간</label><select id="req-duration-timeoff" class="w-full border p-1 rounded mt-1"><option value="1">1시간</option><option value="2">2시간</option><option value="3">3시간</option><option value="4">4시간</option><option value="5">5시간</option><option value="6">6시간</option><option value="7">7시간</option></select></div><div class="w-1/2"><label class="text-xs font-bold text-indigo-700">퇴근 시간</label><select id="req-end-time-timeoff" class="w-full border p-1 rounded mt-1"><option value="18">18:00</option><option value="17">17:00</option><option value="16">16:00</option></select></div></div><p class="text-[10px] text-indigo-600">* 퇴근 시간을 기준으로 역산</p></div><div id="div-out" class="hidden bg-emerald-50 p-3 rounded-lg border border-emerald-100"><div class="flex gap-2 mb-2"><div class="w-1/2"><label class="text-xs font-bold text-emerald-700">사용 시간</label><select id="req-duration-out" class="w-full border p-1 rounded mt-1" onchange="updateOutPreview()">${outDurationOpts}</select></div><div class="w-1/2"><label class="text-xs font-bold text-emerald-700">시작 시간</label><select id="req-start-time-out" class="w-full border p-1 rounded mt-1" onchange="updateOutPreview()">${timeOpts}</select></div></div><p id="req-out-preview" class="text-[10px] text-emerald-700 min-h-[15px]"></p><p class="text-[10px] text-emerald-600">* 시작 시간을 기준으로 자동 종료 계산</p></div><div><label class="block text-xs font-bold text-gray-500 mb-1">사유</label><select id="req-reason" class="w-full bg-gray-50 border p-2.5 rounded-lg"><option value="Refresh">Refresh</option><option value="병원(본인)">병원(본인)</option><option value="병원(가족)">병원(가족)</option><option value="가사">가사</option><option value="은행">은행</option><option value="여행">여행</option><option value="건강검진(유급)">건강검진(유급)</option><option value="건강검진(무급)">건강검진(무급)</option></select></div></div><div class="flex justify-end gap-2"><button onclick="document.getElementById('req-modal').classList.add('hidden')" class="bg-gray-100 px-5 py-2.5 rounded-lg font-bold">취소</button><button onclick="app.submitRequest()" id="req-modal-btn" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg">신청하기</button></div></div></div><div id="pw-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden flex justify-center items-center z-50 fade-in"><div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"><h3 class="font-bold text-xl mb-6 border-b pb-2">비밀번호 변경</h3>
            <div class="flex items-center justify-end mb-2">
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" onchange="app.togglePwVisibility(this)" class="sr-only peer">
                    <div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    <span class="ms-2 text-xs font-medium text-gray-500">비밀번호 보기</span>
                </label>
            </div>
            <div class="space-y-4 mb-6">
                <div><label class="block text-xs font-bold text-gray-500 mb-1">새 비번</label><input type="password" id="pw-new" class="w-full bg-gray-50 border p-3 rounded-lg" placeholder="새 비밀번호 입력"></div>
                <div><label class="block text-xs font-bold text-gray-500 mb-1">비번 확인</label><input type="password" id="pw-confirm" class="w-full bg-gray-50 border p-3 rounded-lg" placeholder="새 비밀번호 확인"></div>
            </div>
            <div class="flex justify-end gap-2"><button onclick="document.getElementById('pw-modal').classList.add('hidden')" class="bg-gray-100 px-5 py-2.5 rounded-lg font-bold">취소</button><button onclick="app.changePassword()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg">변경</button></div></div></div><div id="member-card-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden flex justify-center items-center z-50 fade-in"><div class="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl"><div class="flex justify-between items-center mb-4 border-b pb-2"><h3 class="font-bold text-xl text-gray-800">직원 카드</h3><button onclick="app.closeMemberCard()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button></div><div id="member-card-body" class="min-h-[180px]"></div><div class="flex justify-end mt-5"><button onclick="app.closeMemberCard()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold">닫기</button></div></div></div>`;
        },
        initModal: () => {
            app.editingId = null; const today = moment().format('YYYY-MM-DD'); const s = document.getElementById('req-start-date'); const e = document.getElementById('req-end-date'); document.getElementById('req-modal-title').innerText = "연차 신청"; document.getElementById('req-modal-btn').innerText = "신청하기"; document.getElementById('req-type').value = "연차"; document.getElementById('req-reason').value = "Refresh"; const toggle = document.getElementById('allow-past'); if(toggle) toggle.checked = false; const multiToggle = document.getElementById('is-multi-day'); if(multiToggle) multiToggle.checked = false; if(s && e) { s.min = today; e.min = today; s.value = today; e.value = today; } 
            document.getElementById('date-status').innerText = ""; 
            toggleInputs();
        }
    };

    app.checkHoliday = (el) => {
        const dateStr = el.value;
        const statusEl = document.getElementById('date-status');
        if(!dateStr) return statusEl.innerText = "";
        
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

    function toggleInputs() {
        const t = document.getElementById('req-type').value;
        const sDate = document.getElementById('req-start-date');
        const eDate = document.getElementById('req-end-date');
        const allowPast = document.getElementById('allow-past')?.checked || false;
        const isMultiDay = document.getElementById('is-multi-day');

        if (t === '연차') {
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

        if (t === '시간차(외출)') updateOutPreview();
    }
    app.init();







