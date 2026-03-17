// NCORE - Google Apps Script (permissions linked version)
// Replacement target: full script including doGet/doPost

const USERS_HEADERS = [
  "id", "password", "name", "role", "rank",
  "dept", "totalHours", "usedHours", "email",
  "calendarSelf", "calendarManual", "calendarParts", "calendarAll",
  "approveScope", "canManageUsers",
  "phone", "employeeNo", "workQ1", "workQ2", "workQ3", "workQ4",
  "featureMemberCard", "featureBoard", "featureHomepage", "memberStatusScope", "canAccessMasterSettings"
];
const ACCESS_LOG_HEADERS = ["timestamp", "userId", "userName", "type", "ip", "detail"];
const BOARD_HEADERS = [
  "id", "title", "content", "category",
  "authorId", "authorName", "authorDept",
  "isNotice", "status", "viewCount",
  "createdAt", "updatedAt"
];
const REQUEST_HEADERS = [
  "id", "userId", "userName", "dept", "role",
  "type", "startDate", "endDate", "hours", "timeRange",
  "reason", "status", "timestamp", "specialLeaveTypeKey", "specialLeaveTypeLabel", "rejectReason"
];
const SPECIAL_LEAVE_TYPE_HEADERS = ["typeKey", "label", "enabled", "sortOrder", "color", "grantHours", "requestMode"];
const USER_SPECIAL_LEAVE_HEADERS = ["userId", "typeKey", "totalHours", "usedHours", "note", "updatedAt"];
const MAIL_ROUTE_HEADERS = ["dept", "roleGroup", "toUserId", "ccUserIds"];

