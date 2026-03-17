const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylWOarcxi5mMqQ7kh-vRr0H28a80P9YmpIfqang-ybS9DSLwaazbOzzH1wtHt95htf/exec";
const CLIENT_IP_URL = "https://api64.ipify.org?format=json";
const SCRIPT_REQUEST_TIMEOUT_MS = 15000;

    const initialAdmin = { users: [], requests: [] };
    const appData = {
        users: [],
        requests: [],
        boardPosts: [],
        holidays: {},
        specialLeaveTypes: [],
        userSpecialLeaves: [],
        mailRoutes: [],
        meta: {
            permissionsFromDb: false,
            scopedLoadSupported: false,
            lastLoadScope: 'all',
            requestsLoaded: false,
            requestDataVersion: 0
        }
    };

    const ITEMS_PER_PAGE = 10;
    const WORK_SHIFT_OPTIONS = ['', '07:00 ~ 16:00', '08:00 ~ 17:00', '09:00 ~ 18:00'];
    const security = {
        defaultPermissions: () => ({
            calendarSelf: true,
            calendarManual: false,
            calendarParts: false,
            calendarAll: false,
            approveScope: 'none',
            memberStatusScope: 'none',
            canAccessMasterSettings: false,
            canManageUsers: false
        }),
        cleanText: (value) => String(value ?? '').replace(/[<>"'`\\]/g, '').replace(/[\r\n\t]/g, ' ').trim(),
        cleanMultiline: (value) => String(value ?? '').replace(/[<>"'`\\]/g, '').replace(/\r/g, '').trim(),
        cleanInlineValue: (value) => String(value ?? '').replace(/[<>"'`\\]/g, '').trim(),
        cleanEmail: (value) => String(value ?? '').replace(/[\r\n\t<>"'`]/g, '').trim(),
        cleanPhone: (value) => String(value ?? '').replace(/[^\d\-+\s]/g, '').trim(),
        normalizeRole: (value) => {
            const raw = String(value ?? '').trim().toLowerCase();
            if (raw === 'master' || raw === '마스터') return 'master';
            if (raw === 'ceo' || raw === '대표') return 'ceo';
            if (raw === 'manager' || raw === 'teamleader' || raw === 'team_leader' || raw === '팀리더' || raw === '팀장') return 'team_leader';
            if (raw === 'partleader' || raw === 'part_leader' || raw === '파트리더' || raw === '파트장') return 'part_leader';
            return 'employee';
        },
        normalizeStatus: (value) => ['pending', 'approved', 'rejected', 'cancel_requested', 'cancelled'].includes(value) ? value : 'pending',
        normalizeBoardCategory: (value) => ['\uACF5\uC9C0', '\uC77C\uBC18', '\uC5C5\uBB34\uACF5\uC720', '\uC9C8\uBB38'].includes(String(value ?? '').trim()) ? String(value ?? '').trim() : '\uC77C\uBC18',
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
            if (raw === '\uC870\uD1F4' || raw === '\uC2DC\uAC04\uCC28(\uD1F4\uADFC)') return '\uC2DC\uAC04\uCC28(\uD1F4\uADFC)';
            if (raw === '\uC678\uCD9C' || raw === '\uC2DC\uAC04\uCC28(\uC678\uCD9C)') return '\uC2DC\uAC04\uCC28(\uC678\uCD9C)';
            if (raw === '\uBC18\uCC28') return '\uBC18\uCC28(\uC624\uD6C4)';
            if (['\uBC18\uCC28(\uC624\uC804)', '\uBC18\uCC28 (4\uC2DC\uAC04/\uC624\uC804)', '\uBC18\uCC28(4\uC2DC\uAC04/\uC624\uC804)', '\uC624\uC804 \uBC18\uCC28'].includes(raw)) return '\uBC18\uCC28(\uC624\uC804)';
            if (['\uBC18\uCC28(\uC624\uD6C4)', '\uBC18\uCC28 (4\uC2DC\uAC04/\uC624\uD6C4)', '\uBC18\uCC28(4\uC2DC\uAC04/\uC624\uD6C4)', '\uC624\uD6C4 \uBC18\uCC28'].includes(raw)) return '\uBC18\uCC28(\uC624\uD6C4)';
            return ['\uC5F0\uCC28', '\uBC18\uCC28(\uC624\uC804)', '\uBC18\uCC28(\uC624\uD6C4)', '\uC2DC\uAC04\uCC28(\uD1F4\uADFC)', '\uC2DC\uAC04\uCC28(\uC678\uCD9C)'].includes(raw) ? raw : '\uC5F0\uCC28';
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
        normalizeSpecialLeaveTypeKey: (value) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40),
        normalizeSpecialLeaveColor: (value) => {
            const safe = String(value ?? '').trim().toLowerCase();
            return ['rose', 'sky', 'emerald', 'amber', 'violet', 'indigo', 'slate'].includes(safe) ? safe : 'slate';
        },
        normalizeSpecialLeaveRequestMode: (value) => {
            const safe = String(value ?? '').trim().toLowerCase();
            return safe === 'day_only' ? 'day_only' : 'same_as_annual';
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
            const safeApproveScope = ['none', 'manual', 'parts', 'all'].includes(permissions.approveScope)
                ? permissions.approveScope
                : 'none';
            const safeMemberStatusScope = ['none', 'manual', 'parts', 'all'].includes(permissions.memberStatusScope)
                ? permissions.memberStatusScope
                : safeApproveScope;
            const clean = {
                ...security.defaultPermissions(),
                calendarSelf: !!permissions.calendarSelf,
                calendarManual: !!permissions.calendarManual,
                calendarParts: !!permissions.calendarParts,
                calendarAll: !!permissions.calendarAll,
                approveScope: safeApproveScope,
                memberStatusScope: safeMemberStatusScope,
                canAccessMasterSettings: !!permissions.canAccessMasterSettings,
                canManageUsers: !!permissions.canManageUsers
            };

            if (role === 'master') {
                clean.calendarSelf = true;
                clean.calendarManual = true;
                clean.calendarParts = true;
                clean.calendarAll = true;
                clean.approveScope = 'all';
                clean.memberStatusScope = 'all';
                clean.canAccessMasterSettings = true;
                clean.canManageUsers = true;
                return clean;
            }

            // Use DB permission values for non-master users

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
            featureBoard: security.normalizeBool(user.featureBoard, true),
            featureHomepage: security.normalizeBool(user.featureHomepage, false),
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
                type: security.normalizeType(String(req.type ?? '\uC5F0\uCC28')),
                startDate,
                endDate,
                hours: security.normalizeNumber(req.hours, 0),
                timeRange: security.cleanText(req.timeRange),
                reason: security.cleanText(req.reason),
                status: security.normalizeStatus(String(req.status ?? 'pending')),
                timestamp: security.normalizeTimestamp(req.timestamp),
                specialLeaveTypeKey: security.normalizeSpecialLeaveTypeKey(req.specialLeaveTypeKey),
                specialLeaveTypeLabel: security.cleanText(req.specialLeaveTypeLabel || ''),
                rejectReason: security.cleanText(req.rejectReason || '')
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
        },
        sanitizeSpecialLeaveType: (item = {}) => ({
            typeKey: security.normalizeSpecialLeaveTypeKey(item.typeKey),
            label: security.cleanText(item.label || ''),
            enabled: security.normalizeBool(item.enabled, false),
            sortOrder: security.normalizeNumber(item.sortOrder, 0),
            color: security.normalizeSpecialLeaveColor(item.color),
            grantHours: Math.max(0, security.normalizeNumber(item.grantHours, 0)),
            requestMode: security.normalizeSpecialLeaveRequestMode(item.requestMode)
        }),
        sanitizeUserSpecialLeave: (item = {}) => ({
            userId: security.cleanInlineValue(item.userId),
            typeKey: security.normalizeSpecialLeaveTypeKey(item.typeKey),
            totalHours: Math.max(0, security.normalizeNumber(item.totalHours, 0)),
            usedHours: Math.max(0, security.normalizeNumber(item.usedHours, 0)),
            note: security.cleanText(item.note || ''),
            updatedAt: security.normalizeTimestamp(item.updatedAt)
        }),
        sanitizeMailRoute: (item = {}) => {
            const ccRaw = Array.isArray(item.ccUserIds) ? item.ccUserIds : String(item.ccUserIds || '').split(/[;,]/);
            return {
                dept: security.cleanText(item.dept || ''),
                roleGroup: String(item.roleGroup || '').trim().toLowerCase() === 'leader' ? 'leader' : 'staff',
                toUserId: security.cleanInlineValue(item.toUserId || ''),
                ccUserIds: [...new Set(ccRaw.map((value) => security.cleanInlineValue(value)).filter(Boolean))]
            };
        },
        mergeSpecialLeaveTypes: (items = []) => {
            return (Array.isArray(items) ? items : [])
                .map((item) => security.sanitizeSpecialLeaveType(item))
                .filter((item) => item.typeKey && item.label)
                .sort((a, b) =>
                Number(a.sortOrder || 0) - Number(b.sortOrder || 0) ||
                String(a.label || '').localeCompare(String(b.label || ''), 'ko')
            );
        }
    };

    function openOutlookDraft(to, subject, body, cc = '') {
        const safeTo = security.sanitizeMailRecipients(to);
        if (!safeTo) {
            alert('\uC218\uC2E0\uC790 \uC774\uBA54\uC77C \uC8FC\uC18C\uAC00 \uC5C6\uC5B4 \uBA54\uC77C \uCC3D\uC744 \uC5F4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.\n[\uAD6C\uC131\uC6D0 \uAD00\uB9AC]\uC5D0\uC11C \uC774\uBA54\uC77C\uC744 \uBA3C\uC800 \uB4F1\uB85D\uD574\uC8FC\uC138\uC694.');
            return;
        }
        const safeCc = security.sanitizeMailRecipients(cc);
        const safeSubject = String(subject ?? '').replace(/[\r\n]/g, ' ').trim();
        const safeBody = String(body ?? '').replace(/\r/g, '');
        const params = [
            `subject=${encodeURIComponent(safeSubject)}`,
            safeCc ? `cc=${encodeURIComponent(safeCc)}` : '',
            `body=${encodeURIComponent(safeBody)}`
        ].filter(Boolean).join('&');
        const mailtoLink = `mailto:${safeTo}?${params}`;
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
                const response = await db.fetchWithTimeout(CLIENT_IP_URL, { cache: 'no-store' }, 8000);
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
                isRetryableError: (json) => {
            if (!json || typeof json !== 'object') return false;
            if (String(json.result || '') !== 'error') return false;
            const msg = String(json.message || '').toLowerCase();
            if (!msg) return true;
            return (
                msg.includes('\uC11C\uBC84') ||
                msg.includes('timeout') ||
                msg.includes('too many') ||
                msg.includes('service invoked') ||
                msg.includes('lock') ||
                msg.includes('busy')
            );
        },
        waitRetry: async (delayMs = 0) => {
            if (delayMs <= 0) return;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        },
        fetchWithTimeout: async (url, init = {}, timeoutMs = SCRIPT_REQUEST_TIMEOUT_MS) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                return await fetch(url, {
                    ...init,
                    signal: controller.signal
                });
            } catch (e) {
                if (e && e.name === 'AbortError') {
                    throw new Error('SCRIPT_TIMEOUT');
                }
                throw e;
            } finally {
                clearTimeout(timer);
            }
        },
        fetchJsonWithTimeout: async (url, init = {}, timeoutMs = SCRIPT_REQUEST_TIMEOUT_MS) => {
            const response = await db.fetchWithTimeout(url, init, timeoutMs);
            const contentType = String(response.headers.get('content-type') || '').toLowerCase();
            const responseText = await response.text();
            let json = null;
            if (contentType.includes('application/json')) {
                try {
                    json = JSON.parse(responseText);
                } catch (e) {
                    throw new Error('SCRIPT_INVALID_JSON');
                }
            }
            if (!response.ok) {
                if (response.status === 403) throw new Error('SCRIPT_FORBIDDEN');
                throw new Error(`SCRIPT_HTTP_${response.status}`);
            }
            if (json) return json;
            if (responseText.includes('문서가 없습니다')) throw new Error('SCRIPT_DOC_NOT_FOUND');
            throw new Error('SCRIPT_INVALID_RESPONSE');
        },
        getScriptErrorMessage: (error) => {
            const raw = String((error && error.message) || error || '');
            if (raw === 'SCRIPT_TIMEOUT') {
                return 'Apps Script 응답이 없습니다. 배포 URL 또는 배포 상태를 확인해주세요.';
            }
            if (raw === 'SCRIPT_FORBIDDEN') {
                return 'Apps Script 배포 접근 권한이 없습니다. 웹 앱 권한을 "모든 사용자"로 다시 배포해주세요.';
            }
            if (raw === 'SCRIPT_DOC_NOT_FOUND') {
                return 'Apps Script가 연결된 스프레드시트를 찾지 못했습니다. 배포 계정과 문서 권한을 확인해주세요.';
            }
            if (raw === 'SCRIPT_INVALID_JSON' || raw === 'SCRIPT_INVALID_RESPONSE') {
                return 'Apps Script가 JSON 대신 오류 페이지를 반환했습니다. 배포 URL과 접근 권한을 확인해주세요.';
            }
            if (raw.startsWith('SCRIPT_HTTP_')) {
                return `Apps Script 응답 오류(${raw.replace('SCRIPT_HTTP_', '')})가 발생했습니다.`;
            }
            return raw;
        },
        postJsonWithRetry: async (payload, options = {}) => {
            const retries = Number.isFinite(options.retries) ? options.retries : 0;
            const baseDelayMs = Number.isFinite(options.baseDelayMs) ? options.baseDelayMs : 400;
            const maxRetryWaitMs = Number.isFinite(options.maxRetryWaitMs) ? options.maxRetryWaitMs : 12000;
            const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : SCRIPT_REQUEST_TIMEOUT_MS;
            let lastJson = null;
            let waitedMs = 0;
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    const json = await db.fetchJsonWithTimeout(GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify(payload)
                    }, timeoutMs);
                    lastJson = json;
                    if (!db.isRetryableError(json)) return json;
                    if (attempt === retries) return json;
                    const remainMs = maxRetryWaitMs - waitedMs;
                    const baseDelay = baseDelayMs * Math.pow(2, attempt);
                    const jitterMs = Math.floor(Math.random() * 301) + 100; // 100~400ms 무작위 지연
                    const nextDelay = Math.min(baseDelay + jitterMs, remainMs);
                    if (nextDelay <= 0) {
                        return { result: 'error', message: 'SERVER_BUSY_TIMEOUT', retryTimeout: true };
                    }
                    const loadingTextEl = document.getElementById('loading-text');
                    if (loadingTextEl) loadingTextEl.innerText = '\uC800\uC7A5 \uC911\uC785\uB2C8\uB2E4. \uC7A0\uC2DC\uB9CC \uAE30\uB2E4\uB824\uC8FC\uC138\uC694.';
                    await db.waitRetry(nextDelay);
                    waitedMs += nextDelay;
                } catch (e) {
                    if (attempt === retries) throw e;
                    const remainMs = maxRetryWaitMs - waitedMs;
                    const baseDelay = baseDelayMs * Math.pow(2, attempt);
                    const jitterMs = Math.floor(Math.random() * 301) + 100; // 100~400ms 무작위 지연
                    const nextDelay = Math.min(baseDelay + jitterMs, remainMs);
                    if (nextDelay <= 0) {
                        return { result: 'error', message: 'SERVER_BUSY_TIMEOUT', retryTimeout: true };
                    }
                    const loadingTextEl = document.getElementById('loading-text');
                    if (loadingTextEl) loadingTextEl.innerText = '\uC800\uC7A5 \uC911\uC785\uB2C8\uB2E4. \uC7A0\uC2DC\uB9CC \uAE30\uB2E4\uB824\uC8FC\uC138\uC694.';
                    await db.waitRetry(nextDelay);
                    waitedMs += nextDelay;
                }
            }
            return lastJson || { result: 'error', message: 'SERVER_BUSY_TIMEOUT', retryTimeout: true };
        },
        applyLoadData: (data = {}, options = {}) => {
            const applyUsers = options.users !== false;
            const applyRequests = options.requests !== false;
            const applyBoardPosts = options.boardPosts !== false;
            const applyHolidays = options.holidays !== false;
            const applySpecialLeaveTypes = options.specialLeaveTypes !== false;
            const applyUserSpecialLeaves = options.userSpecialLeaves !== false;
            const applyMailRoutes = options.mailRoutes !== false;

            if (applyUsers) {
                const rawUsers = Array.isArray(data.users) ? data.users : [];
                appData.meta.permissionsFromDb = rawUsers.some(
                    (u) => u && typeof u === 'object' && Object.prototype.hasOwnProperty.call(u, 'permissions')
                );
                appData.users = rawUsers.map(security.sanitizeUser);
            }
            if (applyRequests) {
                appData.requests = Array.isArray(data.requests)
                    ? data.requests.map(security.sanitizeRequest)
                    : [];
                appData.meta.requestsLoaded = true;
                appData.meta.requestDataVersion += 1;
            }
            if (applyBoardPosts) {
                appData.boardPosts = Array.isArray(data.boardPosts)
                    ? data.boardPosts.map(security.sanitizeBoardPost).filter((post) => post.status !== 'deleted')
                    : [];
            }
            if (applyHolidays) {
                appData.holidays = security.sanitizeHolidays(data.holidays || {});
            }
            if (applySpecialLeaveTypes) {
                appData.specialLeaveTypes = security.mergeSpecialLeaveTypes(data.specialLeaveTypes || []);
            }
            if (applyUserSpecialLeaves) {
                appData.userSpecialLeaves = Array.isArray(data.userSpecialLeaves)
                    ? data.userSpecialLeaves.map(security.sanitizeUserSpecialLeave).filter((item) => item.userId && item.typeKey)
                    : [];
            }
            if (applyMailRoutes) {
                appData.mailRoutes = Array.isArray(data.mailRoutes)
                    ? data.mailRoutes.map(security.sanitizeMailRoute).filter((item) => item.dept && item.toUserId)
                    : [];
            }
        },
        loadWithScope: async (scope = 'all', options = {}) => {
            try {
                const safeScope = ['all', 'boot', 'rest'].includes(String(scope)) ? String(scope) : 'all';
                const loadUrl = safeScope === 'all'
                    ? `${GOOGLE_SCRIPT_URL}?action=load`
                    : `${GOOGLE_SCRIPT_URL}?action=load&scope=${encodeURIComponent(safeScope)}`;
                const json = await db.fetchJsonWithTimeout(loadUrl, {}, SCRIPT_REQUEST_TIMEOUT_MS);
                if (json.result !== 'success') return { ok: false, scopedLoadSupported: false, scope: safeScope };

                const meta = json.meta && typeof json.meta === 'object' ? json.meta : {};
                appData.meta.scopedLoadSupported = !!meta.scopedLoad;
                appData.meta.lastLoadScope = String(meta.scope || safeScope || 'all');
                db.applyLoadData(json.data || {}, options);
                return {
                    ok: true,
                    scopedLoadSupported: !!meta.scopedLoad,
                    scope: appData.meta.lastLoadScope
                };
            } catch (e) {
                console.error(e);
                return { ok: false, scopedLoadSupported: false, scope: String(scope || 'all'), error: db.getScriptErrorMessage(e) };
            }
        },
        load: async () => db.loadWithScope('all', { users: true, requests: true, boardPosts: true, holidays: true, specialLeaveTypes: true, userSpecialLeaves: true, mailRoutes: true }),
        loadBoot: async () => db.loadWithScope('boot', { users: true, requests: false, boardPosts: false, holidays: true, specialLeaveTypes: true, userSpecialLeaves: true, mailRoutes: true }),
        loadDeferred: async () => db.loadWithScope('rest', { users: false, requests: true, boardPosts: true, holidays: false, specialLeaveTypes: false, userSpecialLeaves: false, mailRoutes: false }),
        upsertReq: async (reqData, options = {}) => {
            const keepOverlayOnSuccess = !!options.keepOverlayOnSuccess;
            const expectedStatus = security.normalizeStatus(String(options.expectedStatus || ''));
            let saveSucceeded = false;
            document.getElementById('loading-text').innerText = '\uC800\uC7A5 \uC911... \uC7A0\uC2DC\uB9CC \uAE30\uB2E4\uB824\uC8FC\uC138\uC694.';
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeReq = security.sanitizeRequest(reqData);
                const cleanReq = {
                    ...safeReq,
                    startDate: moment(safeReq.startDate).format('YYYY-MM-DD'),
                    endDate: moment(safeReq.endDate).format('YYYY-MM-DD'),
                    timestamp: safeReq.timestamp ? moment(safeReq.timestamp).format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss')
                };
                const json = await db.postJsonWithRetry(
                    { action: 'upsert_request', data: cleanReq, actor: db.getActor(), expectedStatus: expectedStatus || '' },
                    { retries: 20, baseDelayMs: 350, maxRetryWaitMs: 12000 }
                );
                if (json.result !== 'success') {
                    if (json.retryTimeout || String(json.message || '') === 'SERVER_BUSY_TIMEOUT') {
                        throw new Error('SERVER_BUSY_TIMEOUT');
                    }
                    if (String(json.message || '') === 'REQUEST_DUPLICATE_CONFLICT') {
                        const duplicateStart = security.normalizeDate(String(json.duplicateStartDate || ''), '');
                        const duplicateEnd = security.normalizeDate(String(json.duplicateEndDate || ''), duplicateStart);
                        throw new Error(`REQUEST_DUPLICATE_CONFLICT:${duplicateStart}:${duplicateEnd}`);
                    }
                    if (String(json.message || '') === 'REQUEST_STATE_CONFLICT') {
                        const currentStatus = security.normalizeStatus(String(json.currentStatus || 'pending'));
                        throw new Error(`REQUEST_STATE_CONFLICT:${currentStatus}`);
                    }
                    throw new Error(String(json.message || 'REQUEST_SAVE_FAILED'));
                }
                const idx = appData.requests.findIndex(r => String(r.id) === String(safeReq.id));
                if (idx > -1) appData.requests[idx] = cleanReq;
                else appData.requests.push(cleanReq);
                appData.meta.requestDataVersion += 1;
                app.recalcUsedHours();
                saveSucceeded = true;
                return true;
            } catch (e) {
                const msg = String((e && e.message) || '');
                if (msg === 'SERVER_BUSY_TIMEOUT') {
                    alert('\uB3D9\uC2DC \uB4F1\uB85D\uC774 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4\uC5D0 \uC7AC\uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.');
                } else {
                    alert('\uC624\uB958: ' + msg);
                }
                return false;
            } finally {
                if (!keepOverlayOnSuccess || !saveSucceeded) {
                    document.getElementById('loading-overlay').style.display = 'none';
                }
            }
        },
        deleteReq: async (id) => {
            document.getElementById('loading-text').innerText = '\uC0AD\uC81C \uC911...';
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeId = security.cleanInlineValue(id);
                const json = await db.fetchJsonWithTimeout(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'delete_request', id: safeId, actor: db.getActor() })
                });
                if(json.result !== 'success') throw new Error('\uC0AD\uC81C \uC2E4\uD328');
                appData.requests = appData.requests.filter(r => String(r.id) !== String(safeId));
                appData.meta.requestDataVersion += 1;
                app.recalcUsedHours();
            } catch (e) { alert('\uC624\uB958: ' + e.message); } finally { document.getElementById('loading-overlay').style.display = 'none'; }
        },
        saveUsers: async (options = {}) => {
            const keepOverlayOnSuccess = !!options.keepOverlayOnSuccess;
            const throwOnError = !!options.throwOnError;
            const showErrorAlert = options.showErrorAlert !== false;
            const loadingText = String(options.loadingText || '\uC720\uC800 \uC815\uBCF4 \uC800\uC7A5 \uC911...');
            let saveSucceeded = false;
            document.getElementById('loading-text').innerText = loadingText;
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeUsers = appData.users.map(security.sanitizeUser);
                appData.users = safeUsers;
                const json = await db.fetchJsonWithTimeout(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'save_users', users: safeUsers, actor: db.getActor() })
                });
                if (json.result !== 'success') throw new Error(json.message || '\uC720\uC800 \uC800\uC7A5 \uC2E4\uD328');
                saveSucceeded = true;
                return true;
            } catch(e) {
                if (showErrorAlert) alert('\uC720\uC800 \uC800\uC7A5 \uC624\uB958');
                if (throwOnError) throw e;
                return false;
            } finally {
                if (!keepOverlayOnSuccess || !saveSucceeded) {
                    document.getElementById('loading-overlay').style.display = 'none';
                }
            }
        },
        upsertUser: async (userData, options = {}) => {
            const keepOverlayOnSuccess = !!options.keepOverlayOnSuccess;
            const showErrorAlert = options.showErrorAlert !== false;
            const loadingText = String(options.loadingText || '\uC9C1\uC6D0 \uC815\uBCF4 \uC800\uC7A5 \uC911...');
            let saveSucceeded = false;
            document.getElementById('loading-text').innerText = loadingText;
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeUser = security.sanitizeUser(userData || {});
                if (!safeUser.id) throw new Error('\uC0AC\uC6A9\uC790 ID\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.');
                const json = await db.fetchJsonWithTimeout(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'upsert_user', data: safeUser, actor: db.getActor() })
                });
                if (json.result !== 'success') throw new Error(json.message || '\uC9C1\uC6D0 \uC800\uC7A5 \uC2E4\uD328');

                const savedUser = security.sanitizeUser(json.user || safeUser);
                const idx = appData.users.findIndex((u) => String(u.id) === String(savedUser.id));
                if (idx > -1) appData.users[idx] = savedUser;
                else appData.users.push(savedUser);
                saveSucceeded = true;
                return savedUser;
            } catch (e) {
                if (showErrorAlert) alert('\uC624\uB958: ' + e.message);
                throw e;
            } finally {
                if (!keepOverlayOnSuccess || !saveSucceeded) {
                    document.getElementById('loading-overlay').style.display = 'none';
                }
            }
        },
        saveSpecialLeaveTypes: async (types = [], options = {}) => {
            const keepOverlayOnSuccess = !!options.keepOverlayOnSuccess;
            const loadingText = String(options.loadingText || '설정 저장 중입니다...');
            let saveSucceeded = false;
            document.getElementById('loading-text').innerText = loadingText;
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeTypes = security.mergeSpecialLeaveTypes(types);
                const json = await db.fetchJsonWithTimeout(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'save_special_leave_types', types: safeTypes, actor: db.getActor() })
                });
                if (json.result !== 'success') throw new Error(json.message || '특별휴가 종류 저장 실패');
                appData.specialLeaveTypes = security.mergeSpecialLeaveTypes(json.types || safeTypes);
                saveSucceeded = true;
                return appData.specialLeaveTypes;
            } finally {
                if (!keepOverlayOnSuccess || !saveSucceeded) {
                    document.getElementById('loading-overlay').style.display = 'none';
                }
            }
        },
        saveUserSpecialLeaves: async (userId, leaves = [], options = {}) => {
            const keepOverlayOnSuccess = !!options.keepOverlayOnSuccess;
            const loadingText = String(options.loadingText || '직원 정보 저장 중입니다...');
            let saveSucceeded = false;
            document.getElementById('loading-text').innerText = loadingText;
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeUserId = security.cleanInlineValue(userId);
                const safeLeaves = Array.isArray(leaves)
                    ? leaves.map((item) => security.sanitizeUserSpecialLeave({ ...item, userId: safeUserId })).filter((item) => item.userId && item.typeKey)
                    : [];
                const json = await db.fetchJsonWithTimeout(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'save_user_special_leaves', userId: safeUserId, leaves: safeLeaves, actor: db.getActor() })
                });
                if (json.result !== 'success') throw new Error(json.message || '특별휴가 저장 실패');
                appData.userSpecialLeaves = [
                    ...appData.userSpecialLeaves.filter((item) => String(item.userId) !== String(safeUserId)),
                    ...(Array.isArray(json.leaves) ? json.leaves.map(security.sanitizeUserSpecialLeave) : [])
                ];
                saveSucceeded = true;
                return appData.userSpecialLeaves.filter((item) => String(item.userId) === String(safeUserId));
            } finally {
                if (!keepOverlayOnSuccess || !saveSucceeded) {
                    document.getElementById('loading-overlay').style.display = 'none';
                }
            }
        },
        saveMailRoutes: async (routes = [], options = {}) => {
            const keepOverlayOnSuccess = !!options.keepOverlayOnSuccess;
            const loadingText = String(options.loadingText || '메일 설정 저장 중입니다...');
            let saveSucceeded = false;
            document.getElementById('loading-text').innerText = loadingText;
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeRoutes = (Array.isArray(routes) ? routes : [])
                    .map(security.sanitizeMailRoute)
                    .filter((item) => item.dept && item.toUserId);
                const json = await db.fetchJsonWithTimeout(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'save_mail_routes', routes: safeRoutes, actor: db.getActor() })
                });
                if (json.result !== 'success') throw new Error(json.message || '메일 설정 저장 실패');
                appData.mailRoutes = Array.isArray(json.routes)
                    ? json.routes.map(security.sanitizeMailRoute).filter((item) => item.dept && item.toUserId)
                    : safeRoutes;
                saveSucceeded = true;
                return appData.mailRoutes;
            } finally {
                if (!keepOverlayOnSuccess || !saveSucceeded) {
                    document.getElementById('loading-overlay').style.display = 'none';
                }
            }
        },
        upsertBoardPost: async (postData) => {
            document.getElementById('loading-text').innerText = '\uAC8C\uC2DC\uAE00 \uC800\uC7A5 \uC911...';
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
                if (!cleanPost.title || !cleanPost.content) throw new Error('\uC81C\uBAA9\uACFC \uB0B4\uC6A9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.');

                const json = await db.fetchJsonWithTimeout(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'upsert_board_post', data: cleanPost, actor: db.getActor() })
                });
                if (json.result !== 'success') throw new Error(json.message || '\uAC8C\uC2DC\uAE00 \uC800\uC7A5 \uC2E4\uD328');

                const idx = appData.boardPosts.findIndex((post) => String(post.id) === String(cleanPost.id));
                if (idx > -1) appData.boardPosts[idx] = cleanPost;
                else appData.boardPosts.push(cleanPost);
            } finally {
                document.getElementById('loading-overlay').style.display = 'none';
            }
        },
        deleteBoardPost: async (id) => {
            document.getElementById('loading-text').innerText = '\uAC8C\uC2DC\uAE00 \uC0AD\uC81C \uC911...';
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeId = security.cleanInlineValue(id);
                if (!safeId) throw new Error('\uC798\uBABB\uB41C \uAE00 \uBC88\uD638\uC785\uB2C8\uB2E4.');

                const json = await db.fetchJsonWithTimeout(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'delete_board_post', id: safeId, actor: db.getActor() })
                });
                if (json.result !== 'success') throw new Error(json.message || '\uAC8C\uC2DC\uAE00 \uC0AD\uC81C \uC2E4\uD328');
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
            options += `<option value="${i}">${i}\uC2DC\uAC04</option>`;
        }
        return options;
    }

    function makeWorkShiftOptions(selected = '') {
        const safeSelected = security.normalizeWorkShift(selected);
        return WORK_SHIFT_OPTIONS.map((shift) => {
            const text = shift || '\uBBF8\uB4F1\uB85D';
            return `<option value="${shift}" ${shift === safeSelected ? 'selected' : ''}>${text}</option>`;
        }).join('');
    }






