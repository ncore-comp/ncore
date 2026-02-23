const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyPB-VzNB-_q1ldF3WiUTT2YCjU9NzIQ6-Ip-ZYMomcMjYgUn_oxxHheEWKkidD630J/exec";
const CLIENT_IP_URL = "https://api64.ipify.org?format=json";

    const initialAdmin = { users: [], requests: [] };
    const appData = { users: [], requests: [], boardPosts: [], holidays: {}, meta: { permissionsFromDb: false } };

    const ITEMS_PER_PAGE = 10;
    const WORK_SHIFT_OPTIONS = ['', '07:00 ~ 16:00', '08:00 ~ 17:00', '09:00 ~ 18:00'];

    const security = {
        defaultPermissions: () => ({
            calendarSelf: true,
            calendarManual: false,
            calendarParts: false,
            calendarAll: false,
            approveScope: 'none',
            canManageUsers: false
        }),
        cleanText: (value) => String(value ?? '').replace(/[<>"'`\\]/g, '').replace(/[\r\n\t]/g, ' ').trim(),
        cleanMultiline: (value) => String(value ?? '').replace(/[<>"'`\\]/g, '').replace(/\r/g, '').trim(),
        cleanInlineValue: (value) => String(value ?? '').replace(/[<>"'`\\]/g, '').trim(),
        cleanEmail: (value) => String(value ?? '').replace(/[\r\n\t<>"'`]/g, '').trim(),
        cleanPhone: (value) => String(value ?? '').replace(/[^\d\-+\s]/g, '').trim(),
        normalizeRole: (value) => ['employee', 'manager', 'ceo', 'master'].includes(value) ? value : 'employee',
        normalizeStatus: (value) => ['pending', 'approved', 'rejected', 'cancel_requested', 'cancelled'].includes(value) ? value : 'pending',
        normalizeBoardCategory: (value) => ['공지', '일반', '업무공유', '질문'].includes(String(value ?? '').trim()) ? String(value ?? '').trim() : '일반',
        normalizeBoardStatus: (value) => ['active', 'deleted'].includes(String(value ?? '').trim()) ? String(value ?? '').trim() : 'active',
        normalizeBool: (value, fallback = false) => {
            if (value === true || value === false) return value;
            if (value === 1 || value === '1') return true;
            if (value === 0 || value === '0') return false;
            if (typeof value === 'string') {
                const v = value.trim().toLowerCase();
                if (['true', 'yes', 'y', 'on'].includes(v)) return true;
                if (['false', 'no', 'n', 'off'].includes(v)) return false;
            }
            return fallback;
        },
        normalizeWorkShift: (value) => {
            const raw = String(value ?? '').trim();
            if (!raw) return '';
            const compact = raw.replace(/\s+/g, '');
            if (compact === '07:00~16:00' || compact === '07:00-16:00') return '07:00 ~ 16:00';
            if (compact === '08:00~17:00' || compact === '08:00-17:00') return '08:00 ~ 17:00';
            if (compact === '09:00~18:00' || compact === '09:00-18:00') return '09:00 ~ 18:00';
            return '';
        },
        normalizeType: (value) => {
            const raw = String(value ?? '').trim();
            if (raw === '조퇴' || raw === '시간차') return '시간차(퇴근)';
            if (raw === '외출') return '시간차(외출)';
            return ['연차', '반차', '시간차(퇴근)', '시간차(외출)'].includes(raw) ? raw : '연차';
        },
        normalizeNumber: (value, fallback = 0) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : fallback;
        },
        normalizeDate: (value, fallback = '') => {
            const raw = String(value ?? '').trim();
            if (!raw) return fallback;
            const parsed = moment(raw, ['YYYY-MM-DD', moment.ISO_8601], true);
            if (parsed.isValid()) return parsed.format('YYYY-MM-DD');
            return fallback;
        },
        normalizeTimestamp: (value) => {
            const parsed = moment(value);
            return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss');
        },
        isValidEmail: (value) => {
            if (!value) return true;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        sanitizeMailRecipients: (value) => {
            const items = String(value ?? '')
                .split(/[;,]/)
                .map((item) => security.cleanEmail(item))
                .filter((item) => item && security.isValidEmail(item));
            return [...new Set(items)].join(';');
        },
        sanitizePermissions: (permissions = {}, role = '', dept = '') => {
            const clean = {
                ...security.defaultPermissions(),
                calendarSelf: !!permissions.calendarSelf,
                calendarManual: !!permissions.calendarManual,
                calendarParts: !!permissions.calendarParts,
                calendarAll: !!permissions.calendarAll,
                approveScope: ['none', 'manual', 'parts', 'all'].includes(permissions.approveScope) ? permissions.approveScope : 'none',
                canManageUsers: !!permissions.canManageUsers
            };

            if (role === 'master') {
                clean.calendarSelf = true;
                clean.calendarManual = true;
                clean.calendarParts = true;
                clean.calendarAll = true;
                clean.approveScope = 'all';
                clean.canManageUsers = true;
                return clean;
            }

            // 마스터 외 계정은 역할명이 아니라, 저장된 permissions 값으로만 권한을 판단한다.

            if (!clean.calendarSelf && !clean.calendarManual && !clean.calendarParts && !clean.calendarAll) {
                clean.calendarSelf = true;
            }
            return clean;
        },
        sanitizeUser: (user = {}) => ({
            ...user,
            id: security.cleanInlineValue(user.id),
            password: String(user.password ?? ''),
            name: security.cleanText(user.name),
            role: security.normalizeRole(String(user.role ?? '')),
            dept: security.cleanText(user.dept),
            rank: security.cleanText(user.rank),
            totalHours: security.normalizeNumber(user.totalHours, 0),
            usedHours: security.normalizeNumber(user.usedHours, 0),
            pendingHours: security.normalizeNumber(user.pendingHours, 0),
            email: security.cleanEmail(user.email),
            phone: security.cleanPhone(user.phone),
            employeeNo: security.cleanInlineValue(user.employeeNo),
            workQ1: security.normalizeWorkShift(user.workQ1),
            workQ2: security.normalizeWorkShift(user.workQ2),
            workQ3: security.normalizeWorkShift(user.workQ3),
            workQ4: security.normalizeWorkShift(user.workQ4),
            featureMemberCard: security.normalizeBool(user.featureMemberCard, false),
            permissions: security.sanitizePermissions(user.permissions || {}, String(user.role ?? ''), security.cleanText(user.dept))
        }),
        sanitizeRequest: (req = {}) => {
            const startDate = security.normalizeDate(req.startDate, moment().format('YYYY-MM-DD'));
            const endDate = security.normalizeDate(req.endDate, startDate);
            return {
                ...req,
                id: security.cleanInlineValue(req.id),
                userId: security.cleanInlineValue(req.userId),
                userName: security.cleanText(req.userName),
                dept: security.cleanText(req.dept),
                role: security.normalizeRole(String(req.role ?? '')),
                type: security.normalizeType(String(req.type ?? '연차')),
                startDate,
                endDate,
                hours: security.normalizeNumber(req.hours, 0),
                timeRange: security.cleanText(req.timeRange),
                reason: security.cleanText(req.reason),
                status: security.normalizeStatus(String(req.status ?? 'pending')),
                timestamp: security.normalizeTimestamp(req.timestamp)
            };
        },
        sanitizeBoardPost: (post = {}) => {
            const now = moment().format('YYYY-MM-DD HH:mm:ss');
            return {
                ...post,
                id: security.cleanInlineValue(post.id || ''),
                title: security.cleanText(post.title || ''),
                content: security.cleanMultiline(post.content || ''),
                category: security.normalizeBoardCategory(post.category),
                authorId: security.cleanInlineValue(post.authorId || ''),
                authorName: security.cleanText(post.authorName || ''),
                authorDept: security.cleanText(post.authorDept || ''),
                isNotice: security.normalizeBool(post.isNotice, false),
                status: security.normalizeBoardStatus(post.status),
                viewCount: security.normalizeNumber(post.viewCount, 0),
                createdAt: security.normalizeTimestamp(post.createdAt || now),
                updatedAt: security.normalizeTimestamp(post.updatedAt || now)
            };
        },
        sanitizeHolidays: (holidays = {}) => {
            const clean = {};
            Object.entries(holidays).forEach(([dateKey, name]) => {
                const parsed = moment(dateKey, ['YYYY-MM-DD', moment.ISO_8601], true);
                if (!parsed.isValid()) return;
                clean[parsed.format('YYYY-MM-DD')] = security.cleanText(name);
            });
            return clean;
        }
    };

    function openOutlookDraft(to, subject, body) {
        const safeTo = security.sanitizeMailRecipients(to);
        if (!safeTo) {
            alert("수신자 이메일 주소가 등록되지 않아 메일 창을 띄울 수 없습니다.\n[구성원 관리]에서 이메일을 먼저 등록해주세요.");
            return;
        }
        const safeSubject = String(subject ?? '').replace(/[\r\n]/g, ' ').trim();
        const safeBody = String(body ?? '').replace(/\r/g, '');
        const mailtoLink = `mailto:${safeTo}?subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(safeBody)}`;
        window.location.href = mailtoLink;
    }

    const clientMeta = {
        ip: '',
        fetched: false
    };

    const db = {
        init: async () => { await db.load(); },
        getActor: () => {
            try {
                if (typeof app !== 'undefined' && app.currentUser) {
                    return {
                        id: security.cleanInlineValue(app.currentUser.id),
                        name: security.cleanText(app.currentUser.name)
                    };
                }
            } catch (e) {
                // noop
            }
            return { id: '', name: '' };
        },
        getClientIp: async () => {
            if (clientMeta.fetched) return clientMeta.ip;
            clientMeta.fetched = true;
            try {
                const response = await fetch(CLIENT_IP_URL, { cache: 'no-store' });
                const json = await response.json();
                clientMeta.ip = security.cleanInlineValue(json.ip || '');
            } catch (e) {
                clientMeta.ip = '';
            }
            return clientMeta.ip;
        },
        logAccess: async (payload = {}) => {
            try {
                const cleanPayload = {
                    action: 'log_access',
                    userId: security.cleanInlineValue(payload.userId || ''),
                    userName: security.cleanText(payload.userName || ''),
                    logType: security.cleanText(payload.logType || 'Action'),
                    detail: security.cleanText(payload.detail || ''),
                    clientIp: security.cleanInlineValue(payload.clientIp || '')
                };
                if (!cleanPayload.clientIp) cleanPayload.clientIp = await db.getClientIp();
                if (!cleanPayload.userId && !cleanPayload.userName) return;
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(cleanPayload)
                });
            } catch (e) {
                console.warn('access log skip', e);
            }
        },
        logAccessBeacon: (payload = {}) => {
            try {
                const cleanPayload = {
                    action: 'log_access',
                    userId: security.cleanInlineValue(payload.userId || ''),
                    userName: security.cleanText(payload.userName || ''),
                    logType: security.cleanText(payload.logType || 'Action'),
                    detail: security.cleanText(payload.detail || ''),
                    clientIp: security.cleanInlineValue(payload.clientIp || clientMeta.ip || '')
                };
                if (!cleanPayload.userId && !cleanPayload.userName) return false;
                if (!navigator.sendBeacon) return false;
                const blob = new Blob([JSON.stringify(cleanPayload)], { type: 'text/plain;charset=utf-8' });
                return navigator.sendBeacon(GOOGLE_SCRIPT_URL, blob);
            } catch (e) {
                console.warn('access beacon skip', e);
                return false;
            }
        },
        load: async () => {
            try {
                const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=load`);
                const json = await response.json();
                if (json.result === 'success') {
                    const data = json.data || {};
                    const rawUsers = Array.isArray(data.users) ? data.users : [];
                    appData.meta.permissionsFromDb = rawUsers.some(u => u && typeof u === 'object' && Object.prototype.hasOwnProperty.call(u, 'permissions'));
                    appData.users = rawUsers.map(security.sanitizeUser);
                    appData.requests = Array.isArray(data.requests) ? data.requests.map(security.sanitizeRequest) : [];
                    appData.boardPosts = Array.isArray(data.boardPosts)
                        ? data.boardPosts.map(security.sanitizeBoardPost).filter((post) => post.status !== 'deleted')
                        : [];
                    appData.holidays = security.sanitizeHolidays(data.holidays || {});
                }
            } catch (e) { console.error(e); } finally { document.getElementById('loading-overlay').style.display = 'none'; }
        },
        upsertReq: async (reqData) => {
            document.getElementById('loading-text').innerText = "저장 중...";
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeReq = security.sanitizeRequest(reqData);
                const cleanReq = {
                    ...safeReq,
                    startDate: moment(safeReq.startDate).format('YYYY-MM-DD'),
                    endDate: moment(safeReq.endDate).format('YYYY-MM-DD'),
                    timestamp: safeReq.timestamp ? moment(safeReq.timestamp).format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss')
                };
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'upsert_request', data: cleanReq, actor: db.getActor() })
                });
                const json = await response.json();
                if(json.result !== 'success') throw new Error("저장 실패");
                
                const idx = appData.requests.findIndex(r => String(r.id) === String(safeReq.id));
                if (idx > -1) appData.requests[idx] = cleanReq;
                else appData.requests.push(cleanReq);
                app.recalcUsedHours();
            } catch (e) { alert("오류: " + e.message); } finally { document.getElementById('loading-overlay').style.display = 'none'; }
        },
        deleteReq: async (id) => {
            document.getElementById('loading-text').innerText = "삭제 중...";
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeId = security.cleanInlineValue(id);
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'delete_request', id: safeId, actor: db.getActor() })
                });
                const json = await response.json();
                if(json.result !== 'success') throw new Error("삭제 실패");
                appData.requests = appData.requests.filter(r => String(r.id) !== String(safeId));
                app.recalcUsedHours();
            } catch (e) { alert("오류: " + e.message); } finally { document.getElementById('loading-overlay').style.display = 'none'; }
        },
        saveUsers: async () => {
            document.getElementById('loading-text').innerText = "유저 정보 저장 중...";
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeUsers = appData.users.map(security.sanitizeUser);
                appData.users = safeUsers;
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'save_users', users: safeUsers, actor: db.getActor() })
                });
                await response.json();
            } catch(e) {
                alert("유저 저장 오류");
            } finally {
                document.getElementById('loading-overlay').style.display = 'none';
            }
        },
        upsertBoardPost: async (postData) => {
            document.getElementById('loading-text').innerText = "게시글 저장 중...";
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const now = moment().format('YYYY-MM-DD HH:mm:ss');
                const safePost = security.sanitizeBoardPost(postData);
                const cleanPost = {
                    ...safePost,
                    createdAt: safePost.createdAt || now,
                    updatedAt: now
                };
                if (!cleanPost.id) cleanPost.id = String(Date.now());
                if (!cleanPost.title || !cleanPost.content) throw new Error('제목과 내용을 입력하세요.');

                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'upsert_board_post', data: cleanPost, actor: db.getActor() })
                });
                const json = await response.json();
                if (json.result !== 'success') throw new Error(json.message || '게시글 저장 실패');

                const idx = appData.boardPosts.findIndex((post) => String(post.id) === String(cleanPost.id));
                if (idx > -1) appData.boardPosts[idx] = cleanPost;
                else appData.boardPosts.push(cleanPost);
            } finally {
                document.getElementById('loading-overlay').style.display = 'none';
            }
        },
        deleteBoardPost: async (id) => {
            document.getElementById('loading-text').innerText = "게시글 삭제 중...";
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeId = security.cleanInlineValue(id);
                if (!safeId) throw new Error('잘못된 글 번호입니다.');

                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'delete_board_post', id: safeId, actor: db.getActor() })
                });
                const json = await response.json();
                if (json.result !== 'success') throw new Error(json.message || '게시글 삭제 실패');
                appData.boardPosts = appData.boardPosts.filter((post) => String(post.id) !== String(safeId));
            } finally {
                document.getElementById('loading-overlay').style.display = 'none';
            }
        }
    };

    const holidayLogic = {
        isRedDay: (dateStr) => { 
            const d = new Date(dateStr); 
            const formatted = moment(dateStr).format('YYYY-MM-DD'); 
            const holName = appData.holidays ? appData.holidays[formatted] : null; 
            return d.getDay() === 0 || !!holName; 
        },
        getHolName: (dateStr) => {
            const formatted = moment(dateStr).format('YYYY-MM-DD'); 
            return appData.holidays ? appData.holidays[formatted] : null;
        },
        isSat: (dateStr) => new Date(dateStr).getDay() === 6,
        calcBizDays: (s, e) => {
            let cnt = 0, cur = moment(s), end = moment(e);
            while(cur.isSameOrBefore(end)){
                const ds = cur.format('YYYY-MM-DD');
                if(!holidayLogic.isRedDay(ds) && !holidayLogic.isSat(ds)) cnt++;
                cur.add(1,'d');
            } return cnt;
        }
    };

    const timeLogic = {
        getEff: (s,e) => { let c=0; for(let i=s;i<e;i++) if(i!==12) c++; return c; },
        calcStart: (d,e) => { let n=d, c=e; while(n>0){ c--; if(c!==12) n--; } return c; }
    };

    function makeTimeOptions() {
        let options = '';
        for(let i=7; i<=17; i++) {
            const val = i < 10 ? '0' + i : i;
            options += `<option value="${i}">${val}:00</option>`;
        }
        return options;
    }

    function makeDurationOptions(maxHour = 10) {
        let options = '';
        for (let i = 1; i <= maxHour; i++) {
            options += `<option value="${i}">${i}시간</option>`;
        }
        return options;
    }

    function makeWorkShiftOptions(selected = '') {
        const safeSelected = security.normalizeWorkShift(selected);
        return WORK_SHIFT_OPTIONS.map((shift) => {
            const text = shift || '미등록';
            return `<option value="${shift}" ${shift === safeSelected ? 'selected' : ''}>${text}</option>`;
        }).join('');
    }