function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === "load") {
      const scopeRaw = String((e.parameter && e.parameter.scope) || "all").toLowerCase();
      const scope = (scopeRaw === "boot" || scopeRaw === "rest") ? scopeRaw : "all";
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const userSheet = getOrCreateSheet(ss, "Users");
      const reqSheet = getOrCreateSheet(ss, "Requests");
      const holSheet = getOrCreateSheet(ss, "Holidays");
      const boardSheet = getOrCreateSheet(ss, "BoardPosts");
      const specialTypeSheet = getOrCreateSheet(ss, "SpecialLeaveTypes");
      const userSpecialLeaveSheet = getOrCreateSheet(ss, "UserSpecialLeaves");
      const mailRouteSheet = getOrCreateSheet(ss, "MailRoutes");

      ensureUsersHeaders(userSheet);
      ensureRequestHeaders(reqSheet);
      ensureBoardHeaders(boardSheet);
      ensureSpecialLeaveTypeHeaders(specialTypeSheet);
      ensureSeedSpecialLeaveTypes(specialTypeSheet);
      ensureUserSpecialLeaveHeaders(userSpecialLeaveSheet);
      ensureMailRouteHeaders(mailRouteSheet);

      let users = [];
      if (scope !== "rest" && userSheet.getLastRow() > 1) {
        const data = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 26).getValues();
        users = data.map((r) => {
          const perms = normalizePermissions({
            calendarSelf: r[9],
            calendarManual: r[10],
            calendarParts: r[11],
            calendarAll: r[12],
            approveScope: r[13],
            canManageUsers: r[14],
            memberStatusScope: r[24],
            canAccessMasterSettings: r[25]
          }, normalizeRole(r[3]), r[5]);

          return {
            id: String(r[0]),
            password: "",
            name: r[2],
            role: normalizeRole(r[3]),
            rank: r[4],
            dept: r[5],
            totalHours: Number(r[6]),
            usedHours: Number(r[7]),
            email: r[8] || "",
            phone: cleanPhone(r[15]),
            employeeNo: String(r[16] || ""),
            workQ1: normalizeWorkShift(r[17]),
            workQ2: normalizeWorkShift(r[18]),
            workQ3: normalizeWorkShift(r[19]),
            workQ4: normalizeWorkShift(r[20]),
            featureMemberCard: toBool(r[21], false),
            featureBoard: toBool(r[22], true),
            featureHomepage: toBool(r[23], false),
            permissions: perms
          };
        });
      }

      let requests = [];
      if (scope !== "boot" && reqSheet.getLastRow() > 1) {
        const data = reqSheet.getRange(2, 1, reqSheet.getLastRow() - 1, REQUEST_HEADERS.length).getValues();
        requests = data.map((r) => ({
          id: Number(r[0]),
          userId: String(r[1]),
          userName: r[2],
          dept: r[3],
          role: r[4],
          type: r[5],
          startDate: r[6],
          endDate: r[7],
          hours: Number(r[8]),
          timeRange: r[9],
          reason: r[10],
          status: r[11],
          timestamp: r[12],
          specialLeaveTypeKey: String(r[13] || ""),
          specialLeaveTypeLabel: String(r[14] || ""),
          rejectReason: String(r[15] || "")
        }));
      }

      let holidays = {};
      if (scope !== "rest" && holSheet.getLastRow() > 1) {
        const data = holSheet.getRange(2, 1, holSheet.getLastRow() - 1, 2).getValues();
        data.forEach((r) => {
          const d = new Date(r[0]);
          const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
          holidays[dateStr] = r[1];
        });
      }

      let boardPosts = [];
      if (scope !== "boot" && boardSheet.getLastRow() > 1) {
        const data = boardSheet.getRange(2, 1, boardSheet.getLastRow() - 1, BOARD_HEADERS.length).getValues();
        boardPosts = data.map((r) => ({
          id: String(r[0] || ""),
          title: String(r[1] || ""),
          content: String(r[2] || ""),
          category: String(r[3] || "\uC77C\uBC18"),
          authorId: String(r[4] || ""),
          authorName: String(r[5] || ""),
          authorDept: String(r[6] || ""),
          isNotice: toBool(r[7], false),
          status: String(r[8] || "active"),
          viewCount: Number(r[9] || 0),
          createdAt: String(r[10] || ""),
          updatedAt: String(r[11] || "")
        })).filter((post) => post.status !== "deleted");
      }

      let specialLeaveTypes = [];
      let userSpecialLeaves = [];
      let mailRoutes = [];
      if (scope !== "rest") {
        specialLeaveTypes = readSpecialLeaveTypes(specialTypeSheet);
        userSpecialLeaves = readUserSpecialLeaves(userSpecialLeaveSheet);
        mailRoutes = readMailRoutes(mailRouteSheet);
      }

      return ContentService.createTextOutput(JSON.stringify({
        result: "success",
        meta: { scopedLoad: true, scope: scope },
        data: {
          users: users,
          requests: requests,
          boardPosts: boardPosts,
          holidays: holidays,
          specialLeaveTypes: specialLeaveTypes,
          userSpecialLeaves: userSpecialLeaves,
          mailRoutes: mailRoutes
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: "\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 action"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const json = JSON.parse(e.postData.contents);
    const action = json.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "login" || action === "login_boot") {
      const isLoginBoot = action === "login_boot";
      const userSheet = getOrCreateSheet(ss, "Users");
      const specialTypeSheet = getOrCreateSheet(ss, "SpecialLeaveTypes");
      const userSpecialLeaveSheet = getOrCreateSheet(ss, "UserSpecialLeaves");
      const mailRouteSheet = getOrCreateSheet(ss, "MailRoutes");
      ensureUsersHeaders(userSheet);
      ensureSpecialLeaveTypeHeaders(specialTypeSheet);
      ensureSeedSpecialLeaveTypes(specialTypeSheet);
      ensureUserSpecialLeaveHeaders(userSpecialLeaveSheet);
      ensureMailRouteHeaders(mailRouteSheet);

      if (userSheet.getLastRow() <= 1) {
        return ContentService.createTextOutput(JSON.stringify({
          result: "fail",
          message: "?ъ슜???곗씠???놁쓬"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const inputId = String(json.id || "").trim();
      const inputPw = String(json.password || "").trim();
      const userRowNum = findRowById(userSheet, inputId, 1);
      const row = userRowNum > 1 ? userSheet.getRange(userRowNum, 1, 1, 26).getValues()[0] : null;

      if (row && String(row[1] || "").trim() === inputPw) {
        const perms = normalizePermissions({
          calendarSelf: row[9],
          calendarManual: row[10],
          calendarParts: row[11],
          calendarAll: row[12],
          approveScope: row[13],
          canManageUsers: row[14],
          memberStatusScope: row[24],
          canAccessMasterSettings: row[25]
        }, normalizeRole(row[3]), row[5]);

        const userObj = {
          id: String(row[0]),
          password: "",
          name: row[2],
          role: normalizeRole(row[3]),
          rank: row[4],
          dept: row[5],
          totalHours: Number(row[6]),
          usedHours: Number(row[7]),
          email: row[8] || "",
          phone: cleanPhone(row[15]),
          employeeNo: String(row[16] || ""),
          workQ1: normalizeWorkShift(row[17]),
          workQ2: normalizeWorkShift(row[18]),
          workQ3: normalizeWorkShift(row[19]),
          workQ4: normalizeWorkShift(row[20]),
          featureMemberCard: toBool(row[21], false),
          featureBoard: toBool(row[22], true),
          featureHomepage: toBool(row[23], false),
          permissions: perms
        };

        recordLog(ss, userObj.id, userObj.name, "Login", resolveClientIp(json, e), "login_success");

        if (isLoginBoot) {
          const holSheet = getOrCreateSheet(ss, "Holidays");
          const reqSheet = getOrCreateSheet(ss, "Requests");
          ensureRequestHeaders(reqSheet);

          let users = [];
          if (userSheet.getLastRow() > 1) {
            const data = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 26).getValues();
            users = data.map((r) => {
              const p = normalizePermissions({
                calendarSelf: r[9],
                calendarManual: r[10],
                calendarParts: r[11],
                calendarAll: r[12],
                approveScope: r[13],
                canManageUsers: r[14],
                memberStatusScope: r[24],
                canAccessMasterSettings: r[25]
              }, normalizeRole(r[3]), r[5]);

              return {
                id: String(r[0]),
                password: "",
                name: r[2],
                role: normalizeRole(r[3]),
                rank: r[4],
                dept: r[5],
                totalHours: Number(r[6]),
                usedHours: Number(r[7]),
                email: r[8] || "",
                phone: cleanPhone(r[15]),
                employeeNo: String(r[16] || ""),
                workQ1: normalizeWorkShift(r[17]),
                workQ2: normalizeWorkShift(r[18]),
                workQ3: normalizeWorkShift(r[19]),
                workQ4: normalizeWorkShift(r[20]),
                featureMemberCard: toBool(r[21], false),
                featureBoard: toBool(r[22], true),
                featureHomepage: toBool(r[23], false),
                permissions: p
              };
            });
          }

          let holidays = {};
          if (holSheet.getLastRow() > 1) {
            const data = holSheet.getRange(2, 1, holSheet.getLastRow() - 1, 2).getValues();
            data.forEach((r) => {
              const d = new Date(r[0]);
              const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
              holidays[dateStr] = r[1];
            });
          }

          const specialLeaveTypes = readSpecialLeaveTypes(specialTypeSheet);
          const userSpecialLeaves = readUserSpecialLeaves(userSpecialLeaveSheet);
          const mailRoutes = readMailRoutes(mailRouteSheet);

          return ContentService.createTextOutput(JSON.stringify({
            result: "success",
            user: userObj,
            meta: { scopedLoad: true, scope: "boot", bundled: true },
            data: {
              users: users,
              holidays: holidays,
              specialLeaveTypes: specialLeaveTypes,
              userSpecialLeaves: userSpecialLeaves,
              mailRoutes: mailRoutes
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService.createTextOutput(JSON.stringify({
          result: "success",
          user: userObj
        })).setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService.createTextOutput(JSON.stringify({
        result: "fail",
        message: "아이디/비번 불일치"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "log_access") {
      const userId = String(json.userId || "");
      const userName = String(json.userName || "");
      const logType = cleanLogType(json.logType || "Action");
      const detail = String(json.detail || "");
      recordLog(ss, userId, userName, logType, resolveClientIp(json, e), detail);
      return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
    } catch (e2) {
      return ContentService.createTextOutput(JSON.stringify({
        result: "error",
        message: "\uC11C\uBC84 \uD63C\uC7A1. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    try {
      if (action === "upsert_request") {
        const reqSheet = getOrCreateSheet(ss, "Requests");
        ensureRequestHeaders(reqSheet);
        const r = json.data;
        const expectedStatus = String(json.expectedStatus || "").trim();
        const actor = (json.actor && typeof json.actor === "object") ? json.actor : {};
        const actorId = String(actor.id || r.userId || "");
        const actorName = String(actor.name || r.userName || "");
        const rowData = [
          r.id, r.userId, r.userName, r.dept, r.role, r.type,
          r.startDate, r.endDate, r.hours, r.timeRange || "",
          r.reason, r.status, r.timestamp, String(r.specialLeaveTypeKey || ""), String(r.specialLeaveTypeLabel || ""), String(r.rejectReason || "")
        ];

        const foundIndex = findRowById(reqSheet, r.id, 1);
        if (foundIndex > 0 && expectedStatus) {
          const currentStatus = String(reqSheet.getRange(foundIndex, 12).getValue() || "").trim();
          if (currentStatus !== expectedStatus) {
            return ContentService.createTextOutput(JSON.stringify({
              result: "error",
              message: "REQUEST_STATE_CONFLICT",
              currentStatus: currentStatus
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
        if (foundIndex <= 0) {
          const requestRows = readRequests(reqSheet);
          const candidateStart = normalizeRequestDateKey(r.startDate);
          const candidateEnd = normalizeRequestDateKey(r.endDate || r.startDate);
          const duplicated = requestRows.find((item) => {
            if (String(item.userId || "") !== String(r.userId || "")) return false;
            if (["cancelled", "rejected"].includes(String(item.status || "").trim())) return false;
            const existingStart = normalizeRequestDateKey(item.startDate);
            const existingEnd = normalizeRequestDateKey(item.endDate || item.startDate);
            if (!candidateStart || !candidateEnd || !existingStart || !existingEnd) return false;
            return candidateStart <= existingEnd && candidateEnd >= existingStart;
          });
          if (duplicated) {
            return ContentService.createTextOutput(JSON.stringify({
              result: "error",
              message: "REQUEST_DUPLICATE_CONFLICT",
              duplicateId: String(duplicated.id || ""),
              duplicateStartDate: String(duplicated.startDate || ""),
              duplicateEndDate: String(duplicated.endDate || duplicated.startDate || "")
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }

        if (foundIndex > 0) reqSheet.getRange(foundIndex, 1, 1, REQUEST_HEADERS.length).setValues([rowData]);
        else reqSheet.appendRow(rowData);
        const writeType = foundIndex > 0 ? "RequestUpdate" : "RequestCreate";
        recordLog(
          ss,
          actorId,
          actorName,
          writeType,
          resolveClientIp(json, e),
          String(r.id || "") + "|" + String(r.type || "") + "|" + String(r.status || "")
        );

        return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
      }

      if (action === "delete_request") {
        const reqSheet = getOrCreateSheet(ss, "Requests");
        const targetId = String(json.id);
        const actor = (json.actor && typeof json.actor === "object") ? json.actor : {};
        const actorId = String(actor.id || "");
        const actorName = String(actor.name || "");
        const targetRow = findRowById(reqSheet, targetId, 1);

        if (targetRow > 1) {
          reqSheet.deleteRow(targetRow);
          recordLog(ss, actorId, actorName, "RequestDelete", resolveClientIp(json, e), targetId);
          return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService.createTextOutput(JSON.stringify({
          result: "success",
          message: "Not found"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      if (action === "upsert_user") {
        const userSheet = getOrCreateSheet(ss, "Users");
        ensureUsersHeaders(userSheet);

        const actor = (json.actor && typeof json.actor === "object") ? json.actor : {};
        const actorId = String(actor.id || "").trim();
        const payload = (json.data && typeof json.data === "object") ? json.data : {};
        const targetId = String(payload.id || "").trim();

        if (!actorId || !targetId) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "\uC694\uCCAD \uC815\uBCF4\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const actorRowNum = findRowById(userSheet, actorId, 1);
        const actorRow = actorRowNum > 1 ? userSheet.getRange(actorRowNum, 1, 1, 26).getValues()[0] : null;
        if (!actorRow) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "\uAD8C\uD55C \uD655\uC778 \uC2E4\uD328"
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const actorRole = normalizeRole(actorRow[3]);
        const actorPerms = normalizePermissions({
          calendarSelf: actorRow[9],
          calendarManual: actorRow[10],
          calendarParts: actorRow[11],
          calendarAll: actorRow[12],
          approveScope: actorRow[13],
          canManageUsers: actorRow[14],
          memberStatusScope: actorRow[24],
          canAccessMasterSettings: actorRow[25]
        }, actorRole, String(actorRow[5] || ""));
        const actorCanManage = actorRole === "master" || actorPerms.canManageUsers;
        if (!actorCanManage) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "\uAD6C\uC131\uC6D0 \uAD00\uB9AC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const targetRowNum = findRowById(userSheet, targetId, 1);
        const oldRow = targetRowNum > 1 ? userSheet.getRange(targetRowNum, 1, 1, 26).getValues()[0] : null;
        const oldRole = oldRow ? normalizeRole(oldRow[3]) : "";
        if (actorRole !== "master" && oldRole === "master") {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "\uB9C8\uC2A4\uD130 \uACC4\uC815\uC740 \uC218\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const reqRole = normalizeRole(payload.role || oldRole || "employee");
        if (actorRole !== "master" && reqRole === "master" && oldRole !== "master") {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "\uB9C8\uC2A4\uD130 \uAD8C\uD55C\uC740 \uBCC0\uACBD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        let finalPw = String(payload.password || "").trim();
        if (oldRow) {
          if (actorRole !== "master" || !finalPw) finalPw = String(oldRow[1] || "");
        } else if (!finalPw || finalPw.length < 4) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "\uC2E0\uADDC \uACC4\uC815 \uBE44\uBC00\uBC88\uD638\uB294 4\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const finalRole = oldRow ? (actorRole === "master" ? reqRole : oldRole || reqRole) : reqRole;
        const finalDept = String(payload.dept || (oldRow ? oldRow[5] : "") || "").trim();
        const finalPermissions = actorRole === "master"
          ? normalizePermissions(payload.permissions || {}, finalRole, finalDept)
          : (oldRow ? normalizePermissions({
              calendarSelf: oldRow[9],
              calendarManual: oldRow[10],
              calendarParts: oldRow[11],
              calendarAll: oldRow[12],
              approveScope: oldRow[13],
              canManageUsers: oldRow[14],
              memberStatusScope: oldRow[24],
              canAccessMasterSettings: oldRow[25]
            }, finalRole, finalDept) : normalizePermissions({
              calendarSelf: true,
              calendarManual: false,
              calendarParts: false,
              calendarAll: false,
              approveScope: "none",
              memberStatusScope: "none",
              canAccessMasterSettings: false,
              canManageUsers: false
            }, finalRole, finalDept));

        const totalHours = Number(payload.totalHours);
        const finalTotalHours = Number.isFinite(totalHours)
          ? totalHours
          : (oldRow ? Number(oldRow[6] || 0) : 0);
        const finalUsedHours = oldRow ? Number(oldRow[7] || 0) : 0;
        const finalFeatureMemberCard = actorRole === "master"
          ? toBool(payload.featureMemberCard, false)
          : (oldRow ? toBool(oldRow[21], false) : false);
        const finalFeatureBoard = actorRole === "master"
          ? toBool(payload.featureBoard, true)
          : (oldRow ? toBool(oldRow[22], true) : true);
        const finalFeatureHomepage = actorRole === "master"
          ? toBool(payload.featureHomepage, false)
          : (oldRow ? toBool(oldRow[23], false) : false);
        const rowData = [
          targetId,
          finalPw,
          String(payload.name || (oldRow ? oldRow[2] : "") || ""),
          finalRole,
          String(payload.rank || (oldRow ? oldRow[4] : "") || ""),
          finalDept,
          finalTotalHours,
          finalUsedHours,
          String(payload.email || (oldRow ? oldRow[8] : "") || ""),
          finalPermissions.calendarSelf,
          finalPermissions.calendarManual,
          finalPermissions.calendarParts,
          finalPermissions.calendarAll,
          finalPermissions.approveScope,
          finalPermissions.canManageUsers,
          cleanPhone(payload.phone || (oldRow ? oldRow[15] : "")),
          String(payload.employeeNo || (oldRow ? oldRow[16] : "") || ""),
          normalizeWorkShift(payload.workQ1 || (oldRow ? oldRow[17] : "")),
          normalizeWorkShift(payload.workQ2 || (oldRow ? oldRow[18] : "")),
          normalizeWorkShift(payload.workQ3 || (oldRow ? oldRow[19] : "")),
          normalizeWorkShift(payload.workQ4 || (oldRow ? oldRow[20] : "")),
          finalFeatureMemberCard,
          finalFeatureBoard,
          finalFeatureHomepage,
          finalPermissions.memberStatusScope,
          finalPermissions.canAccessMasterSettings
        ];

        if (targetRowNum > 1) {
          userSheet.getRange(targetRowNum, 1, 1, 26).setValues([rowData]);
        } else {
          userSheet.appendRow(rowData);
        }

        recordLog(
          ss,
          actorId,
          String(actor.name || ""),
          targetRowNum > 1 ? "UserUpdate" : "UserCreate",
          resolveClientIp(json, e),
          targetId
        );

        return ContentService.createTextOutput(JSON.stringify({
          result: "success",
          user: {
            id: rowData[0],
            password: "",
            name: rowData[2],
            role: normalizeRole(rowData[3]),
            rank: rowData[4],
            dept: rowData[5],
            totalHours: Number(rowData[6] || 0),
            usedHours: Number(rowData[7] || 0),
            email: rowData[8] || "",
            phone: rowData[15] || "",
            employeeNo: rowData[16] || "",
            workQ1: rowData[17] || "",
            workQ2: rowData[18] || "",
            workQ3: rowData[19] || "",
            workQ4: rowData[20] || "",
            featureMemberCard: toBool(rowData[21], false),
            featureBoard: toBool(rowData[22], true),
            featureHomepage: toBool(rowData[23], false),
            permissions: normalizePermissions({
              calendarSelf: rowData[9],
              calendarManual: rowData[10],
              calendarParts: rowData[11],
              calendarAll: rowData[12],
              approveScope: rowData[13],
              canManageUsers: rowData[14],
              memberStatusScope: rowData[24],
              canAccessMasterSettings: rowData[25]
            }, normalizeRole(rowData[3]), rowData[5])
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }

      if (action === "save_special_leave_types") {
        const userSheet = getOrCreateSheet(ss, "Users");
        const typeSheet = getOrCreateSheet(ss, "SpecialLeaveTypes");
        ensureUsersHeaders(userSheet);
        ensureSpecialLeaveTypeHeaders(typeSheet);
        ensureSeedSpecialLeaveTypes(typeSheet);

        const actor = (json.actor && typeof json.actor === "object") ? json.actor : {};
        const actorId = String(actor.id || "").trim();
        const actorName = String(actor.name || "").trim();
        const actorRowNum = findRowById(userSheet, actorId, 1);
        const actorRow = actorRowNum > 1 ? userSheet.getRange(actorRowNum, 1, 1, 26).getValues()[0] : null;
        if (!actorRow || normalizeRole(actorRow[3]) !== "master") {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "설정 저장은 마스터만 가능합니다."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const inputTypes = Array.isArray(json.types) ? json.types : [];
        const sanitizedTypes = buildSpecialLeaveTypes(inputTypes);
        writeSpecialLeaveTypes(typeSheet, sanitizedTypes);
        recordLog(ss, actorId, actorName, "SpecialLeaveTypeSave", resolveClientIp(json, e), String(sanitizedTypes.length));
        return ContentService.createTextOutput(JSON.stringify({
          result: "success",
          types: sanitizedTypes
        })).setMimeType(ContentService.MimeType.JSON);
      }

      if (action === "save_user_special_leaves") {
        const userSheet = getOrCreateSheet(ss, "Users");
        const typeSheet = getOrCreateSheet(ss, "SpecialLeaveTypes");
        const userSpecialLeaveSheet = getOrCreateSheet(ss, "UserSpecialLeaves");
        ensureUsersHeaders(userSheet);
        ensureSpecialLeaveTypeHeaders(typeSheet);
        ensureSeedSpecialLeaveTypes(typeSheet);
        ensureUserSpecialLeaveHeaders(userSpecialLeaveSheet);

        const actor = (json.actor && typeof json.actor === "object") ? json.actor : {};
        const actorId = String(actor.id || "").trim();
        const actorName = String(actor.name || "").trim();
        const targetUserId = String(json.userId || "").trim();
        const leavesInput = Array.isArray(json.leaves) ? json.leaves : [];

        if (!actorId || !targetUserId) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "요청 정보가 올바르지 않습니다."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const actorRowNum = findRowById(userSheet, actorId, 1);
        const actorRow = actorRowNum > 1 ? userSheet.getRange(actorRowNum, 1, 1, 26).getValues()[0] : null;
        if (!actorRow) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "권한 확인 실패"
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const actorRole = normalizeRole(actorRow[3]);
        const actorPerms = normalizePermissions({
          calendarSelf: actorRow[9],
          calendarManual: actorRow[10],
          calendarParts: actorRow[11],
          calendarAll: actorRow[12],
          approveScope: actorRow[13],
          canManageUsers: actorRow[14],
          memberStatusScope: actorRow[24],
          canAccessMasterSettings: actorRow[25]
        }, actorRole, String(actorRow[5] || ""));
        const actorCanManage = actorRole === "master" || actorPerms.canManageUsers;
        if (!actorCanManage) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "구성원 관리 권한이 없습니다."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const targetRowNum = findRowById(userSheet, targetUserId, 1);
        const targetRow = targetRowNum > 1 ? userSheet.getRange(targetRowNum, 1, 1, 26).getValues()[0] : null;
        if (!targetRow) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "사용자를 찾을 수 없습니다."
          })).setMimeType(ContentService.MimeType.JSON);
        }
        if (actorRole !== "master" && normalizeRole(targetRow[3]) === "master") {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "마스터 계정은 수정할 수 없습니다."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const typeMap = {};
        readSpecialLeaveTypes(typeSheet).forEach((type) => {
          typeMap[type.typeKey] = type;
        });
        const cleanLeaves = leavesInput
          .map((item) => sanitizeUserSpecialLeaveObject(item, targetUserId))
          .filter((item) => item.typeKey && typeMap[item.typeKey]);

        upsertUserSpecialLeaves(userSpecialLeaveSheet, targetUserId, cleanLeaves);
        recordLog(ss, actorId, actorName, "UserSpecialLeaveSave", resolveClientIp(json, e), targetUserId);
        return ContentService.createTextOutput(JSON.stringify({
          result: "success",
          leaves: readUserSpecialLeaves(userSpecialLeaveSheet).filter((item) => String(item.userId) === targetUserId)
        })).setMimeType(ContentService.MimeType.JSON);
      }

      if (action === "save_mail_routes") {
        const userSheet = getOrCreateSheet(ss, "Users");
        const mailRouteSheet = getOrCreateSheet(ss, "MailRoutes");
        ensureUsersHeaders(userSheet);
        ensureMailRouteHeaders(mailRouteSheet);

        const actor = (json.actor && typeof json.actor === "object") ? json.actor : {};
        const actorId = String(actor.id || "").trim();
        const actorName = String(actor.name || "").trim();
        const actorRowNum = findRowById(userSheet, actorId, 1);
        const actorRow = actorRowNum > 1 ? userSheet.getRange(actorRowNum, 1, 1, 26).getValues()[0] : null;
        if (!actorRow || normalizeRole(actorRow[3]) !== "master") {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "메일 설정 저장은 마스터만 가능합니다."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const inputRoutes = Array.isArray(json.routes) ? json.routes : [];
        const cleanRoutes = buildMailRoutes(inputRoutes);
        writeMailRoutes(mailRouteSheet, cleanRoutes);
        recordLog(ss, actorId, actorName, "MailRouteSave", resolveClientIp(json, e), String(cleanRoutes.length));
        return ContentService.createTextOutput(JSON.stringify({
          result: "success",
          routes: cleanRoutes
        })).setMimeType(ContentService.MimeType.JSON);
      }

      if (action === "save_users") {
        const userSheet = getOrCreateSheet(ss, "Users");
        ensureUsersHeaders(userSheet);
        const actor = (json.actor && typeof json.actor === "object") ? json.actor : {};
        const actorId = String(actor.id || "").trim();

        const actorRowNum = findRowById(userSheet, actorId, 1);
        const actorRow = actorRowNum > 1 ? userSheet.getRange(actorRowNum, 1, 1, 26).getValues()[0] : null;
        if (!actorRow) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "\uAD8C\uD55C \uD655\uC778 \uC2E4\uD328"
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const actorRole = normalizeRole(actorRow[3]);
        const actorPerms = normalizePermissions({
          calendarSelf: actorRow[9],
          calendarManual: actorRow[10],
          calendarParts: actorRow[11],
          calendarAll: actorRow[12],
          approveScope: actorRow[13],
          canManageUsers: actorRow[14],
          memberStatusScope: actorRow[24],
          canAccessMasterSettings: actorRow[25]
        }, actorRole, String(actorRow[5] || ""));
        const actorCanSaveUsers = actorRole === "master" || actorPerms.canManageUsers || actorPerms.canAccessMasterSettings;
        if (!actorCanSaveUsers) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "\uAD8C\uD55C/\uC124\uC815 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const existingPasswords = {};
        if (userSheet.getLastRow() > 1) {
          const pwData = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 2).getValues();
          pwData.forEach((r) => {
            existingPasswords[String(r[0])] = String(r[1]);
          });
        }

        if (userSheet.getLastRow() > 1) {
          userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 26).clearContent();
        }

        const users = Array.isArray(json.users) ? json.users : [];
        const newUsers = users.map((u) => {
          let finalPw = u.password;
          if ((!finalPw || String(finalPw).trim() === "") && existingPasswords[String(u.id)]) {
            finalPw = existingPasswords[String(u.id)];
          }

          const safeRole = normalizeRole(u.role);
          const perms = normalizePermissions(u.permissions || {}, safeRole, u.dept);
          const featureMemberCard = toBool(u.featureMemberCard, false);
          const featureBoard = toBool(u.featureBoard, true);
          const featureHomepage = toBool(u.featureHomepage, false);

          return [
            u.id,
            finalPw || "",
            u.name,
            safeRole,
            u.rank || "",
            u.dept,
            Number(u.totalHours) || 0,
            Number(u.usedHours) || 0,
            u.email || "",
            perms.calendarSelf,
            perms.calendarManual,
            perms.calendarParts,
            perms.calendarAll,
            perms.approveScope,
            perms.canManageUsers,
            cleanPhone(u.phone),
            String(u.employeeNo || ""),
            normalizeWorkShift(u.workQ1),
            normalizeWorkShift(u.workQ2),
            normalizeWorkShift(u.workQ3),
            normalizeWorkShift(u.workQ4),
            featureMemberCard,
            featureBoard,
            featureHomepage,
            perms.memberStatusScope,
            perms.canAccessMasterSettings
          ];
        });

        if (newUsers.length > 0) {
          userSheet.getRange(2, 1, newUsers.length, 26).setValues(newUsers);
        }
        recordLog(
          ss,
          String(actor.id || ""),
          String(actor.name || ""),
          "UserSave",
          resolveClientIp(json, e),
          "rows:" + String(newUsers.length)
        );

        return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
      }

      if (action === "change_password") {
        const userSheet = getOrCreateSheet(ss, "Users");
        ensureUsersHeaders(userSheet);

        const actor = (json.actor && typeof json.actor === "object") ? json.actor : {};
        const actorId = String(actor.id || "").trim();
        const actorName = String(actor.name || "").trim();
        const newPassword = String(json.newPassword || "").trim();

        if (!actorId) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "\uB85C\uADF8\uC778 \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."
          })).setMimeType(ContentService.MimeType.JSON);
        }
        if (!newPassword || newPassword.length < 4) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "\uBE44\uBC00\uBC88\uD638\uB294 4\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const actorRowNum = findRowById(userSheet, actorId, 1);
        if (actorRowNum <= 1) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        userSheet.getRange(actorRowNum, 2).setValue(newPassword);
        recordLog(ss, actorId, actorName, "PasswordChange", resolveClientIp(json, e), "self");

        return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
      }

      if (action === "upsert_board_post") {
        const boardSheet = getOrCreateSheet(ss, "BoardPosts");
        ensureBoardHeaders(boardSheet);
        const r = json.data || {};
        const actor = (json.actor && typeof json.actor === "object") ? json.actor : {};
        const actorId = String(actor.id || r.authorId || "");
        const actorName = String(actor.name || r.authorName || "");
        const now = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
        const postId = String(r.id || new Date().getTime());

        const rowData = [
          postId,
          String(r.title || ""),
          String(r.content || ""),
          String(r.category || "\uC77C\uBC18"),
          String(r.authorId || ""),
          String(r.authorName || ""),
          String(r.authorDept || ""),
          toBool(r.isNotice, false),
          String(r.status || "active"),
          Number(r.viewCount || 0),
          String(r.createdAt || now),
          String(r.updatedAt || now)
        ];

        const foundIndex = findRowById(boardSheet, postId, 1);

        if (foundIndex > 0) {
          boardSheet.getRange(foundIndex, 1, 1, BOARD_HEADERS.length).setValues([rowData]);
        } else {
          boardSheet.appendRow(rowData);
        }

        recordLog(
          ss,
          actorId,
          actorName,
          foundIndex > 0 ? "BoardPostUpdate" : "BoardPostCreate",
          resolveClientIp(json, e),
          postId
        );

        return ContentService.createTextOutput(JSON.stringify({ result: "success", id: postId })).setMimeType(ContentService.MimeType.JSON);
      }

      if (action === "delete_board_post") {
        const boardSheet = getOrCreateSheet(ss, "BoardPosts");
        ensureBoardHeaders(boardSheet);
        const targetId = String(json.id || "");
        const actor = (json.actor && typeof json.actor === "object") ? json.actor : {};
        const actorId = String(actor.id || "");
        const actorName = String(actor.name || "");
        const now = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
        const targetRow = findRowById(boardSheet, targetId, 1);

        if (targetRow > 1) {
          boardSheet.getRange(targetRow, 9).setValue("deleted");
          boardSheet.getRange(targetRow, 12).setValue(now);
          recordLog(ss, actorId, actorName, "BoardPostDelete", resolveClientIp(json, e), targetId);
          return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService.createTextOutput(JSON.stringify({ result: "success", message: "Not found" })).setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService.createTextOutput(JSON.stringify({
        result: "error",
        message: "\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 action"
      })).setMimeType(ContentService.MimeType.JSON);
    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function findRowById(sheet, idValue, idColumn) {
  const target = String(idValue || "").trim();
  if (!target) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const finder = sheet
    .getRange(2, idColumn, lastRow - 1, 1)
    .createTextFinder(target)
    .matchEntireCell(true);
  const foundCell = finder.findNext();
  return foundCell ? foundCell.getRow() : -1;
}

function ensureUsersHeaders(userSheet) {
  const width = Math.max(userSheet.getLastColumn(), USERS_HEADERS.length);
  const headerRange = userSheet.getRange(1, 1, 1, width);
  const current = headerRange.getValues()[0].map((v) => String(v || "").trim());

  if (current.every((v) => !v)) {
    userSheet.getRange(1, 1, 1, USERS_HEADERS.length).setValues([USERS_HEADERS]);
    return;
  }

  let isSame = true;
  for (let i = 0; i < USERS_HEADERS.length; i++) {
    if (current[i] !== USERS_HEADERS[i]) {
      isSame = false;
      break;
    }
  }
  if (isSame) return;

  const hasAllRequired = USERS_HEADERS.every((header) => current.includes(header));
  if (hasAllRequired) {
    migrateUsersSheetToV31_codex();
    return;
  }

  userSheet.getRange(1, 1, 1, USERS_HEADERS.length).setValues([USERS_HEADERS]);
}

function ensureRequestHeaders(reqSheet) {
  const currentLastCol = Math.max(reqSheet.getLastColumn(), REQUEST_HEADERS.length);
  const headerRange = reqSheet.getRange(1, 1, 1, currentLastCol);
  const current = headerRange.getValues()[0].map((v) => String(v || "").trim());

  if (current.every((v) => !v)) {
    reqSheet.getRange(1, 1, 1, REQUEST_HEADERS.length).setValues([REQUEST_HEADERS]);
    return;
  }

  const headersV1 = REQUEST_HEADERS.slice(0, 13);
  const headersV2 = REQUEST_HEADERS.slice(0, 15);
  const matchesV1 = headersV1.every((header, index) => current[index] === header);
  const matchesV2 = headersV2.every((header, index) => current[index] === header);
  const matchesNew = REQUEST_HEADERS.every((header, index) => current[index] === header);
  if (matchesNew) return;

  if (matchesV2) {
    reqSheet.getRange(1, 1, 1, REQUEST_HEADERS.length).setValues([[...headersV2, REQUEST_HEADERS[15]]]);
    return;
  }

  if (matchesV1) {
    reqSheet.getRange(1, 1, 1, REQUEST_HEADERS.length).setValues([[...headersV1, REQUEST_HEADERS[13], REQUEST_HEADERS[14], REQUEST_HEADERS[15]]]);
    return;
  }

  reqSheet.getRange(1, 1, 1, REQUEST_HEADERS.length).setValues([REQUEST_HEADERS]);
}

function ensureBoardHeaders(boardSheet) {
  const headerRange = boardSheet.getRange(1, 1, 1, BOARD_HEADERS.length);
  const current = headerRange.getValues()[0];
  let needUpdate = false;

  for (let i = 0; i < BOARD_HEADERS.length; i++) {
    if (String(current[i] || "").trim() !== BOARD_HEADERS[i]) {
      needUpdate = true;
      break;
    }
  }

  if (needUpdate) {
    headerRange.setValues([BOARD_HEADERS]);
  }
}

function ensureAccessLogHeaders(logSheet) {
  const headerRange = logSheet.getRange(1, 1, 1, ACCESS_LOG_HEADERS.length);
  const current = headerRange.getValues()[0];
  let needUpdate = false;
  for (let i = 0; i < ACCESS_LOG_HEADERS.length; i++) {
    if (String(current[i] || "").trim() !== ACCESS_LOG_HEADERS[i]) {
      needUpdate = true;
      break;
    }
  }
  if (needUpdate) headerRange.setValues([ACCESS_LOG_HEADERS]);
}

function ensureSpecialLeaveTypeHeaders(sheet) {
  const currentLastCol = Math.max(sheet.getLastColumn(), SPECIAL_LEAVE_TYPE_HEADERS.length);
  const headerRange = sheet.getRange(1, 1, 1, currentLastCol);
  const current = headerRange.getValues()[0].map((v) => String(v || "").trim());
  let needUpdate = false;
  const oldHeaders = ["typeKey", "label", "enabled", "sortOrder", "color"];
  const matchesOld = oldHeaders.every((header, index) => current[index] === header);
  const matchesNew = SPECIAL_LEAVE_TYPE_HEADERS.every((header, index) => current[index] === header);
  if (matchesNew) return;
  if (matchesOld) {
    sheet.getRange(1, 1, 1, SPECIAL_LEAVE_TYPE_HEADERS.length).setValues([[...oldHeaders, "grantHours", "requestMode"]]);
    return;
  }
  for (let i = 0; i < SPECIAL_LEAVE_TYPE_HEADERS.length; i++) {
    if (String(current[i] || "").trim() !== SPECIAL_LEAVE_TYPE_HEADERS[i]) {
      needUpdate = true;
      break;
    }
  }
  if (needUpdate) {
    headerRange.setValues([SPECIAL_LEAVE_TYPE_HEADERS]);
  }
}

function ensureUserSpecialLeaveHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, USER_SPECIAL_LEAVE_HEADERS.length);
  const current = headerRange.getValues()[0];
  let needUpdate = false;
  for (let i = 0; i < USER_SPECIAL_LEAVE_HEADERS.length; i++) {
    if (String(current[i] || "").trim() !== USER_SPECIAL_LEAVE_HEADERS[i]) {
      needUpdate = true;
      break;
    }
  }
  if (needUpdate) {
    headerRange.setValues([USER_SPECIAL_LEAVE_HEADERS]);
  }
}

function ensureMailRouteHeaders(sheet) {
  const currentLastCol = Math.max(sheet.getLastColumn(), MAIL_ROUTE_HEADERS.length);
  const headerRange = sheet.getRange(1, 1, 1, currentLastCol);
  const current = headerRange.getValues()[0].map((v) => String(v || "").trim());
  let needUpdate = false;
  for (let i = 0; i < MAIL_ROUTE_HEADERS.length; i++) {
    if (String(current[i] || "").trim() !== MAIL_ROUTE_HEADERS[i]) {
      needUpdate = true;
      break;
    }
  }
  if (needUpdate) {
    headerRange.getSheet().getRange(1, 1, 1, MAIL_ROUTE_HEADERS.length).setValues([MAIL_ROUTE_HEADERS]);
  }
}

function getSeedSpecialLeaveTypes() {
  return [
    { typeKey: "maternity", label: "출산휴가", enabled: false, sortOrder: 10, color: "rose", grantHours: 0, requestMode: "same_as_annual" },
    { typeKey: "sick", label: "병가", enabled: false, sortOrder: 20, color: "sky", grantHours: 0, requestMode: "same_as_annual" }
  ];
}

function ensureSeedSpecialLeaveTypes(sheet) {
  if (sheet.getLastRow() > 1) return;
  const defaults = getSeedSpecialLeaveTypes().map((item) => [
    item.typeKey,
    item.label,
    item.enabled,
    item.sortOrder,
    item.color,
    item.grantHours,
    item.requestMode
  ]);
  if (defaults.length) {
    sheet.getRange(2, 1, defaults.length, SPECIAL_LEAVE_TYPE_HEADERS.length).setValues(defaults);
  }
}

function normalizeSpecialLeaveTypeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 40);
}

function normalizeSpecialLeaveColor(value) {
  const safe = String(value || "").trim().toLowerCase();
  return ["rose", "sky", "emerald", "amber", "violet", "indigo", "slate"].indexOf(safe) > -1 ? safe : "slate";
}

function normalizeSpecialLeaveRequestMode(value) {
  const safe = String(value || "").trim().toLowerCase();
  return safe === "day_only" ? "day_only" : "same_as_annual";
}

function sanitizeSpecialLeaveTypeObject(raw, fallback) {
  const base = fallback || {};
  const typeKey = normalizeSpecialLeaveTypeKey(raw && raw.typeKey ? raw.typeKey : base.typeKey);
  return {
    typeKey: typeKey,
    label: String((raw && raw.label) || base.label || "").trim() || typeKey,
    enabled: toBool(raw && raw.enabled, toBool(base.enabled, false)),
    sortOrder: Number.isFinite(Number(raw && raw.sortOrder)) ? Number(raw.sortOrder) : Number(base.sortOrder || 0),
    color: normalizeSpecialLeaveColor((raw && raw.color) || base.color),
    grantHours: Math.max(0, Number.isFinite(Number(raw && raw.grantHours)) ? Number(raw.grantHours) : Number(base.grantHours || 0)),
    requestMode: normalizeSpecialLeaveRequestMode((raw && raw.requestMode) || base.requestMode)
  };
}

function buildSpecialLeaveTypes(inputTypes) {
  return (Array.isArray(inputTypes) ? inputTypes : [])
    .map((item) => sanitizeSpecialLeaveTypeObject(item, {}))
    .filter((item) => item.typeKey && item.label)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.label || "").localeCompare(String(b.label || "")));
}

function writeSpecialLeaveTypes(sheet, types) {
  const rows = buildSpecialLeaveTypes(types).map((item) => [
    item.typeKey,
    item.label,
    item.enabled,
    item.sortOrder,
    item.color,
    item.grantHours,
    item.requestMode
  ]);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, SPECIAL_LEAVE_TYPE_HEADERS.length).setValues([SPECIAL_LEAVE_TYPE_HEADERS]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, SPECIAL_LEAVE_TYPE_HEADERS.length).setValues(rows);
  }
}

function readSpecialLeaveTypes(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, SPECIAL_LEAVE_TYPE_HEADERS.length).getValues();
  const rows = data
    .map((r) => sanitizeSpecialLeaveTypeObject({
      typeKey: r[0],
      label: r[1],
      enabled: r[2],
      sortOrder: r[3],
      color: r[4],
      grantHours: r[5],
      requestMode: r[6]
    }, {}))
    .filter((item) => item.typeKey);
  return buildSpecialLeaveTypes(rows);
}

function readRequests(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, REQUEST_HEADERS.length).getValues();
  return data.map((r) => ({
    id: String(r[0] || "").trim(),
    userId: String(r[1] || "").trim(),
    userName: String(r[2] || "").trim(),
    dept: String(r[3] || "").trim(),
    role: String(r[4] || "").trim(),
    type: String(r[5] || "").trim(),
    startDate: r[6],
    endDate: r[7],
    hours: Number(r[8] || 0),
    timeRange: String(r[9] || "").trim(),
    reason: String(r[10] || "").trim(),
    status: String(r[11] || "").trim(),
    timestamp: r[12],
    specialLeaveTypeKey: String(r[13] || "").trim(),
    specialLeaveTypeLabel: String(r[14] || "").trim(),
    rejectReason: String(r[15] || "").trim()
  }));
}

function sanitizeUserSpecialLeaveObject(raw, fallbackUserId) {
  const totalHours = Number(raw && raw.totalHours);
  const usedHours = Number(raw && raw.usedHours);
  return {
    userId: String((raw && raw.userId) || fallbackUserId || "").trim(),
    typeKey: normalizeSpecialLeaveTypeKey(raw && raw.typeKey),
    totalHours: Number.isFinite(totalHours) && totalHours >= 0 ? totalHours : 0,
    usedHours: Number.isFinite(usedHours) && usedHours >= 0 ? usedHours : 0,
    note: String((raw && raw.note) || "").trim(),
    updatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
  };
}

function normalizeMailRoleGroup(value) {
  const safe = String(value || "").trim().toLowerCase();
  return safe === "leader" ? "leader" : "staff";
}

function sanitizeMailRouteObject(raw) {
  const dept = String(raw && raw.dept || "").trim();
  const roleGroup = normalizeMailRoleGroup(raw && raw.roleGroup);
  const toUserId = String(raw && raw.toUserId || "").trim();
  const ccList = Array.isArray(raw && raw.ccUserIds)
    ? raw.ccUserIds
    : String(raw && raw.ccUserIds || "").split(/[;,]/);
  const ccUserIds = [...new Set(ccList.map((item) => String(item || "").trim()).filter(Boolean))];
  return {
    dept,
    roleGroup,
    toUserId,
    ccUserIds
  };
}

function buildMailRoutes(inputRoutes) {
  const map = {};
  (Array.isArray(inputRoutes) ? inputRoutes : [])
    .map((item) => sanitizeMailRouteObject(item))
    .filter((item) => item.dept && item.toUserId)
    .forEach((item) => {
      const key = item.dept + "::" + item.roleGroup;
      map[key] = item;
    });
  return Object.keys(map).sort().map((key) => map[key]);
}

function writeMailRoutes(sheet, routesInput) {
  const rows = buildMailRoutes(routesInput).map((item) => {
    return [item.dept, item.roleGroup, item.toUserId, item.ccUserIds.join(";")];
  });
  sheet.clearContents();
  sheet.getRange(1, 1, 1, MAIL_ROUTE_HEADERS.length).setValues([MAIL_ROUTE_HEADERS]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, MAIL_ROUTE_HEADERS.length).setValues(rows);
  }
}

function readMailRoutes(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, MAIL_ROUTE_HEADERS.length).getValues();
  return data.map((r) => sanitizeMailRouteObject({
    dept: r[0],
    roleGroup: r[1],
    toUserId: r[2],
    ccUserIds: String(r[3] || "").split(";")
  })).filter((item) => item.dept);
}

function readUserSpecialLeaves(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, USER_SPECIAL_LEAVE_HEADERS.length).getValues();
  return data
    .map((r) => sanitizeUserSpecialLeaveObject({
      userId: r[0],
      typeKey: r[1],
      totalHours: r[2],
      usedHours: r[3],
      note: r[4]
    }, r[0]))
    .filter((item) => item.userId && item.typeKey);
}

function upsertUserSpecialLeaves(sheet, userId, leaves) {
  const targetUserId = String(userId || "").trim();
  const cleanLeaves = (Array.isArray(leaves) ? leaves : [])
    .map((item) => sanitizeUserSpecialLeaveObject(item, targetUserId))
    .filter((item) => item.userId === targetUserId && item.typeKey);
  const incomingKeys = {};
  cleanLeaves.forEach((item) => {
    incomingKeys[item.typeKey] = true;
  });

  const remainRows = readUserSpecialLeaves(sheet)
    .filter((item) => !(String(item.userId) === targetUserId && incomingKeys[item.typeKey]))
    .map((item) => [item.userId, item.typeKey, item.totalHours, item.usedHours, item.note || "", item.updatedAt || ""]);
  const nextRows = cleanLeaves
    .filter((item) => item.totalHours > 0 || item.usedHours > 0 || item.note)
    .map((item) => [item.userId, item.typeKey, item.totalHours, item.usedHours, item.note || "", item.updatedAt || ""]);
  const allRows = remainRows.concat(nextRows);

  sheet.clearContents();
  sheet.getRange(1, 1, 1, USER_SPECIAL_LEAVE_HEADERS.length).setValues([USER_SPECIAL_LEAVE_HEADERS]);
  if (allRows.length) {
    sheet.getRange(2, 1, allRows.length, USER_SPECIAL_LEAVE_HEADERS.length).setValues(allRows);
  }
}

function migrateUsersSheetToV31_codex() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = getOrCreateSheet(ss, "Users");
  const lastRow = userSheet.getLastRow();
  const lastCol = userSheet.getLastColumn();

  if (lastRow <= 0 || lastCol <= 0) {
    ensureUsersHeaders(userSheet);
    return;
  }

  const headerValues = userSheet.getRange(1, 1, 1, lastCol).getValues()[0].map((v) => String(v || "").trim());
  const isOldLayout =
    headerValues[0] === "id" &&
    headerValues[1] === "password" &&
    headerValues[2] === "name" &&
    headerValues[3] === "role" &&
    headerValues[4] === "dept" &&
    headerValues[5] === "totalHours" &&
    headerValues[6] === "usedHours" &&
    headerValues[7] === "rank";

  const backupName = "Users_backup_v31_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
  const backupSheet = userSheet.copyTo(ss);
  backupSheet.setName(backupName);

  if (isOldLayout) {
    userSheet.moveColumns(userSheet.getRange("H:H"), 5);
  }

  userSheet.getRange(1, 1, 1, USERS_HEADERS.length).setValues([USERS_HEADERS]);

  if (lastRow > 1) {
    const roleRange = userSheet.getRange(2, 4, lastRow - 1, 1);
    const roleValues = roleRange.getValues().map((row) => [normalizeRole(row[0])]);
    roleRange.setValues(roleValues);
  }

  const currentLastCol = userSheet.getLastColumn();
  if (currentLastCol > USERS_HEADERS.length) {
    userSheet.deleteColumns(USERS_HEADERS.length + 1, currentLastCol - USERS_HEADERS.length);
  }
}

function recordLog(ss, userId, userName, type, ip, detail) {
  try {
    const logSheet = getOrCreateSheet(ss, "AccessLogs");
    ensureAccessLogHeaders(logSheet);
    const timestamp = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
    const rowData = [
      timestamp,
      String(userId || ""),
      String(userName || ""),
      cleanLogType(type || "Action"),
      String(ip || ""),
      String(detail || "")
    ];
    logSheet.appendRow(rowData);
  } catch (e) {
    console.error("log write fail: " + e.toString());
  }
}

function resolveClientIp(json, e) {
  const j = json && typeof json === "object" ? json : {};
  const direct = String(j.clientIp || "").trim();
  if (direct) return direct;
  const params = e && e.parameter ? e.parameter : {};
  const fromParam = String(params.clientIp || "").trim();
  if (fromParam) return fromParam;
  return "";
}

function normalizeRequestDateKey(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (!isNaN(date.getTime())) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return "";
}

function cleanLogType(value) {
  const t = String(value || "").trim();
  if (!t) return "Action";
  return t.replace(/[^\w\-:]/g, "_").slice(0, 40);
}

function toBool(value, fallback) {
  if (value === true || value === false) return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "yes" || v === "y") return true;
    if (v === "false" || v === "no" || v === "n") return false;
  }
  return fallback;
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d\-+\s]/g, "").trim();
}

function normalizeWorkShift(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, "");
  if (compact === "07:00~16:00" || compact === "07:00-16:00") return "07:00 ~ 16:00";
  if (compact === "08:00~17:00" || compact === "08:00-17:00") return "08:00 ~ 17:00";
  if (compact === "09:00~18:00" || compact === "09:00-18:00") return "09:00 ~ 18:00";
  return "";
}

function normalizeRole(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "master" || raw === "마스터") return "master";
  if (raw === "ceo" || raw === "대표") return "ceo";
  if (raw === "manager" || raw === "teamleader" || raw === "team_leader" || raw === "팀리더" || raw === "팀장") return "team_leader";
  if (raw === "partleader" || raw === "part_leader" || raw === "파트리더" || raw === "파트장") return "part_leader";
  return "employee";
}

function normalizeScope(value, fallback) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "manual" || v === "parts" || v === "all" || v === "none") return v;
  return fallback;
}

function getLegacyDefaultPermissions(role, dept) {
  role = normalizeRole(role);
  const p = {
    calendarSelf: true,
    calendarManual: false,
    calendarParts: false,
    calendarAll: false,
    approveScope: "none",
    memberStatusScope: "none",
    canAccessMasterSettings: false,
    canManageUsers: false
  };

  if (role === "master") {
    p.calendarSelf = true;
    p.calendarManual = true;
    p.calendarParts = true;
    p.calendarAll = true;
    p.approveScope = "all";
    p.memberStatusScope = "all";
    p.canAccessMasterSettings = true;
    p.canManageUsers = true;
    return p;
  }

  // Legacy default used only when permission columns are empty
  if (role === "ceo") {
    p.calendarManual = true;
    p.calendarParts = true;
    p.calendarAll = true;
    p.approveScope = "all";
    p.memberStatusScope = "all";
    p.canManageUsers = true;
  } else if (role === "team_leader") {
    p.calendarManual = dept === "\uB9E4\uB274\uC5BC\uD300";
    p.calendarParts = dept === "\uD30C\uCE20\uBD81\uD300";
    p.approveScope = dept === "\uB9E4\uB274\uC5BC\uD300" ? "manual" : (dept === "\uD30C\uCE20\uBD81\uD300" ? "parts" : "none");
    p.memberStatusScope = p.approveScope;
    p.canManageUsers = true;
  }

  return p;
}

function normalizePermissions(raw, role, dept) {
  role = normalizeRole(role);
  const defaults = getLegacyDefaultPermissions(role, dept);
  const source = raw && typeof raw === "object" ? raw : {};

  const hasExplicit = (
    source.calendarSelf !== undefined && source.calendarSelf !== "" ||
    source.calendarManual !== undefined && source.calendarManual !== "" ||
    source.calendarParts !== undefined && source.calendarParts !== "" ||
    source.calendarAll !== undefined && source.calendarAll !== "" ||
    source.approveScope !== undefined && String(source.approveScope).trim() !== "" ||
    source.memberStatusScope !== undefined && String(source.memberStatusScope).trim() !== "" ||
    source.canAccessMasterSettings !== undefined && source.canAccessMasterSettings !== "" ||
    source.canManageUsers !== undefined && source.canManageUsers !== ""
  );

  const safeApproveScope = normalizeScope(source.approveScope, "none");
  const safeMemberStatusScope = normalizeScope(source.memberStatusScope, safeApproveScope);
  const p = hasExplicit ? {
    calendarSelf: toBool(source.calendarSelf, false),
    calendarManual: toBool(source.calendarManual, false),
    calendarParts: toBool(source.calendarParts, false),
    calendarAll: toBool(source.calendarAll, false),
    approveScope: safeApproveScope,
    memberStatusScope: safeMemberStatusScope,
    canAccessMasterSettings: toBool(source.canAccessMasterSettings, false),
    canManageUsers: toBool(source.canManageUsers, false)
  } : defaults;

  if (role === "master") {
    p.calendarSelf = true;
    p.calendarManual = true;
    p.calendarParts = true;
    p.calendarAll = true;
    p.approveScope = "all";
    p.memberStatusScope = "all";
    p.canAccessMasterSettings = true;
    p.canManageUsers = true;
    return p;
  }

  if (!p.calendarSelf && !p.calendarManual && !p.calendarParts && !p.calendarAll) {
    p.calendarSelf = true;
  }

  return p;
}


