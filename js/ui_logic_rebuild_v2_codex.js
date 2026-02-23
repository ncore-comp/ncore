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

        init: async () => { 
            try {
                await db.init();
                app.bindIdleEvents();
                app.renderLogin();
            } catch(e) { alert("초기화 오류: " + e.message); }
        },

        fmtDate: (dateStr) => new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }),
        fmtTime: function(h) { const d = Math.floor(h / 8), r = h % 8; if (d > 0) return r > 0 ? d + "일 " + r + "시간" : d + "일"; return r + "시간"; },
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
                    : (isActive ? 'bg-white text-indigo-700 border-gray-300 border-b-white relative top-[1px] shadow-sm' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200');
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
            if (String(req.userId) === String(app.currentUser.id)) return false;
            const scope = app.getCurrentPermissions().approveScope;
            if (scope === 'all') return true;
            if (scope === 'manual') return req.dept === '매뉴얼팀';
            if (scope === 'parts') return req.dept === '파츠북팀';
            return false;
        },
        hasApprovalPermission: () => app.getCurrentPermissions().approveScope !== 'none',
        hasUserManagePermission: () => app.getCurrentPermissions().canManageUsers,
        isMemberCardFeatureEnabled: () => {
            const masterUser = appData.users.find(user => user.role === 'master');
            if (masterUser) return !!masterUser.featureMemberCard;
            return !!(app.currentUser && app.currentUser.featureMemberCard);
        },
        getWorkShiftText: (value) => {
            const safe = security.normalizeWorkShift(value);
            return safe || '미등록';
        },
        getMemberCardData: (user) => {
            const currentYear = new Date().getFullYear();
            return [
                { label: '이름', value: user.name || '-' },
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
            const matched = candidates.filter(user => {
                const perm = security.sanitizePermissions(user.permissions || {}, user.role, user.dept);
                if (perm.approveScope === 'all') return true;
                if (perm.approveScope === 'manual') return requester.dept === '매뉴얼팀';
                if (perm.approveScope === 'parts') return requester.dept === '파츠북팀';
                return false;
            });

            const deptApprover = matched.find(user => {
                const perm = security.sanitizePermissions(user.permissions || {}, user.role, user.dept);
                return (requester.dept === '매뉴얼팀' && perm.approveScope === 'manual')
                    || (requester.dept === '파츠북팀' && perm.approveScope === 'parts');
            });
            if (deptApprover) return deptApprover;

            const allApprover = matched.find(user => security.sanitizePermissions(user.permissions || {}, user.role, user.dept).approveScope === 'all');
            if (allApprover) return allApprover;

            return appData.users.find(u => u.role === 'master') || null;
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
        markActivity: () => {
            app.lastActivityAt = Date.now();
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

        renderNav: () => {
            const el = document.getElementById('nav-info');
            if (!app.currentUser) return el.innerHTML = '';
            const isMaster = app.currentUser.role === 'master';
            const canManageUsers = app.hasUserManagePermission();
            const boardBtn = `<button onclick="app.openBoardPage()" class="mr-2 text-sm ${app.currentView==='board' ? 'bg-blue-700' : 'bg-blue-600'} text-white px-3 py-2 rounded-lg font-bold">게시판</button>`;
            const dashboardBtn = app.currentView === 'board'
                ? `<button onclick="app.backToDashboard()" class="mr-2 text-sm bg-white border px-3 py-2 rounded-lg font-bold">대시보드</button>`
                : '';
            el.innerHTML = `<div class="flex items-center"><div class="text-right mr-3"><p class="text-sm font-bold">${app.currentUser.name} <span class="text-xs text-gray-500">${app.currentUser.rank||''}</span>${isMaster?'<span class="text-[10px] bg-red-600 text-white px-1 rounded ml-1">MASTER</span>':''}</p><p class="text-xs text-gray-500">${app.currentUser.dept}</p></div>${boardBtn}${dashboardBtn}${isMaster?`<button onclick="app.renderMasterPermissionPage()" class="mr-2 text-sm bg-purple-600 text-white px-3 py-2 rounded-lg font-bold">권한 설정</button>`:''}${canManageUsers?`<button onclick="app.renderUserManagement()" class="mr-2 text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold">구성원 관리</button>`:''}<button onclick="document.getElementById('pw-modal').classList.remove('hidden')" class="mr-2 text-sm bg-white border px-3 py-2 rounded-lg">비번변경</button><button onclick="app.logout()" class="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg font-bold">로그아웃</button></div>`;
        },

        // [수정] recalcUsedHours: 승인 대기 시간도 계산하도록 수정
        recalcUsedHours: () => {
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
            if (app.currentUser) {
                const freshUser = appData.users.find(u => String(u.id) === String(app.currentUser.id));
                if (freshUser) {
                    app.currentUser.usedHours = freshUser.usedHours;
                    app.currentUser.pendingHours = freshUser.pendingHours;
                    app.currentUser.totalHours = freshUser.totalHours; 
                }
            }
        },

        tryLogin: async () => {
            const id = security.cleanInlineValue(document.getElementById('login-id').value);
            const pw = document.getElementById('login-pw').value;
            if(!id || !pw) return alert("아이디/비밀번호를 입력하세요.");
            document.getElementById('loading-text').innerText = "로그인 중...";
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const ipPromise = db.getClientIp();
                const clientIp = await Promise.race([
                    ipPromise,
                    new Promise((resolve) => setTimeout(() => resolve(''), 1200))
                ]);
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'login', id: id, password: pw, clientIp: clientIp || '' })
                });
                const json = await response.json();
                if (json.result === 'success') {
                    app.currentUser = security.sanitizeUser(json.user || {});
                    delete app.currentUser.password;
                    app.currentView = 'dashboard';
                    app.boardCategoryFilter = 'all';
                    app.boardSearchText = '';
                    app.boardEditingId = null;
                    app.selectedBoardId = null;
                    app.unloadLogged = false;
                    app.markActivity();
                    app.startIdleWatch();
                    app.recalcUsedHours();
                    app.renderNav();
                    document.getElementById('app-container').innerHTML = ""; app.refreshDashboard();
                } else { alert(json.message || "아이디/비밀번호 확인"); }
            } catch(e) { console.error(e); alert("서버 통신 오류"); } finally { document.getElementById('loading-overlay').style.display = 'none'; }
        },

        logout: async (reason = 'manual') => {
            const isManual = reason === 'manual';
            if (isManual && !confirm('로그아웃 하시겠습니까?')) return;

            if (app.currentUser) {
                await db.logAccess({
                    userId: app.currentUser.id,
                    userName: app.currentUser.name,
                    logType: 'Logout',
                    detail: isManual ? 'manual' : 'idle_timeout'
                });
            }
            app.unloadLogged = true;
            app.stopIdleWatch();
            app.currentUser = null;
            app.currentView = 'dashboard';
            app.renderNav();
            app.renderLogin();
            if (!isManual) alert('입력이 10분 이상 없어 자동 로그아웃되었습니다.');
        },

        changePassword: async () => {
            const newPw = document.getElementById('pw-new').value.trim();
            const cfmPw = document.getElementById('pw-confirm').value.trim();

            if(!newPw || newPw !== cfmPw) {
                return alert('새 비밀번호가 일치하지 않거나 비어있습니다.');
            }
            if (newPw.length < 8) {
                return alert('비밀번호는 8자 이상으로 입력하세요.');
            }
            
            const userIdx = appData.users.findIndex(u => String(u.id) === String(app.currentUser.id));
            if(userIdx > -1) appData.users[userIdx].password = newPw;

            await db.saveUsers();
            document.getElementById('pw-new').value = '';
            document.getElementById('pw-confirm').value = '';
            await app.logUserAction('PasswordChange', 'self_password_changed');
            alert('변경되었습니다.'); document.getElementById('pw-modal').classList.add('hidden');
        },

        openBoardPage: () => {
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
            app.markActivity();
            app.recalcUsedHours();
            app.ensureCalendarMode();
            try {
                if(app.currentUser.role === 'master' || app.hasApprovalPermission()) app.renderManagerDashboard();
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
            const daysEvents = scopedRequests.filter(r => moment(dateStr).isBetween(r.startDate, r.endDate, 'day', '[]'));
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
                    <div class="text-xs text-gray-500 mt-0.5">${member.dept || '-'} / ${member.rank || '-'}</div>
                </div>
                <div class="space-y-2">
                    ${rows.map(item => `<div class="grid grid-cols-[140px_1fr] gap-2 items-center text-sm"><div class="text-gray-500">${item.label}</div><div class="font-semibold text-gray-800 break-all">${item.value}</div></div>`).join('')}
                </div>
            `;
            app.selectedMemberId = safeId;
            document.getElementById('member-card-modal')?.classList.remove('hidden');
        },
        closeMemberCard: () => {
            app.selectedMemberId = null;
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
                await db.upsertReq(r); 
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
                        await db.upsertReq(updatedReq);
                        await app.logUserAction('RequestEdit', `${updatedReq.id}:${updatedReq.type}:${updatedReq.startDate}`);
                        alert('수정되었습니다.');
                    }
                } else {
                    if (hours > remaining) return alert(`잔여 연차 부족\n(승인 대기 포함 잔여: ${app.fmtTime(remaining)})`);
                    
                    const newReq = security.sanitizeRequest({
                        id: Date.now(), userId: app.currentUser.id, userName: app.currentUser.name, 
                        dept: app.currentUser.dept, role: app.currentUser.role, type, startDate: sDate, endDate: eDate, 
                        hours, timeRange: timeRange || '', reason, status: 'pending', 
                        timestamp: new Date().toISOString() 
                    });
                    await db.upsertReq(newReq);
                    await app.logUserAction('RequestCreate', `${newReq.id}:${newReq.type}:${newReq.startDate}`);

                    const targetEmail = app.getApproverEmail(app.currentUser);

                    if(targetEmail) {
                        const userRank = app.currentUser.rank || '';
                        const subject = `[연차신청] ${app.currentUser.name} ${userRank} - ${type}`;
                        const dateRange = (sDate === eDate) ? sDate : `${sDate} ~ ${eDate}`;
                        const body = `연차가 신청 되었습니다.\n\n접속주소: https://ncore-comp.github.io/ncore/\n\n[신청 내용]\n- 이름: ${app.currentUser.name} ${userRank}\n- 종류: ${type}\n- 기간: ${dateRange} ${timeRange ? '('+timeRange+')' : ''}\n- 사유: ${reason}`;
                        openOutlookDraft(targetEmail, subject, body);
                        alert('데이터 저장 완료. 아웃룩 창이 뜨면 [보내기]를 눌러주세요.');
                    } else { alert('저장되었습니다.'); }
                }
                document.getElementById('req-modal').classList.add('hidden'); 
                app.refreshDashboard();
            } catch (err) { console.error(err); alert("신청 처리 중 오류: " + err.message); }
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

            if(action === 'cancel_req' || action === 'cancel_approve') {
                const isPast = moment(req.startDate).isBefore(moment().startOf('day'));
                if (isPast) {
                    alert("사용 날짜가 지난 연차는 취소할 수 없습니다.");
                    return;
                }
            }

            let mailType = '';
            
            if(action === 'approve') { req.status = 'approved'; mailType = '승인'; }
            else if(action === 'reject') { req.status = 'rejected'; mailType = '반려'; }
            else if(action === 'cancel_req') {
                if(!confirm('취소하시겠습니까?')) return;
                req.status = req.status==='pending' ? 'cancelled' : 'cancel_requested';
                if (req.status === 'cancel_requested') {
                    const targetEmail = app.getApproverEmail(app.currentUser);
                    if (targetEmail) {
                        const userRank = app.currentUser.rank || '';
                        const subject = `[연차취소요청] ${app.currentUser.name} ${userRank} - ${req.type}`;
                        const sFmt = moment(req.startDate).format('YYYY-MM-DD');
                        const eFmt = moment(req.endDate).format('YYYY-MM-DD');
                        const range = (sFmt === eFmt) ? sFmt : `${sFmt} ~ ${eFmt}`;
                        const body = `연차 취소 요청이 접수되었습니다.\n\n접속주소: https://ncore-comp.github.io/ncore/\n\n- 이름: ${app.currentUser.name} ${userRank}\n- 기간: ${range}`;
                        openOutlookDraft(targetEmail, subject, body);
                    }
                }
            } 
            else if(action === 'cancel_approve') { req.status = 'cancelled'; mailType = '취소승인'; }
            else if(action === 'cancel_reject') { req.status = 'approved'; }

            await db.upsertReq(req);
            await app.logUserAction('RequestProcess', `${safeId}:${action}`);
            
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
                featureMemberCard: app.isMemberCardFeatureEnabled()
            });

            if(!inputUser.id || !inputUser.name || !inputUser.password) return alert('필수 입력 누락');
            if(inputUser.password.length < 8) return alert('비밀번호는 8자 이상으로 입력하세요.');
            if(!security.isValidEmail(inputUser.email)) return alert('이메일 형식이 올바르지 않습니다.');
            if(appData.users.some(u => String(u.id) === String(inputUser.id))) return alert('이미 존재하는 ID입니다.');

            const days = parseFloat(rawDays || 15);
            const totalHours = Number.isFinite(days) && days > 0 ? days * 8 : 15 * 8;
            appData.users.push({
                ...inputUser,
                totalHours,
                usedHours: 0,
                pendingHours: 0
            });
            await db.saveUsers();
            await app.logUserAction('UserCreate', `${inputUser.id}:${inputUser.name}`);
            app.renderUserManagement();
        },

        setEditMode: (id) => {
            const safeId = security.cleanInlineValue(id);
            if (!app.canManageTargetUser(safeId)) return alert('해당 구성원 수정 권한이 없습니다.');
            app.editingId = safeId;
            app.renderUserManagement();
        },
        cancelEdit: () => { app.editingId = null; app.renderUserManagement(); },

        updateUser: async (id) => {
            try {
                if (!app.hasUserManagePermission()) throw new Error('구성원 관리 권한이 없습니다.');
                const safeId = security.cleanInlineValue(id);
                if (!app.canManageTargetUser(safeId)) throw new Error('해당 구성원 수정 권한이 없습니다.');
                const u = appData.users.find(u => String(u.id) === String(safeId));
                if(!u) throw new Error('사용자 미확인');
                const nameInput = document.getElementById(`n-${safeId}`);
                const rankInput = document.getElementById(`r-${safeId}`);
                const daysInput = document.getElementById(`d-${safeId}`);
                const pwInput = document.getElementById(`p-${safeId}`); const emailInput = document.getElementById(`e-${safeId}`); 
                const empInput = document.getElementById(`emp-${safeId}`);
                const phoneInput = document.getElementById(`ph-${safeId}`);
                const w1Input = document.getElementById(`w1-${safeId}`);
                const w2Input = document.getElementById(`w2-${safeId}`);
                const w3Input = document.getElementById(`w3-${safeId}`);
                const w4Input = document.getElementById(`w4-${safeId}`);
                if(nameInput) u.name = security.cleanText(nameInput.value);
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
                    if(newPw.length < 8) throw new Error('비밀번호는 8자 이상');
                    u.password = newPw;
                }
                appData.users = appData.users.map(security.sanitizeUser);
                await db.saveUsers();
                await app.logUserAction('UserUpdate', `${safeId}:${u.name}`);
                alert('수정 완료');
            } catch (e) { console.error(e); alert('오류: ' + e.message); } finally { app.editingId = null; app.renderUserManagement(); }
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
                const evts = viewReqs.filter(r => curDate.isBetween(r.startDate, r.endDate, 'day', '[]'));
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
            document.getElementById('app-container').innerHTML = `<div class="w-full max-w-7xl mx-auto px-4 fade-in pt-8 pb-12"><div class="bg-white p-6 rounded-2xl shadow-sm border mb-8 flex justify-between items-center"><div><h2 class="text-2xl font-bold">내 연차 현황</h2><p class="text-sm text-gray-500 mt-1">${u.dept} | 총 ${app.fmtTime(u.totalHours)}</p></div><div class="text-right"><div class="text-4xl font-bold text-indigo-600">${app.fmtTime(u.totalHours-u.usedHours)} <span class="text-lg text-gray-400 font-normal">/ ${app.fmtTime(u.totalHours)}</span></div>${u.pendingHours > 0 ? `<div class="text-sm font-bold text-orange-500 mt-1">(승인 대기: ${app.fmtTime(u.pendingHours)})</div>` : ''}</div></div><div class="mb-10">${app.renderCal(appData.requests, u)}</div><div class="flex justify-between items-center mb-4"><h3 class="text-lg font-bold">최근 신청 내역</h3><button onclick="document.getElementById('req-modal').classList.remove('hidden'); app.initModal();" class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md shadow-indigo-200"><i class="fa-solid fa-plus mr-2"></i> 연차 신청</button></div><div class="bg-white rounded-xl shadow-sm border overflow-hidden">${totalItems===0?'<div class="p-8 text-center text-gray-400">내역 없음</div>':pagedReqs.map(r=> {
                const displayType = security.normalizeType(r.type);
                let badgeClass = '';
                if(displayType === '연차') badgeClass = 'bg-lime-200 text-lime-900'; else if(displayType === '반차') badgeClass = 'bg-orange-100 text-orange-800'; else if(displayType === '시간차(퇴근)') badgeClass = 'bg-yellow-200 text-yellow-900'; else if(displayType === '시간차(외출)') badgeClass = 'bg-stone-200 text-stone-800'; else badgeClass = 'bg-gray-100 text-gray-700';
                const formattedDate = r.startDate===r.endDate ? app.fmtDate(r.startDate) : app.fmtDate(r.startDate)+'~'+app.fmtDate(r.endDate);
                const isPast = moment(r.startDate).isBefore(moment().startOf('day'));
                return `<div class="p-5 border-b last:border-0 hover:bg-gray-50 flex justify-between items-center"><div class="flex-grow"><div class="flex items-center space-x-2 mb-1"><span class="px-2 py-0.5 rounded text-xs font-bold ${badgeClass}">${displayType}</span><span class="font-bold text-lg">${formattedDate}</span>${r.timeRange?`<span class="text-sm font-bold text-gray-500 bg-gray-100 px-2 rounded ml-2">(${r.timeRange})</span>`:''}</div><p class="text-sm text-gray-500 pl-1"><span class="font-medium text-gray-700">${r.reason}</span> | <span class="text-gray-400">${r.hours}h 차감</span></p></div><div class="flex flex-col items-end min-w-[80px]"><span class="font-bold px-3 py-1 rounded-full text-xs text-center ml-auto mb-1 ${r.status==='approved'?'bg-green-100 text-green-700':(r.status==='rejected'?'bg-red-100 text-red-700':(r.status==='pending'?'bg-yellow-100 text-yellow-700':'bg-gray-200 text-gray-500'))}">${r.status==='pending'?'승인 대기':(r.status==='approved'?'승인 완료':(r.status==='rejected'?'반려됨':(r.status==='cancel_requested'?'취소 요청중':'취소됨')))}</span>${r.status==='pending'?`<button onclick="app.editReq('${r.id}')" class="text-xs text-indigo-500 underline hover:text-indigo-700 font-bold text-right mb-1 pr-3">수정</button>`:''} ${(['pending','approved'].includes(r.status) && !isPast) ? `<button onclick="app.processReq('${r.id}','cancel_req')" class="text-xs text-gray-400 underline hover:text-red-500 text-right pr-3">${r.status === 'pending' ? '취소' : '취소 요청'}</button>` : ''} ${['cancelled','rejected'].includes(r.status)?`<button onclick="app.deleteReq('${r.id}')" class="text-xs text-gray-400 underline hover:text-red-600 text-right pr-3"><i class="fa-regular fa-trash-can mr-1"></i>삭제</button>`:''}</div></div>`;
            }).join('')}</div>${totalItems > 0 ? `<div class="flex justify-center items-center mt-4 space-x-2"><button ${app.currentPage === 1 ? 'disabled' : ''} onclick="app.changePage(${app.currentPage - 1})" class="px-3 py-1 rounded border ${app.currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">이전</button><span class="text-sm text-gray-600 font-medium">${app.currentPage} / ${totalPages}</span><button ${app.currentPage === totalPages ? 'disabled' : ''} onclick="app.changePage(${app.currentPage + 1})" class="px-3 py-1 rounded border ${app.currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">다음</button></div>` : ''}</div>${app.getModal()}`;
            app.initModal();
        },

        renderManagerDashboard: () => {
            const u = app.currentUser, isM = u.role === 'master', isCEO = false;
            const perms = app.getCurrentPermissions();
            const canApprove = isM || app.hasApprovalPermission();
            const approveScope = isM ? 'all' : perms.approveScope;
            const scopeDepts = approveScope === 'all' ? ['매뉴얼팀', '파츠북팀'] : (approveScope === 'manual' ? ['매뉴얼팀'] : (approveScope === 'parts' ? ['파츠북팀'] : []));
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
                    return `<div class="${bgStyle} p-5 rounded-xl shadow-sm border mb-8"><div class="flex justify-between items-center mb-4"><h3 class="font-bold ${titleColor} flex items-center"><i class="fa-solid fa-users mr-2 ${iconColor}"></i> 팀원 연차 현황 / ${deptName}</h3><div class="flex items-center gap-3"><label class="inline-flex items-center cursor-pointer"><input type="checkbox" class="sr-only peer" onchange="app.toggleUsage()" ${app.showUsage ? 'checked' : ''}><div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div><span class="ms-2 text-xs font-medium text-gray-500">사용 내역</span></label><span class="text-[11px] ${cardFeatureEnabled ? 'text-indigo-600' : 'text-gray-400'}">${cardFeatureEnabled ? '직원 카드 켜짐' : '직원 카드 꺼짐'}</span></div></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${deptMembers.map(m => { const safeId = security.cleanInlineValue(m.id); const clickAttr = cardFeatureEnabled ? `onclick=\"app.openMemberCard('${safeId}')\"` : ''; const cardClass = cardFeatureEnabled ? 'cursor-pointer hover:shadow-md hover:border-indigo-200' : 'cursor-default'; return `<div class="bg-white border border-white/50 rounded-lg p-3 flex justify-between items-center shadow-sm transition ${cardClass} group" ${clickAttr} onmouseenter="app.showMemberHistory('${safeId}', event)" onmousemove="app.moveTooltip(event)" onmouseleave="app.hideTooltip()"><div><div class="font-bold text-gray-800">${m.name} <span class="text-xs text-gray-500">(${m.rank||''})</span></div>${app.showUsage ? `<div class="mt-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded inline-block">사용: ${app.fmtTime(m.usedHours)}</div>` : ''}${cardFeatureEnabled ? '<div class="mt-1 text-[10px] text-gray-400">클릭하면 직원 카드</div>' : ''}</div><div class="text-right"><div class="text-sm font-bold ${m.totalHours-m.usedHours<0?'text-red-600':'text-indigo-600'}">${app.fmtTime(m.totalHours-m.usedHours)} 남음</div><div class="text-[10px] text-gray-400 mt-0.5">/ 총 ${app.fmtTime(m.totalHours)}</div></div></div>`; }).join('')}</div></div>`;
                }).join('');
            }
            
            // [수정] 관리자 모드에서도 '승인 대기' 연차 표시 (Case C 적용)
            const myStatusCard = isCEO ? '' : `<div class="bg-white p-6 rounded-2xl shadow-sm border mb-8 flex justify-between items-center"><div><h2 class="font-bold text-lg">내 연차 현황</h2><p class="text-sm text-gray-500">${app.currentUser.role.toUpperCase()}</p></div><div class="text-right"><div class="text-3xl font-bold text-indigo-600">${app.fmtTime(app.currentUser.totalHours-app.currentUser.usedHours)} <span class="text-lg text-gray-400 font-normal">/ ${app.fmtTime(app.currentUser.totalHours)}</span></div>${app.currentUser.pendingHours > 0 ? `<div class="text-sm font-bold text-orange-500 mt-1">(승인 대기: ${app.fmtTime(app.currentUser.pendingHours)})</div>` : ''}</div></div>`;
            const myReqs = appData.requests.filter(r=>String(r.userId)===String(u.id)).sort((a,b)=>b.id-a.id);
            const totalItems = myReqs.length;
            const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
            if (app.currentPage > totalPages && totalPages > 0) app.currentPage = Math.max(1, totalPages);
            const startIdx = (app.currentPage - 1) * ITEMS_PER_PAGE;
            const endIdx = startIdx + ITEMS_PER_PAGE;
            const pagedReqs = myReqs.slice(startIdx, endIdx);

            const myReqsSection = isCEO ? '' : `<div class="flex justify-between items-center mb-4 px-1"><h3 class="text-lg font-bold text-gray-800">내 최근 신청 내역</h3><button onclick="document.getElementById('req-modal').classList.remove('hidden'); app.initModal();" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md shadow-indigo-200 transition flex items-center"><i class="fa-solid fa-plus mr-2"></i> 연차 신청</button></div><div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">${totalItems === 0 ? '<div class="p-8 text-center text-gray-400">신청 내역이 없습니다.</div>' : pagedReqs.map(r=> { const displayType = security.normalizeType(r.type); let badgeClass = ''; if(displayType === '연차') badgeClass = 'bg-lime-200 text-lime-900'; else if(displayType === '반차') badgeClass = 'bg-orange-100 text-orange-700'; else if(displayType === '시간차(퇴근)') badgeClass = 'bg-yellow-200 text-yellow-900'; else if(displayType === '시간차(외출)') badgeClass = 'bg-stone-200 text-stone-800'; else badgeClass = 'bg-gray-100 text-gray-700'; const cancelBtnText = r.status === 'pending' ? '취소' : '취소 요청'; const isPast = moment(r.startDate).isBefore(moment().startOf('day')); return `<div class="p-5 border-b last:border-0 hover:bg-gray-50 flex justify-between items-center"><div class="flex-grow"><div class="flex items-center space-x-2 mb-1"><span class="px-2 py-0.5 rounded text-xs font-bold ${badgeClass}">${displayType}</span><span class="font-bold text-lg">${r.startDate===r.endDate?app.fmtDate(r.startDate):app.fmtDate(r.startDate)+'~'+app.fmtDate(r.endDate)}</span>${r.timeRange?`<span class="text-sm font-bold text-gray-500 bg-gray-100 px-2 rounded ml-2">(${r.timeRange})</span>`:''}</div><p class="text-sm text-gray-500 pl-1"><span class="font-medium text-gray-700">${r.reason}</span> | <span class="text-gray-400">${r.hours}h 차감</span></p></div><div class="flex flex-col items-end min-w-[80px]"><span class="font-bold px-3 py-1 rounded-full text-xs text-center ml-auto mb-1 ${r.status==='approved'?'bg-green-100 text-green-700':(r.status==='rejected'?'bg-red-100 text-red-700':(r.status==='pending'?'bg-yellow-100 text-yellow-700':'bg-gray-200 text-gray-500'))}">${r.status==='pending'?'승인 대기':(r.status==='approved'?'승인 완료':(r.status==='rejected'?'반려됨':(r.status==='cancel_requested'?'취소 요청중':'취소됨')))}</span>${r.status==='pending'?`<button onclick="app.editReq('${r.id}')" class="text-xs text-indigo-500 underline hover:text-indigo-700 font-bold text-right mb-1 pr-3">수정</button>`:''} ${(['pending','approved'].includes(r.status) && !isPast)?`<button onclick="app.processReq('${r.id}','cancel_req')" class="text-xs text-gray-400 underline hover:text-red-500 text-right pr-3">${cancelBtnText}</button>`:''} ${['cancelled','rejected'].includes(r.status)?`<button onclick="app.deleteReq('${r.id}')" class="text-xs text-gray-400 underline hover:text-red-600 text-right pr-3"><i class="fa-regular fa-trash-can mr-1"></i>삭제</button>`:''}</div></div>`; }).join('')}</div>${totalItems > 0 && !isCEO ? `<div class="flex justify-center items-center -mt-6 mb-8 space-x-2"><button ${app.currentPage === 1 ? 'disabled' : ''} onclick="app.changePage(${app.currentPage - 1})" class="px-3 py-1 rounded border ${app.currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">이전</button><span class="text-sm text-gray-600 font-medium">${app.currentPage} / ${totalPages}</span><button ${app.currentPage === totalPages ? 'disabled' : ''} onclick="app.changePage(${app.currentPage + 1})" class="px-3 py-1 rounded border ${app.currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-600'}">다음</button></div>` : ''}`;

            let dashboardTitle = '팀장 대시보드';
            if (isM) dashboardTitle = '시스템 최고 관리자 대시보드';
            else if (isCEO) dashboardTitle = '대표이사 대시보드';

            const approvalSection = !canApprove ? '' : `<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"><div class="bg-white rounded-xl shadow-sm border p-5"><div class="flex justify-between items-center mb-4"><h3 class="font-bold text-indigo-800 flex items-center"><i class="fa-regular fa-clock mr-2"></i> 결재 대기</h3><button onclick="app.approveAll('pending')" class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-bold transition">모두 승인</button></div><div class="space-y-3">${pendings.filter(r=>r.status==='pending').map(r=> { const displayType = security.normalizeType(r.type); return `<div class="border p-4 rounded-lg flex justify-between items-center"><div><span class="font-bold">${r.userName}</span> <span class="text-xs text-gray-500">${r.dept}</span><div class="text-sm text-indigo-600 font-bold mt-1">${displayType} | ${r.reason}</div><div class="text-xs text-gray-400 mt-1">${app.fmtDate(r.startDate)}${r.startDate!==r.endDate ? ' ~ '+app.fmtDate(r.endDate) : ''}</div></div><div class="flex flex-col gap-1"><button onclick="app.processReq('${r.id}','approve')" class="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold">승인</button><button onclick="app.processReq('${r.id}','reject')" class="bg-gray-100 text-gray-600 px-3 py-1.5 rounded text-xs">반려</button></div></div>`; }).join('') || '<div class="text-center text-gray-400 py-4">대기 없음</div>'}</div></div><div class="bg-white rounded-xl shadow-sm border p-5"><div class="flex justify-between items-center mb-4"><h3 class="font-bold text-red-600 flex items-center"><i class="fa-solid fa-triangle-exclamation mr-2"></i> 취소 요청</h3><button onclick="app.approveAll('cancel')" class="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 font-bold transition">모두 승인</button></div><div class="space-y-3">${pendings.filter(r=>r.status==='cancel_requested').map(r=>`<div class="border border-red-50 bg-red-50/30 p-4 rounded-lg flex justify-between items-center"><div><span class="font-bold">${r.userName}</span><div class="text-xs text-red-500 font-bold mt-1">취소 요청됨</div><div class="text-xs text-gray-400">${app.fmtDate(r.startDate)}</div></div><div class="flex flex-col gap-1"><button onclick="app.processReq('${r.id}','cancel_approve')" class="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold">취소 승인</button><button onclick="app.processReq('${r.id}','cancel_reject')" class="bg-white border px-3 py-1.5 rounded text-xs">반려</button></div></div>`).join('') || '<div class="text-center text-gray-400 py-4">요청 없음</div>'}</div></div></div>`;
            document.getElementById('app-container').innerHTML = `<div class="w-full max-w-7xl mx-auto px-4 fade-in pt-8 pb-12"><div class="flex justify-between items-center mb-6"><h2 class="text-2xl font-bold">${dashboardTitle}</h2></div>${myStatusCard}<div class="mb-8">${app.renderCal(appData.requests, app.currentUser)}</div>${approvalSection}${myReqsSection}${memberStatusHtml}</div>${app.getModal()}`;
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
        saveMasterPermissions: async () => {
            if (!app.currentUser || app.currentUser.role !== 'master') {
                alert('마스터만 권한을 저장할 수 있습니다.');
                return;
            }
            const memberCardEnabled = document.getElementById('global-member-card-toggle')?.checked || false;

            appData.users = appData.users.map(user => {
                const safeId = security.cleanInlineValue(user.id);
                if (user.role === 'master') {
                    return security.sanitizeUser({
                        ...user,
                        featureMemberCard: memberCardEnabled,
                        permissions: security.sanitizePermissions({}, 'master', user.dept)
                    });
                }

                const permissions = {
                    calendarSelf: document.getElementById(`perm-cal-self-${safeId}`)?.checked || false,
                    calendarManual: document.getElementById(`perm-cal-manual-${safeId}`)?.checked || false,
                    calendarParts: document.getElementById(`perm-cal-parts-${safeId}`)?.checked || false,
                    calendarAll: document.getElementById(`perm-cal-all-${safeId}`)?.checked || false,
                    approveScope: 'none',
                    canManageUsers: document.getElementById(`perm-manage-${safeId}`)?.checked || false
                };

                if (document.getElementById(`perm-approve-all-${safeId}`)?.checked) permissions.approveScope = 'all';
                else if (document.getElementById(`perm-approve-manual-${safeId}`)?.checked) permissions.approveScope = 'manual';
                else if (document.getElementById(`perm-approve-parts-${safeId}`)?.checked) permissions.approveScope = 'parts';

                if (!permissions.calendarSelf && !permissions.calendarManual && !permissions.calendarParts && !permissions.calendarAll) {
                    permissions.calendarSelf = true;
                }

                return security.sanitizeUser({
                    ...user,
                    featureMemberCard: memberCardEnabled,
                    permissions
                });
            });

            await db.saveUsers();
            const freshMe = appData.users.find(u => String(u.id) === String(app.currentUser.id));
            if (freshMe) app.currentUser = { ...app.currentUser, permissions: freshMe.permissions, featureMemberCard: freshMe.featureMemberCard };
            app.renderNav();
            await app.logUserAction('PermissionSave', `memberCard:${memberCardEnabled}`);
            alert('권한 저장 완료');
            app.renderMasterPermissionPage();
        },
        renderMasterPermissionPage: () => {
            if (!app.currentUser || app.currentUser.role !== 'master') {
                alert('마스터만 접근할 수 있습니다.');
                return app.refreshDashboard();
            }
            app.currentView = 'dashboard';
            app.renderNav();

            const memberCardEnabled = app.isMemberCardFeatureEnabled();
            const users = [...appData.users].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ko'));
            const rows = users.map(user => {
                const safeId = security.cleanInlineValue(user.id);
                const perms = security.sanitizePermissions(user.permissions || {}, user.role, user.dept);
                const isMasterRow = user.role === 'master';

                return `<tr class="border-b last:border-0 hover:bg-gray-50">
                    <td class="p-3 font-bold">${user.name}${isMasterRow ? ' (MASTER)' : ''}</td>
                    <td class="p-3 text-sm text-gray-600">${user.dept || '-'}</td>
                    <td class="p-3 text-sm text-gray-600">${user.rank || '-'}</td>
                    <td class="p-3 text-center"><input type="checkbox" id="perm-cal-self-${safeId}" ${perms.calendarSelf ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                    <td class="p-3 text-center"><input type="checkbox" id="perm-cal-manual-${safeId}" ${perms.calendarManual ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                    <td class="p-3 text-center"><input type="checkbox" id="perm-cal-parts-${safeId}" ${perms.calendarParts ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                    <td class="p-3 text-center"><input type="checkbox" id="perm-cal-all-${safeId}" ${perms.calendarAll ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                    <td class="p-3 text-center"><input type="checkbox" id="perm-approve-manual-${safeId}" ${perms.approveScope==='manual' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleApproveScopeCheckbox('${safeId}','manual',this.checked)"></td>
                    <td class="p-3 text-center"><input type="checkbox" id="perm-approve-parts-${safeId}" ${perms.approveScope==='parts' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleApproveScopeCheckbox('${safeId}','parts',this.checked)"></td>
                    <td class="p-3 text-center"><input type="checkbox" id="perm-approve-all-${safeId}" ${perms.approveScope==='all' ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''} onchange="app.toggleApproveScopeCheckbox('${safeId}','all',this.checked)"></td>
                    <td class="p-3 text-center"><input type="checkbox" id="perm-manage-${safeId}" ${perms.canManageUsers ? 'checked' : ''} ${isMasterRow ? 'disabled' : ''}></td>
                </tr>`;
            }).join('');

            document.getElementById('app-container').innerHTML = `<div class="w-full max-w-7xl mx-auto px-4 pt-8 pb-12 fade-in">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">마스터 권한 관리</h2>
                    <button onclick="app.refreshDashboard()" class="bg-white border border-gray-300 px-4 py-2 rounded-lg font-bold hover:bg-gray-50">대시보드로</button>
                </div>
                <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
                    <p class="text-sm text-gray-600">직원별로 체크박스를 선택하세요.</p>
                    <p class="text-sm text-gray-600">승인 권한은 매뉴얼팀/파츠북팀/모두 중 하나만 체크하세요.</p>
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
                    ${appData.meta.permissionsFromDb ? '' : `<div class="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">현재 DB가 권한 컬럼을 아직 읽지 못하고 있습니다. Apps Script를 권한 연동 버전으로 교체하고, 웹앱을 새 버전으로 배포해주세요.</div>`}
                </div>
                <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-visible relative">
                    <table class="w-full text-sm min-w-[1100px]">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="p-3 text-left bg-gray-50 border-b border-gray-200 sticky top-16 z-30">이름</th>
                                <th class="p-3 text-left bg-gray-50 border-b border-gray-200 sticky top-16 z-30">부서</th>
                                <th class="p-3 text-left bg-gray-50 border-b border-gray-200 sticky top-16 z-30">직급</th>
                                <th class="p-3 bg-gray-50 border-b border-gray-200 sticky top-16 z-30">자기연차</th>
                                <th class="p-3 bg-gray-50 border-b border-gray-200 sticky top-16 z-30">매뉴얼팀</th>
                                <th class="p-3 bg-gray-50 border-b border-gray-200 sticky top-16 z-30">파츠북팀</th>
                                <th class="p-3 bg-gray-50 border-b border-gray-200 sticky top-16 z-30">모두</th>
                                <th class="p-3 bg-gray-50 border-b border-gray-200 sticky top-16 z-30">승인(매뉴얼)</th>
                                <th class="p-3 bg-gray-50 border-b border-gray-200 sticky top-16 z-30">승인(파츠북)</th>
                                <th class="p-3 bg-gray-50 border-b border-gray-200 sticky top-16 z-30">승인(모두)</th>
                                <th class="p-3 bg-gray-50 border-b border-gray-200 sticky top-16 z-30">구성원 관리</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="mt-4 flex justify-end">
                    <button onclick="app.saveMasterPermissions()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700">권한 저장</button>
                </div>
            </div>${app.getModal()}`;
        },
        
        renderUserManagement: () => {
            if (!app.hasUserManagePermission()) {
                alert('구성원 관리 권한이 없습니다.');
                return app.refreshDashboard();
            }
            app.currentView = 'dashboard';
            app.renderNav();
            const list = app.getManageScopeUsers();
            document.getElementById('app-container').innerHTML = `<div class="w-full max-w-6xl mx-auto px-4 pt-8 fade-in pb-12">
                <button onclick="app.refreshDashboard()" class="mb-6 bg-white border border-gray-300 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 transition flex items-center text-sm"><i class="fa-solid fa-arrow-left mr-2"></i> 돌아가기</button>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                    <h3 class="font-bold text-lg mb-4 text-gray-800">새 직원 등록</h3>
                    <p class="text-xs text-gray-500 mb-3">기존 계정 비밀번호 초기화는 마스터만 가능합니다.</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                        <input id="new-name" placeholder="이름" class="border bg-gray-50 p-2.5 rounded">
                        <select id="new-dept" class="border bg-gray-50 p-2.5 rounded"><option value="매뉴얼팀">매뉴얼팀</option><option value="파츠북팀">파츠북팀</option></select>
                        <input id="new-id" placeholder="ID" class="border bg-gray-50 p-2.5 rounded">
                        <input id="new-pw" placeholder="비번(8자 이상)" class="border bg-gray-50 p-2.5 rounded">
                        <select id="new-role" class="border bg-gray-50 p-2.5 rounded"><option value="employee">일반 직원</option><option value="manager">팀장</option>${app.currentUser.role==='master'?'<option value="ceo">대표/임원</option>':''}</select>
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
                    <table class="w-full text-left min-w-[1300px]">
                        <thead class="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="p-4 text-sm font-bold text-gray-500">이름</th>
                                <th class="p-4 text-sm font-bold text-gray-500">부서</th>
                                <th class="p-4 text-sm font-bold text-gray-500">직급</th>
                                <th class="p-4 text-sm font-bold text-gray-500">ID</th>
                                <th class="p-4 text-sm font-bold text-gray-500">사번</th>
                                <th class="p-4 text-sm font-bold text-gray-500">전화번호</th>
                                <th class="p-4 text-sm font-bold text-gray-500">이메일</th>
                                <th class="p-4 text-sm font-bold text-gray-500 text-center">총 연차(일)</th>
                                <th class="p-4 text-sm font-bold text-gray-500">근무시간(분기)</th>
                                ${app.currentUser.role==='master' ? '<th class="p-4 text-sm font-bold text-gray-500 text-center">비밀번호</th>' : ''}
                                <th class="p-4 text-sm font-bold text-gray-500 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${list.map(u => {
                                const safeId = security.cleanInlineValue(u.id);
                                const isEditing = String(app.editingId) === String(safeId);
                                const workSummary = `<div class="space-y-1 text-xs text-gray-600"><div>1분기: ${app.getWorkShiftText(u.workQ1)}</div><div>2분기: ${app.getWorkShiftText(u.workQ2)}</div><div>3분기: ${app.getWorkShiftText(u.workQ3)}</div><div>4분기: ${app.getWorkShiftText(u.workQ4)}</div></div>`;
                                return `<tr class="hover:bg-gray-50 transition">
                                    <td class="p-4">${isEditing ? `<input id="n-${safeId}" value="${u.name}" class="border-b border-indigo-500 bg-transparent w-24 p-1 outline-none">` : `<span class="font-medium">${u.name}</span>`}</td>
                                    <td class="p-4 text-sm text-gray-600">${u.dept}</td>
                                    <td class="p-4 text-sm text-gray-600">${isEditing ? `<select id="r-${safeId}" class="bg-transparent border-b border-indigo-500 text-xs"><option value="사원" ${u.rank==='사원'?'selected':''}>사원</option><option value="대리" ${u.rank==='대리'?'selected':''}>대리</option><option value="과장" ${u.rank==='과장'?'selected':''}>과장</option><option value="차장" ${u.rank==='차장'?'selected':''}>차장</option><option value="부장" ${u.rank==='부장'?'selected':''}>부장</option><option value="팀장" ${u.rank==='팀장'?'selected':''}>팀장</option><option value="관리자" ${u.rank==='관리자'?'selected':''}>관리자</option><option value="대표" ${u.rank==='대표'?'selected':''}>대표</option></select>` : u.rank}</td>
                                    <td class="p-4 text-sm text-gray-400 text-xs">${u.id}</td>
                                    <td class="p-4 text-sm text-gray-600">${isEditing ? `<input id="emp-${safeId}" value="${u.employeeNo||''}" class="border-b border-indigo-500 bg-transparent w-24 p-1 outline-none text-xs">` : (u.employeeNo || '-')}</td>
                                    <td class="p-4 text-sm text-gray-600">${isEditing ? `<input id="ph-${safeId}" value="${u.phone||''}" class="border-b border-indigo-500 bg-transparent w-28 p-1 outline-none text-xs">` : (u.phone || '-')}</td>
                                    <td class="p-4 text-sm text-gray-600">${isEditing ? `<input id="e-${safeId}" value="${u.email||''}" class="border-b border-indigo-500 bg-transparent w-32 p-1 outline-none text-xs">` : (u.email||'-')}</td>
                                    <td class="p-4 text-center">${isEditing ? `<input id="d-${safeId}" value="${u.totalHours/8}" class="border border-indigo-500 rounded w-16 p-1 text-center text-sm outline-none">` : `<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">${u.totalHours/8}일</span>`}</td>
                                    <td class="p-4">${isEditing ? `<div class="grid grid-cols-2 gap-1"><select id="w1-${safeId}" class="border rounded p-1 text-xs">${makeWorkShiftOptions(u.workQ1)}</select><select id="w2-${safeId}" class="border rounded p-1 text-xs">${makeWorkShiftOptions(u.workQ2)}</select><select id="w3-${safeId}" class="border rounded p-1 text-xs">${makeWorkShiftOptions(u.workQ3)}</select><select id="w4-${safeId}" class="border rounded p-1 text-xs">${makeWorkShiftOptions(u.workQ4)}</select></div>` : workSummary}</td>
                                    ${app.currentUser.role==='master' ? `<td class="p-4 text-center">${isEditing ? `<input id="p-${safeId}" placeholder="새 비번" class="border border-indigo-500 rounded w-24 p-1 text-xs text-center outline-none">` : '<span class="text-gray-300 text-xs">****</span>'}</td>` : ''}
                                    <td class="p-4 text-right space-x-1">${isEditing ? `<button onclick="app.updateUser('${safeId}')" class="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-indigo-700">저장</button><button onclick="app.cancelEdit()" class="bg-gray-200 text-gray-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-300">취소</button>` : `<button onclick="app.setEditMode('${safeId}')" class="text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded text-xs font-bold border border-indigo-200">수정</button><button onclick="app.deleteUser('${safeId}')" class="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-xs font-bold border border-red-200">삭제</button>`}</td>
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




