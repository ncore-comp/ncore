const GOOGLE_SCRIPT_URL = (() => {
    try {
        if (typeof window !== 'undefined' && window.location) {
            const host = String(window.location.host || '').toLowerCase();
            const protocol = String(window.location.protocol || '').toLowerCase();
            if (protocol === 'file:') return 'https://ncore.web.app/api';
            if (host === 'localhost' || host === '127.0.0.1') return 'https://ncore.web.app/api';
        }
    } catch (e) {
        console.warn('api url fallback detect failed', e);
    }
    return '/api';
})();
const CLIENT_IP_URL = "https://api64.ipify.org?format=json";
const SCRIPT_REQUEST_TIMEOUT_MS = 15000;

    const initialAdmin = { users: [], requests: [] };
    const appData = {
        users: [],
        requests: [],
        boardPosts: [],
        holidays: {},
        accessLogs: [],
        securityLogs: [],
        manualHolidays: [],
        holidaySummary: { auto: 0, companyFixed: 0, manual: 0 },
        specialLeaveTypes: [],
        userSpecialLeaves: [],
        mailRoutes: [],
        meta: {
            permissionsFromDb: false,
            scopedLoadSupported: false,
            lastLoadScope: 'all',
            requestsLoaded: false,
            requestDataVersion: 0,
            boardPostsLoaded: false,
            situationBoardLoaded: false
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
            calendarRejected: false,
            calendarWorkReport: false,
            workReportViewManual: false,
            workReportViewParts: false,
            workReportViewAll: false,
            approveScope: 'none',
            memberStatusScope: 'none',
            canAccessMasterSettings: false,
            canManageUsers: false,
            canAccessMasterSettingsDesktop: false,
            canManageUsersDesktop: false,
            canAccessMasterSettingsMobile: false,
            canManageUsersMobile: false,
            canAccessAdminOps: false,
            canAccessAdminOpsDesktop: false,
            canAccessAdminOpsMobile: false,
            canAccessSituationBoard: false,
            canAccessSituationBoardDesktop: false,
            canAccessSituationBoardMobile: false
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
        normalizeStatus: (value) => ['pending', 'approved', 'rejected', 'cancel_requested', 'cancelled', 'reported'].includes(value) ? value : 'pending',
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
            return ['\uC5F0\uCC28', '\uBC18\uCC28(\uC624\uC804)', '\uBC18\uCC28(\uC624\uD6C4)', '\uC2DC\uAC04\uCC28(\uD1F4\uADFC)', '\uC2DC\uAC04\uCC28(\uC678\uCD9C)', '\uC794\uC5C5', '\uD2B9\uADFC'].includes(raw) ? raw : '\uC5F0\uCC28';
        },
        normalizeNumber: (value, fallback = 0) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : fallback;
        },
        excelSerialToMoment: (value) => {
            const raw = String(value ?? '').trim();
            if (!raw || !/^\d+(\.\d+)?$/.test(raw)) return null;
            const num = Number(raw);
            if (!Number.isFinite(num)) return null;
            return moment.utc('1899-12-30').add(num, 'days');
        },
        normalizeDate: (value, fallback = '') => {
            const raw = String(value ?? '').trim();
            if (!raw) return fallback;
            const parsed = moment(raw, ['YYYY-MM-DD', moment.ISO_8601], true);
            if (parsed.isValid()) return parsed.format('YYYY-MM-DD');
            const excelParsed = security.excelSerialToMoment(raw);
            if (excelParsed && excelParsed.isValid()) return excelParsed.format('YYYY-MM-DD');
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
        normalizeSpecialLeaveDayCountMode: (value) => {
            const safe = String(value ?? '').trim().toLowerCase();
            return safe === 'calendar_days' ? 'calendar_days' : 'business_days';
        },
        normalizeTimestamp: (value) => {
            const parsed = moment(value);
            if (parsed.isValid()) return parsed.format('YYYY-MM-DD HH:mm:ss');
            const excelParsed = security.excelSerialToMoment(value);
            if (excelParsed && excelParsed.isValid()) return excelParsed.format('YYYY-MM-DD HH:mm:ss');
            return moment().format('YYYY-MM-DD HH:mm:ss');
        },
        normalizeLogSortTimestamp: (value, fallback = 0) => {
            const num = Number(value);
            if (Number.isFinite(num)) {
                if (num > 100000000000) return Math.round(num);
                if (num > 30000) {
                    const excelMoment = security.excelSerialToMoment(num);
                    if (excelMoment && excelMoment.isValid()) return excelMoment.valueOf();
                }
            }
            const raw = String(value ?? '').trim();
            if (!raw) return fallback;
            const parsed = moment(raw, ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601], true);
            if (parsed.isValid()) return parsed.valueOf();
            const excelParsed = security.excelSerialToMoment(raw);
            if (excelParsed && excelParsed.isValid()) return excelParsed.valueOf();
            return fallback;
        },
        formatAccessLogTimestamp: (value) => {
            const raw = String(value ?? '').trim();
            if (!raw) return '-';
            const parsed = moment(raw, ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601], true);
            if (parsed.isValid()) return parsed.format('YYYY-MM-DD HH:mm:ss');
            const excelParsed = security.excelSerialToMoment(raw);
            if (excelParsed && excelParsed.isValid()) return excelParsed.format('YYYY-MM-DD HH:mm:ss');
            if (raw === 'PASSWORD_CHANGE_AUTH_REQUIRED') return '로그인 상태를 다시 확인해 주세요.';
            if (raw === 'CURRENT_PASSWORD_REQUIRED') return '현재 비밀번호를 입력해 주세요.';
            if (raw === 'CURRENT_PASSWORD_INVALID') return '현재 비밀번호가 올바르지 않습니다.';
            if (raw === 'NEW_PASSWORD_REQUIRED') return '새 비밀번호를 입력해 주세요.';
            if (raw === 'PASSWORD_TOO_SHORT') return '비밀번호는 4자 이상으로 입력하세요.';
            return raw;
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
                calendarRejected: !!permissions.calendarRejected,
                calendarWorkReport: !!permissions.calendarWorkReport,
                workReportViewManual: !!permissions.workReportViewManual,
                workReportViewParts: !!permissions.workReportViewParts,
                workReportViewAll: !!permissions.workReportViewAll,
                approveScope: safeApproveScope,
                memberStatusScope: safeMemberStatusScope,
                canAccessMasterSettings: !!permissions.canAccessMasterSettings,
                canManageUsers: !!permissions.canManageUsers,
                canAccessMasterSettingsDesktop: permissions.canAccessMasterSettingsDesktop !== undefined
                    ? !!permissions.canAccessMasterSettingsDesktop
                    : !!permissions.canAccessMasterSettings,
                canManageUsersDesktop: permissions.canManageUsersDesktop !== undefined
                    ? !!permissions.canManageUsersDesktop
                    : !!permissions.canManageUsers,
                canAccessMasterSettingsMobile: permissions.canAccessMasterSettingsMobile !== undefined
                    ? !!permissions.canAccessMasterSettingsMobile
                    : !!permissions.canAccessMasterSettings,
                canManageUsersMobile: permissions.canManageUsersMobile !== undefined
                    ? !!permissions.canManageUsersMobile
                    : !!permissions.canManageUsers,
                canAccessAdminOps: !!permissions.canAccessAdminOps,
                canAccessAdminOpsDesktop: permissions.canAccessAdminOpsDesktop !== undefined
                    ? !!permissions.canAccessAdminOpsDesktop
                    : !!permissions.canAccessAdminOps,
                canAccessAdminOpsMobile: permissions.canAccessAdminOpsMobile !== undefined
                    ? !!permissions.canAccessAdminOpsMobile
                    : !!permissions.canAccessAdminOps,
                canAccessSituationBoard: !!permissions.canAccessSituationBoard,
                canAccessSituationBoardDesktop: permissions.canAccessSituationBoardDesktop !== undefined
                    ? !!permissions.canAccessSituationBoardDesktop
                    : !!permissions.canAccessSituationBoard,
                canAccessSituationBoardMobile: permissions.canAccessSituationBoardMobile !== undefined
                    ? !!permissions.canAccessSituationBoardMobile
                    : !!permissions.canAccessSituationBoard
            };

            if (role === 'master') {
                clean.calendarSelf = true;
                clean.calendarManual = true;
                clean.calendarParts = true;
                clean.calendarAll = true;
                clean.calendarRejected = true;
                clean.calendarWorkReport = true;
                clean.workReportViewManual = true;
                clean.workReportViewParts = true;
                clean.workReportViewAll = true;
                clean.approveScope = 'all';
                clean.memberStatusScope = 'all';
                clean.canAccessMasterSettings = true;
                clean.canManageUsers = true;
                clean.canAccessMasterSettingsDesktop = true;
                clean.canManageUsersDesktop = true;
                clean.canAccessMasterSettingsMobile = true;
                clean.canManageUsersMobile = true;
                clean.canAccessAdminOps = true;
                clean.canAccessAdminOpsDesktop = true;
                clean.canAccessAdminOpsMobile = true;
                clean.canAccessSituationBoard = true;
                clean.canAccessSituationBoardDesktop = true;
                clean.canAccessSituationBoardMobile = true;
                return clean;
            }

            // Use DB permission values for non-master users

            if (!clean.calendarSelf && !clean.calendarManual && !clean.calendarParts && !clean.calendarAll && !clean.calendarRejected && !clean.calendarWorkReport) {
                clean.calendarSelf = true;
            }
            if (role === 'ceo') {
                clean.workReportViewManual = true;
                clean.workReportViewParts = true;
                clean.workReportViewAll = true;
            }
            if (clean.workReportViewAll) {
                clean.workReportViewManual = true;
                clean.workReportViewParts = true;
            }
            if (clean.approveScope === 'all') {
                clean.workReportViewAll = true;
                clean.workReportViewManual = true;
                clean.workReportViewParts = true;
            } else if (clean.approveScope === 'manual') {
                clean.workReportViewManual = true;
            } else if (clean.approveScope === 'parts') {
                clean.workReportViewParts = true;
            }
            clean.canAccessMasterSettings = !!(clean.canAccessMasterSettingsDesktop || clean.canAccessMasterSettingsMobile);
            clean.canManageUsers = !!(clean.canManageUsersDesktop || clean.canManageUsersMobile);
            clean.canAccessAdminOps = !!(clean.canAccessAdminOpsDesktop || clean.canAccessAdminOpsMobile);
            clean.canAccessSituationBoard = !!(clean.canAccessSituationBoardDesktop || clean.canAccessSituationBoardMobile);
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
            featureOvertime: security.normalizeBool(user.featureOvertime, false),
            featureHolidayWork: security.normalizeBool(user.featureHolidayWork, false),
            permissions: security.sanitizePermissions(user.permissions || {}, String(user.role ?? ''), security.cleanText(user.dept))
        }),
        sanitizeRequest: (req = {}) => {
            const startDate = security.normalizeDate(req.startDate, moment().format('YYYY-MM-DD'));
            const endDate = security.normalizeDate(req.endDate, startDate);
            return {
                ...req,
                id: security.cleanInlineValue(req.id),
                userId: security.cleanInlineValue(req.userId),
                employeeNo: security.cleanInlineValue(req.employeeNo),
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
                rejectReason: security.cleanText(req.rejectReason || ''),
                detailReason: security.cleanText(req.detailReason || ''),
                reportCategory: security.cleanInlineValue(req.reportCategory || ''),
                workDetail: security.cleanMultiline(req.workDetail || ''),
                requestDept: security.cleanText(req.requestDept || ''),
                note: security.cleanMultiline(req.note || ''),
                requestedStartAt: security.cleanText(req.requestedStartAt || ''),
                requestedEndAt: security.cleanText(req.requestedEndAt || ''),
                reportedHours: security.normalizeNumber(req.reportedHours, 0),
                settlementPeriodKey: security.cleanInlineValue(req.settlementPeriodKey || ''),
                settlementSubmittedAt: security.normalizeTimestamp(req.settlementSubmittedAt || ''),
                settlementSubmittedBy: security.cleanInlineValue(req.settlementSubmittedBy || ''),
                settlementSubmittedByName: security.cleanText(req.settlementSubmittedByName || '')
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
        sanitizeAccessLog: (item = {}) => ({
            id: security.cleanInlineValue(item.id),
            timestamp: security.formatAccessLogTimestamp(item.timestamp),
            sortTimestamp: security.normalizeLogSortTimestamp(item.sortTimestamp, security.normalizeLogSortTimestamp(item.timestamp, 0)),
            userId: security.cleanInlineValue(item.userId),
            userName: security.cleanText(item.userName),
            type: security.cleanText(item.type),
            ip: security.cleanInlineValue(item.ip),
            detail: security.cleanText(item.detail)
        }),
        sanitizeSecurityLog: (item = {}) => ({
            id: security.cleanInlineValue(item.id),
            timestamp: security.formatAccessLogTimestamp(item.timestamp),
            sortTimestamp: security.normalizeLogSortTimestamp(item.sortTimestamp, security.normalizeLogSortTimestamp(item.timestamp, 0)),
            userId: security.cleanInlineValue(item.userId),
            userName: security.cleanText(item.userName),
            eventType: security.cleanText(item.eventType),
            severity: security.cleanText(item.severity).toLowerCase(),
            ip: security.cleanText(item.ip),
            userAgentHash: security.cleanInlineValue(item.userAgentHash),
            detail: security.cleanText(item.detail),
            context: (item.context && typeof item.context === 'object' && !Array.isArray(item.context)) ? item.context : {}
        }),
        sanitizeManualHoliday: (item = {}) => ({
            id: security.cleanInlineValue(item.id || item.date),
            date: security.normalizeDate(item.date, ''),
            name: security.cleanText(item.name),
            source: security.cleanText(item.source || 'manual').toLowerCase(),
            enabled: security.normalizeBool(item.enabled, true),
            provider: security.cleanInlineValue(item.provider || ''),
            category: security.cleanInlineValue(item.category || '')
        }),
        sanitizeSpecialLeaveType: (item = {}) => ({
            typeKey: security.normalizeSpecialLeaveTypeKey(item.typeKey),
            label: security.cleanText(item.label || ''),
            enabled: security.normalizeBool(item.enabled, false),
            sortOrder: security.normalizeNumber(item.sortOrder, 0),
            color: security.normalizeSpecialLeaveColor(item.color),
            grantHours: Math.max(0, security.normalizeNumber(item.grantHours, 0)),
            requestMode: security.normalizeSpecialLeaveRequestMode(item.requestMode),
            allowHolidayRequest: security.normalizeBool(item.allowHolidayRequest, false),
            dayCountMode: security.normalizeSpecialLeaveDayCountMode(item.dayCountMode)
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
    const sessionMeta = {
        token: ''
    };

    const db = {
        init: async () => { await db.load(); },
        setSessionToken: (value = '') => {
            sessionMeta.token = security.cleanInlineValue(value || '');
            return sessionMeta.token;
        },
        getSessionToken: () => security.cleanInlineValue(sessionMeta.token || ''),
        clearSessionToken: () => {
            sessionMeta.token = '';
        },
        withSession: (payload = {}) => {
            const cleanPayload = payload && typeof payload === 'object' ? { ...payload } : {};
            const token = db.getSessionToken();
            if (token && !cleanPayload.sessionToken) cleanPayload.sessionToken = token;
            return cleanPayload;
        },
        postJson: async (payload = {}, options = {}) => {
            const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : SCRIPT_REQUEST_TIMEOUT_MS;
            return db.fetchJsonWithTimeout(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(db.withSession(payload))
            }, timeoutMs);
        },
        getApiErrorMessage: (rawMessage, fallback = '') => {
            const raw = String(rawMessage || fallback || '').trim();
            if (!raw) return fallback || '저장 실패';
            if (raw === 'LOGIN_INVALID') return '아이디 또는 비밀번호를 확인해 주세요.';
            if (raw === 'LOGIN_BLOCKED') return '비밀번호 5회 오류로 5분간 로그인할 수 없습니다.';
            if (['SESSION_REQUIRED', 'SESSION_INVALID', 'SESSION_REVOKED', 'SESSION_EXPIRED', 'SESSION_USER_NOT_FOUND'].includes(raw)) {
                return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
            }
            if (raw === 'FORBIDDEN_REQUEST_WRITE') return '이 연차 신청을 변경할 권한이 없습니다.';
            if (raw === 'REQUEST_USER_NOT_FOUND') return '연차 신청 대상 사용자를 찾을 수 없습니다.';
            if (raw === 'REQUEST_DELETE_FORBIDDEN') return '이 연차 신청을 삭제할 권한이 없습니다.';
            if (raw === 'REQUEST_NOT_FOUND') return '연차 신청을 찾을 수 없습니다.';
            if (raw === 'BOARD_POST_FORBIDDEN') return '이 게시글을 수정할 권한이 없습니다.';
            if (raw === 'BOARD_POST_DELETE_FORBIDDEN') return '이 게시글을 삭제할 권한이 없습니다.';
            if (raw === 'BOARD_POST_NOT_FOUND') return '게시글을 찾을 수 없습니다.';
            return raw;
        },
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
                const cleanPayload = db.withSession({
                    action: 'log_access',
                    userId: security.cleanInlineValue(payload.userId || ''),
                    userName: security.cleanText(payload.userName || ''),
                    logType: security.cleanText(payload.logType || 'Action'),
                    detail: security.cleanText(payload.detail || ''),
                    clientIp: security.cleanInlineValue(payload.clientIp || '')
                });
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
                const cleanPayload = db.withSession({
                    action: 'log_access',
                    userId: security.cleanInlineValue(payload.userId || ''),
                    userName: security.cleanText(payload.userName || ''),
                    logType: security.cleanText(payload.logType || 'Action'),
                    detail: security.cleanText(payload.detail || ''),
                    clientIp: security.cleanInlineValue(payload.clientIp || clientMeta.ip || '')
                });
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
                return '서버 응답이 없습니다. 잠시 후 다시 시도해주세요.';
            }
            if (raw === 'SCRIPT_FORBIDDEN') {
                return '서버 접근 권한이 없습니다. 배포 상태를 확인해주세요.';
            }
            if (raw === 'SCRIPT_DOC_NOT_FOUND') {
                return '서버 데이터 연결을 찾지 못했습니다. 관리자에게 문의해주세요.';
            }
            if (raw === 'SCRIPT_INVALID_JSON' || raw === 'SCRIPT_INVALID_RESPONSE') {
                return '서버 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해주세요.';
            }
            if (raw.startsWith('SCRIPT_HTTP_')) {
                return `서버 응답 오류(${raw.replace('SCRIPT_HTTP_', '')})가 발생했습니다.`;
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
                    const json = await db.postJson(payload, { timeoutMs });
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
        logoutSession: async (reason = 'manual') => {
            return db.postJson({
                action: 'logout',
                reason: security.cleanInlineValue(reason || 'manual')
            }, { timeoutMs: 8000 });
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
                appData.meta.boardPostsLoaded = true;
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
                const safeScope = ['all', 'boot', 'rest', 'board', 'situation'].includes(String(scope)) ? String(scope) : 'all';
                const json = await db.postJson({
                    action: 'load_data',
                    scope: safeScope
                }, { timeoutMs: SCRIPT_REQUEST_TIMEOUT_MS });
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
        loadDeferred: async () => db.loadWithScope('rest', { users: false, requests: true, boardPosts: false, holidays: false, specialLeaveTypes: false, userSpecialLeaves: false, mailRoutes: false }),
        loadBoardPosts: async () => db.loadWithScope('board', { users: false, requests: false, boardPosts: true, holidays: false, specialLeaveTypes: false, userSpecialLeaves: false, mailRoutes: false }),
        loadSituationBoardData: async () => {
            const result = await db.loadWithScope('situation', { users: false, requests: true, boardPosts: false, holidays: false, specialLeaveTypes: false, userSpecialLeaves: false, mailRoutes: false });
            if (result && result.ok) appData.meta.situationBoardLoaded = true;
            return result;
        },
        loadSessionBoot: async () => {
            const json = await db.postJson({ action: 'session_boot' }, { timeoutMs: SCRIPT_REQUEST_TIMEOUT_MS });
            if (json && json.result === 'success') {
                const meta = json.meta && typeof json.meta === 'object' ? json.meta : {};
                appData.meta.scopedLoadSupported = !!meta.scopedLoad;
                appData.meta.lastLoadScope = String(meta.scope || 'boot');
                db.applyLoadData(json.data || {}, { users: true, requests: false, boardPosts: false, holidays: true, specialLeaveTypes: true, userSpecialLeaves: true, mailRoutes: true });
                appData.meta.boardPostsLoaded = false;
                appData.meta.situationBoardLoaded = false;
            }
            return json;
        },
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
                        const duplicateType = security.normalizeType(String(json.duplicateType || ''));
                        const duplicateTimeRange = security.cleanText(String(json.duplicateTimeRange || ''));
                        throw new Error(`REQUEST_DUPLICATE_CONFLICT:${duplicateStart}:${duplicateEnd}:${duplicateType}:${duplicateTimeRange}`);
                    }
                    if (String(json.message || '') === 'REQUEST_STATE_CONFLICT') {
                        const currentStatus = security.normalizeStatus(String(json.currentStatus || 'pending'));
                        throw new Error(`REQUEST_STATE_CONFLICT:${currentStatus}`);
                    }
                    if (String(json.message || '') === 'WORK_LIMIT_EXCEEDED') {
                        throw new Error(`WORK_LIMIT_EXCEEDED:${security.normalizeDate(String(json.weekStart || ''), '')}:${security.normalizeDate(String(json.weekEnd || ''), '')}:${Number(json.basicHours || 0)}:${Number(json.existingReportHours || 0)}:${Number(json.currentRequestHours || 0)}:${Number(json.totalHours || 0)}`);
                    }
                    throw new Error(db.getApiErrorMessage(json.message || 'REQUEST_SAVE_FAILED'));
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
                } else if (msg.startsWith('WORK_LIMIT_EXCEEDED:')) {
                    const parts = msg.split(':');
                    alert(`\uC8FC\uAC04 \uC608\uC815 \uADFC\uB85C\uC2DC\uAC04\uC774 52\uC2DC\uAC04\uC744 \uCD08\uACFC\uD558\uC5EC \uC800\uC7A5\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.\n[\uAE30\uC900 \uC8FC\uAC04] ${parts[1]} ~ ${parts[2]}\n\uAE30\uBCF8\uADFC\uB85C\uC2DC\uAC04 ${parts[3]}\uC2DC\uAC04 + \uAE30\uC874 \uC794\uC5C5/\uD2B9\uADFC ${parts[4]}\uC2DC\uAC04 + \uC774\uBC88 \uC2E0\uCCAD ${parts[5]}\uC2DC\uAC04 = \uCD1D ${parts[6]}\uC2DC\uAC04`);
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
                const json = await db.postJson({ action: 'delete_request', id: safeId, actor: db.getActor() });
                if(json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '\uC0AD\uC81C \uC2E4\uD328'));
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
                const json = await db.postJson({ action: 'save_users', users: safeUsers, actor: db.getActor() });
                if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '\uC720\uC800 \uC800\uC7A5 \uC2E4\uD328'));
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
                const json = await db.postJson({ action: 'upsert_user', data: safeUser, actor: db.getActor() });
                if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '\uC9C1\uC6D0 \uC800\uC7A5 \uC2E4\uD328'));

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
                const json = await db.postJson({ action: 'save_special_leave_types', types: safeTypes, actor: db.getActor() });
                if (String(json.message || '') === 'SPECIAL_LEAVE_TYPES_EMPTY_FORBIDDEN') {
                    throw new Error('특별휴가 종류를 비운 상태로 저장할 수 없습니다. 기본 특별휴가를 먼저 확인해 주세요.');
                }
                if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '특별휴가 종류 저장 실패'));
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
                const json = await db.postJson({ action: 'save_user_special_leaves', userId: safeUserId, leaves: safeLeaves, actor: db.getActor() });
                if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '특별휴가 저장 실패'));
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
                const json = await db.postJson({ action: 'save_mail_routes', routes: safeRoutes, actor: db.getActor() });
                if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '메일 설정 저장 실패'));
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
        submitWorkReportSettlement: async (year, month, requestIds = []) => {
            const safeIds = Array.isArray(requestIds)
                ? requestIds.map((id) => security.cleanInlineValue(id)).filter(Boolean)
                : [];
            const json = await db.postJson({
                action: 'submit_work_report_settlement',
                year: Number(year),
                month: Number(month),
                requestIds: safeIds,
                actor: db.getActor()
            });
            if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '정산 제출 처리 실패'));
            return json;
        },
        approveWorkReportSettlement: async (userId, year, month) => {
            const json = await db.postJson({
                action: 'approve_work_report_settlement',
                userId: security.cleanInlineValue(userId),
                year: Number(year),
                month: Number(month),
                actor: db.getActor()
            });
            if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '잔업/특근 승인 실패'));
            return json;
        },
        rejectWorkReportSettlement: async (userId, year, month, rejectReason = '') => {
            const json = await db.postJson({
                action: 'reject_work_report_settlement',
                userId: security.cleanInlineValue(userId),
                year: Number(year),
                month: Number(month),
                rejectReason: security.cleanText(rejectReason),
                actor: db.getActor()
            });
            if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '잔업/특근 반려 실패'));
            return json;
        },
        loadAdminOpsData: async (options = {}) => {
            const includeAccessLogs = !!options.includeAccessLogs;
            const includeSecurityLogs = !!options.includeSecurityLogs;
            const json = await db.postJson(
                { action: 'load_admin_ops_data', includeAccessLogs, includeSecurityLogs },
                { timeoutMs: SCRIPT_REQUEST_TIMEOUT_MS }
            );
            if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '운영실 데이터 조회 실패'));
            if (includeAccessLogs && Array.isArray(json.accessLogs)) {
                appData.accessLogs = json.accessLogs.map(security.sanitizeAccessLog).sort((a, b) => Number(b.sortTimestamp || 0) - Number(a.sortTimestamp || 0));
            }
            if (includeSecurityLogs && Array.isArray(json.securityLogs)) {
                appData.securityLogs = json.securityLogs.map(security.sanitizeSecurityLog).sort((a, b) => Number(b.sortTimestamp || 0) - Number(a.sortTimestamp || 0));
            }
            appData.manualHolidays = Array.isArray(json.manualHolidays) ? json.manualHolidays.map(security.sanitizeManualHoliday) : [];
            appData.holidaySummary = {
                auto: security.normalizeNumber(json.holidaySummary && json.holidaySummary.auto, 0),
                companyFixed: security.normalizeNumber(json.holidaySummary && json.holidaySummary.companyFixed, 0),
                manual: security.normalizeNumber(json.holidaySummary && json.holidaySummary.manual, 0)
            };
            return {
                accessLogs: includeAccessLogs ? appData.accessLogs : null,
                securityLogs: includeSecurityLogs ? appData.securityLogs : null,
                accessLogsLoaded: !!json.accessLogsLoaded,
                securityLogsLoaded: !!json.securityLogsLoaded,
                manualHolidays: appData.manualHolidays,
                holidaySummary: appData.holidaySummary
            };
        },
        upsertManualHoliday: async (holidayData = {}, options = {}) => {
            const keepOverlayOnSuccess = !!options.keepOverlayOnSuccess;
            let saveSucceeded = false;
            document.getElementById('loading-text').innerText = '수동 휴일 저장 중입니다...';
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeHoliday = security.sanitizeManualHoliday(holidayData);
                const json = await db.postJson({ action: 'upsert_manual_holiday', data: safeHoliday, actor: db.getActor() });
                if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '휴일 저장 실패'));
                const saved = security.sanitizeManualHoliday(json.holiday || safeHoliday);
                const idx = appData.manualHolidays.findIndex((item) => String(item.id) === String(saved.id));
                if (idx > -1) appData.manualHolidays[idx] = saved;
                else appData.manualHolidays.push(saved);
                appData.manualHolidays.sort((a, b) => String(a.date).localeCompare(String(b.date), 'ko'));
                appData.holidaySummary.manual = appData.manualHolidays.length;
                saveSucceeded = true;
                return saved;
            } finally {
                if (!keepOverlayOnSuccess || !saveSucceeded) {
                    document.getElementById('loading-overlay').style.display = 'none';
                }
            }
        },
        deleteManualHoliday: async (id) => {
            document.getElementById('loading-text').innerText = '수동 휴일 삭제 중입니다...';
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const safeId = security.cleanInlineValue(id);
                const json = await db.postJson({ action: 'delete_manual_holiday', id: safeId, actor: db.getActor() });
                if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '휴일 삭제 실패'));
                appData.manualHolidays = appData.manualHolidays.filter((item) => String(item.id) !== String(safeId));
                appData.holidaySummary.manual = appData.manualHolidays.length;
                return true;
            } finally {
                document.getElementById('loading-overlay').style.display = 'none';
            }
        },
        syncPublicHolidays: async (options = {}) => {
            const currentYear = new Date().getFullYear();
            const startYear = Number(options.startYear || currentYear);
            const endYear = Number(options.endYear || 2030);
            document.getElementById('loading-text').innerText = '공휴일 동기화 중입니다...';
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const json = await db.postJson(
                    { action: 'sync_public_holidays', startYear, endYear, actor: db.getActor() },
                    { timeoutMs: SCRIPT_REQUEST_TIMEOUT_MS }
                );
                if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '공휴일 동기화 실패'));
                return json;
            } finally {
                document.getElementById('loading-overlay').style.display = 'none';
            }
        },
        downloadAccessLogsCsv: async () => {
            document.getElementById('loading-text').innerText = '접속 로그 CSV를 준비 중입니다...';
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const json = await db.postJson(
                    { action: 'download_access_logs_csv', actor: db.getActor() },
                    { timeoutMs: 60000 }
                );
                if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, 'CSV 다운로드 실패'));
                return json;
            } finally {
                document.getElementById('loading-overlay').style.display = 'none';
            }
        },
        downloadSecurityLogsCsv: async () => {
            document.getElementById('loading-text').innerText = '보안 로그 CSV를 준비 중입니다...';
            document.getElementById('loading-overlay').style.display = 'flex';
            try {
                const json = await db.postJson(
                    { action: 'download_security_logs_csv', actor: db.getActor() },
                    { timeoutMs: 60000 }
                );
                if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '보안 로그 CSV 다운로드 실패'));
                return json;
            } finally {
                document.getElementById('loading-overlay').style.display = 'none';
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

                const json = await db.postJson({ action: 'upsert_board_post', data: cleanPost, actor: db.getActor() });
                if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '\uAC8C\uC2DC\uAE00 \uC800\uC7A5 \uC2E4\uD328'));

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

                const json = await db.postJson({ action: 'delete_board_post', id: safeId, actor: db.getActor() });
                if (json.result !== 'success') throw new Error(db.getApiErrorMessage(json.message, '\uAC8C\uC2DC\uAE00 \uC0AD\uC81C \uC2E4\uD328'));
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






