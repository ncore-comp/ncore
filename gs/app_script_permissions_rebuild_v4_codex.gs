// NCORE - Google Apps Script (권한 저장 연동 버전)
// 교체 대상: 기존 doGet/doPost 포함 전체 스크립트

const USERS_HEADERS = [
  "id", "password", "name", "role", "dept",
  "totalHours", "usedHours", "rank", "email",
  "calendarSelf", "calendarManual", "calendarParts", "calendarAll",
  "approveScope", "canManageUsers",
  "phone", "employeeNo", "workQ1", "workQ2", "workQ3", "workQ4",
  "featureMemberCard", "featureBoard"
];
const ACCESS_LOG_HEADERS = ["timestamp", "userId", "userName", "type", "ip", "detail"];
const BOARD_HEADERS = [
  "id", "title", "content", "category",
  "authorId", "authorName", "authorDept",
  "isNotice", "status", "viewCount",
  "createdAt", "updatedAt"
];

function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === "load") {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const userSheet = getOrCreateSheet(ss, "Users");
      const reqSheet = getOrCreateSheet(ss, "Requests");
      const holSheet = getOrCreateSheet(ss, "Holidays");
      const boardSheet = getOrCreateSheet(ss, "BoardPosts");

      ensureUsersHeaders(userSheet);
      ensureBoardHeaders(boardSheet);

      let users = [];
      if (userSheet.getLastRow() > 1) {
        const data = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 23).getValues();
        users = data.map((r) => {
          const perms = normalizePermissions({
            calendarSelf: r[9],
            calendarManual: r[10],
            calendarParts: r[11],
            calendarAll: r[12],
            approveScope: r[13],
            canManageUsers: r[14]
          }, r[3], r[4]);

          return {
            id: String(r[0]),
            password: "",
            name: r[2],
            role: r[3],
            dept: r[4],
            totalHours: Number(r[5]),
            usedHours: Number(r[6]),
            rank: r[7],
            email: r[8] || "",
            phone: cleanPhone(r[15]),
            employeeNo: String(r[16] || ""),
            workQ1: normalizeWorkShift(r[17]),
            workQ2: normalizeWorkShift(r[18]),
            workQ3: normalizeWorkShift(r[19]),
            workQ4: normalizeWorkShift(r[20]),
            featureMemberCard: toBool(r[21], false),
            featureBoard: toBool(r[22], true),
            permissions: perms
          };
        });
      }

      let requests = [];
      if (reqSheet.getLastRow() > 1) {
        const data = reqSheet.getRange(2, 1, reqSheet.getLastRow() - 1, 13).getValues();
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
          timestamp: r[12]
        }));
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

      let boardPosts = [];
      if (boardSheet.getLastRow() > 1) {
        const data = boardSheet.getRange(2, 1, boardSheet.getLastRow() - 1, BOARD_HEADERS.length).getValues();
        boardPosts = data.map((r) => ({
          id: String(r[0] || ""),
          title: String(r[1] || ""),
          content: String(r[2] || ""),
          category: String(r[3] || "일반"),
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

      return ContentService.createTextOutput(JSON.stringify({
        result: "success",
        data: { users: users, requests: requests, boardPosts: boardPosts, holidays: holidays }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: "지원하지 않는 action"
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

    if (action === "login") {
      const userSheet = getOrCreateSheet(ss, "Users");
      ensureUsersHeaders(userSheet);

      if (userSheet.getLastRow() <= 1) {
        return ContentService.createTextOutput(JSON.stringify({
          result: "fail",
          message: "사용자 데이터 없음"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const inputId = String(json.id || "").trim();
      const inputPw = String(json.password || "").trim();
      const userRowNum = findRowById(userSheet, inputId, 1);
      const row = userRowNum > 1 ? userSheet.getRange(userRowNum, 1, 1, 23).getValues()[0] : null;

      if (row && String(row[1] || "").trim() === inputPw) {
        const perms = normalizePermissions({
          calendarSelf: row[9],
          calendarManual: row[10],
          calendarParts: row[11],
          calendarAll: row[12],
          approveScope: row[13],
          canManageUsers: row[14]
        }, row[3], row[4]);

        const userObj = {
          id: String(row[0]),
          password: "",
          name: row[2],
          role: row[3],
          dept: row[4],
          totalHours: Number(row[5]),
          usedHours: Number(row[6]),
          rank: row[7],
          email: row[8] || "",
          phone: cleanPhone(row[15]),
          employeeNo: String(row[16] || ""),
          workQ1: normalizeWorkShift(row[17]),
          workQ2: normalizeWorkShift(row[18]),
          workQ3: normalizeWorkShift(row[19]),
          workQ4: normalizeWorkShift(row[20]),
          featureMemberCard: toBool(row[21], false),
          featureBoard: toBool(row[22], true),
          permissions: perms
        };

        recordLog(ss, userObj.id, userObj.name, "Login", resolveClientIp(json, e), "login_success");

        return ContentService.createTextOutput(JSON.stringify({
          result: "success",
          user: userObj
        })).setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService.createTextOutput(JSON.stringify({
        result: "fail",
        message: "아이디/비밀번호 불일치"
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
        message: "서버 혼잡. 잠시 후 다시 시도해주세요."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    try {
      if (action === "upsert_request") {
        const reqSheet = getOrCreateSheet(ss, "Requests");
        const r = json.data;
        const actor = (json.actor && typeof json.actor === "object") ? json.actor : {};
        const actorId = String(actor.id || r.userId || "");
        const actorName = String(actor.name || r.userName || "");
        const rowData = [
          r.id, r.userId, r.userName, r.dept, r.role, r.type,
          r.startDate, r.endDate, r.hours, r.timeRange || "",
          r.reason, r.status, r.timestamp
        ];

        const foundIndex = findRowById(reqSheet, r.id, 1);

        if (foundIndex > 0) reqSheet.getRange(foundIndex, 1, 1, 13).setValues([rowData]);
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
            message: "요청 정보가 올바르지 않습니다."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const actorRowNum = findRowById(userSheet, actorId, 1);
        const actorRow = actorRowNum > 1 ? userSheet.getRange(actorRowNum, 1, 1, 23).getValues()[0] : null;
        if (!actorRow) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "권한 확인 실패"
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const actorRole = String(actorRow[3] || "");
        const actorPerms = normalizePermissions({
          calendarSelf: actorRow[9],
          calendarManual: actorRow[10],
          calendarParts: actorRow[11],
          calendarAll: actorRow[12],
          approveScope: actorRow[13],
          canManageUsers: actorRow[14]
        }, actorRole, String(actorRow[4] || ""));
        const actorCanManage = actorRole === "master" || actorPerms.canManageUsers;
        if (!actorCanManage) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "구성원 관리 권한이 없습니다."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const targetRowNum = findRowById(userSheet, targetId, 1);
        const oldRow = targetRowNum > 1 ? userSheet.getRange(targetRowNum, 1, 1, 23).getValues()[0] : null;
        const oldRole = oldRow ? String(oldRow[3] || "") : "";
        if (actorRole !== "master" && oldRole === "master") {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "마스터 계정은 수정할 수 없습니다."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const reqRole = String(payload.role || oldRole || "employee");
        if (actorRole !== "master" && reqRole === "master" && oldRole !== "master") {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "마스터 권한은 변경할 수 없습니다."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        let finalPw = String(payload.password || "").trim();
        if (oldRow) {
          if (actorRole !== "master" || !finalPw) finalPw = String(oldRow[1] || "");
        } else if (!finalPw || finalPw.length < 8) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "신규 계정 비밀번호는 8자 이상이어야 합니다."
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const finalRole = oldRow ? (actorRole === "master" ? reqRole : oldRole || reqRole) : reqRole;
        const finalDept = String(payload.dept || (oldRow ? oldRow[4] : "") || "").trim();
        const finalPermissions = actorRole === "master"
          ? normalizePermissions(payload.permissions || {}, finalRole, finalDept)
          : (oldRow ? normalizePermissions({
              calendarSelf: oldRow[9],
              calendarManual: oldRow[10],
              calendarParts: oldRow[11],
              calendarAll: oldRow[12],
              approveScope: oldRow[13],
              canManageUsers: oldRow[14]
            }, finalRole, finalDept) : normalizePermissions({
              calendarSelf: true,
              calendarManual: false,
              calendarParts: false,
              calendarAll: false,
              approveScope: "none",
              canManageUsers: false
            }, finalRole, finalDept));

        const totalHours = Number(payload.totalHours);
        const finalTotalHours = Number.isFinite(totalHours)
          ? totalHours
          : (oldRow ? Number(oldRow[5] || 0) : 0);
        const finalUsedHours = oldRow ? Number(oldRow[6] || 0) : 0;
        const finalFeatureMemberCard = actorRole === "master"
          ? toBool(payload.featureMemberCard, false)
          : (oldRow ? toBool(oldRow[21], false) : false);
        const finalFeatureBoard = actorRole === "master"
          ? toBool(payload.featureBoard, true)
          : (oldRow ? toBool(oldRow[22], true) : true);

        const rowData = [
          targetId,
          finalPw,
          String(payload.name || (oldRow ? oldRow[2] : "") || ""),
          finalRole,
          finalDept,
          finalTotalHours,
          finalUsedHours,
          String(payload.rank || (oldRow ? oldRow[7] : "") || ""),
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
          finalFeatureBoard
        ];

        if (targetRowNum > 1) {
          userSheet.getRange(targetRowNum, 1, 1, 23).setValues([rowData]);
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
            role: rowData[3],
            dept: rowData[4],
            totalHours: Number(rowData[5] || 0),
            usedHours: Number(rowData[6] || 0),
            rank: rowData[7],
            email: rowData[8] || "",
            phone: rowData[15] || "",
            employeeNo: rowData[16] || "",
            workQ1: rowData[17] || "",
            workQ2: rowData[18] || "",
            workQ3: rowData[19] || "",
            workQ4: rowData[20] || "",
            featureMemberCard: toBool(rowData[21], false),
            featureBoard: toBool(rowData[22], true),
            permissions: normalizePermissions({
              calendarSelf: rowData[9],
              calendarManual: rowData[10],
              calendarParts: rowData[11],
              calendarAll: rowData[12],
              approveScope: rowData[13],
              canManageUsers: rowData[14]
            }, rowData[3], rowData[4])
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }

      if (action === "save_users") {
        const userSheet = getOrCreateSheet(ss, "Users");
        ensureUsersHeaders(userSheet);
        const actor = (json.actor && typeof json.actor === "object") ? json.actor : {};
        const actorId = String(actor.id || "").trim();

        const actorRowNum = findRowById(userSheet, actorId, 1);
        const actorRow = actorRowNum > 1 ? userSheet.getRange(actorRowNum, 1, 1, 23).getValues()[0] : null;
        if (!actorRow) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "권한 확인 실패"
          })).setMimeType(ContentService.MimeType.JSON);
        }

        const actorRole = String(actorRow[3] || "");
        const actorPerms = normalizePermissions({
          calendarSelf: actorRow[9],
          calendarManual: actorRow[10],
          calendarParts: actorRow[11],
          calendarAll: actorRow[12],
          approveScope: actorRow[13],
          canManageUsers: actorRow[14]
        }, actorRole, String(actorRow[4] || ""));
        const actorCanManage = actorRole === "master" || actorPerms.canManageUsers;
        if (!actorCanManage) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "fail",
            message: "구성원 관리 권한이 없습니다."
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
          userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 23).clearContent();
        }

        const users = Array.isArray(json.users) ? json.users : [];
        const newUsers = users.map((u) => {
          let finalPw = u.password;
          if ((!finalPw || String(finalPw).trim() === "") && existingPasswords[String(u.id)]) {
            finalPw = existingPasswords[String(u.id)];
          }

          const perms = normalizePermissions(u.permissions || {}, u.role, u.dept);
          const featureMemberCard = toBool(u.featureMemberCard, false);
          const featureBoard = toBool(u.featureBoard, true);

          return [
            u.id,
            finalPw || "",
            u.name,
            u.role,
            u.dept,
            Number(u.totalHours) || 0,
            Number(u.usedHours) || 0,
            u.rank || "",
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
            featureBoard
          ];
        });

        if (newUsers.length > 0) {
          userSheet.getRange(2, 1, newUsers.length, 23).setValues(newUsers);
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
          String(r.category || "일반"),
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
        message: "지원하지 않는 action"
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
  const headerRange = userSheet.getRange(1, 1, 1, USERS_HEADERS.length);
  const current = headerRange.getValues()[0];
  let needUpdate = false;

  for (let i = 0; i < USERS_HEADERS.length; i++) {
    if (String(current[i] || "").trim() !== USERS_HEADERS[i]) {
      needUpdate = true;
      break;
    }
  }

  if (needUpdate) {
    headerRange.setValues([USERS_HEADERS]);
  }
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
    const dataRows = logSheet.getLastRow() - 1;
    if (dataRows > 1) {
      logSheet.getRange(2, 1, dataRows, ACCESS_LOG_HEADERS.length).sort([{ column: 1, ascending: false }]);
    }
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

function normalizeScope(value, fallback) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "manual" || v === "parts" || v === "all" || v === "none") return v;
  return fallback;
}

function getLegacyDefaultPermissions(role, dept) {
  const p = {
    calendarSelf: true,
    calendarManual: false,
    calendarParts: false,
    calendarAll: false,
    approveScope: "none",
    canManageUsers: false
  };

  if (role === "master") {
    p.calendarSelf = true;
    p.calendarManual = true;
    p.calendarParts = true;
    p.calendarAll = true;
    p.approveScope = "all";
    p.canManageUsers = true;
    return p;
  }

  // 초기 마이그레이션용 기본값 (권한 컬럼 비어있을 때만 사용)
  if (role === "ceo") {
    p.calendarManual = true;
    p.calendarParts = true;
    p.calendarAll = true;
    p.approveScope = "all";
    p.canManageUsers = true;
  } else if (role === "manager") {
    p.calendarManual = dept === "매뉴얼팀";
    p.calendarParts = dept === "파츠북팀";
    p.approveScope = dept === "매뉴얼팀" ? "manual" : (dept === "파츠북팀" ? "parts" : "none");
    p.canManageUsers = true;
  }

  return p;
}

function normalizePermissions(raw, role, dept) {
  const defaults = getLegacyDefaultPermissions(role, dept);
  const source = raw && typeof raw === "object" ? raw : {};

  const hasExplicit = (
    source.calendarSelf !== undefined && source.calendarSelf !== "" ||
    source.calendarManual !== undefined && source.calendarManual !== "" ||
    source.calendarParts !== undefined && source.calendarParts !== "" ||
    source.calendarAll !== undefined && source.calendarAll !== "" ||
    source.approveScope !== undefined && String(source.approveScope).trim() !== "" ||
    source.canManageUsers !== undefined && source.canManageUsers !== ""
  );

  const p = hasExplicit ? {
    calendarSelf: toBool(source.calendarSelf, false),
    calendarManual: toBool(source.calendarManual, false),
    calendarParts: toBool(source.calendarParts, false),
    calendarAll: toBool(source.calendarAll, false),
    approveScope: normalizeScope(source.approveScope, "none"),
    canManageUsers: toBool(source.canManageUsers, false)
  } : defaults;

  if (role === "master") {
    p.calendarSelf = true;
    p.calendarManual = true;
    p.calendarParts = true;
    p.calendarAll = true;
    p.approveScope = "all";
    p.canManageUsers = true;
    return p;
  }

  if (!p.calendarSelf && !p.calendarManual && !p.calendarParts && !p.calendarAll) {
    p.calendarSelf = true;
  }

  return p;
}
