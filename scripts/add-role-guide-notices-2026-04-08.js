"use strict";

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");
const { nowKst } = require("../functions/src/lib/time");

const ROOT_DIR = path.resolve(__dirname, "..");
const BACKUP_ROOT = path.join(ROOT_DIR, "backups");
const RUN_DIR = path.join(BACKUP_ROOT, "2026-04-08_add-role-guide-notices");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
  return result;
}

async function writeDocs(db, collectionName, docs) {
  for (const group of chunk(docs, 400)) {
    const batch = db.batch();
    group.forEach((doc) => {
      batch.set(db.collection(collectionName).doc(String(doc.id)), doc, { merge: true });
    });
    await batch.commit();
  }
}

async function main() {
  ensureDir(RUN_DIR);

  const serviceAccountPath = findServiceAccountPath();
  const appName = `add-role-guide-notices-${Date.now()}`;
  admin.initializeApp(
    {
      credential: admin.credential.cert(require(serviceAccountPath))
    },
    appName
  );

  const db = admin.app(appName).firestore();

  try {
    const beforeSnap = await db.collection("boardPosts").get();
    const beforeDocs = beforeSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    fs.writeFileSync(
      path.join(RUN_DIR, "boardPosts-before.json"),
      JSON.stringify(
        {
          backedUpAt: nowKst(),
          count: beforeDocs.length,
          docs: beforeDocs
        },
        null,
        2
      )
    );

    const usersSnap = await db.collection("users").get();
    const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const masterUser = users.find((user) => String(user.role || "").trim().toLowerCase() === "master");

    const authorId = String(masterUser?.id || "0");
    const authorName = String(masterUser?.name || "Web관리자");
    const authorDept = String(masterUser?.dept || "매뉴얼팀");
    const createdAt = nowKst();

    const notices = [
      {
        id: "notice-guide-2026-04-08-employee",
        title: "[사용법] 직원용 NCORE 빠른 안내",
        content:
          "1. 개인 달력에서 연차 가능 날짜를 먼저 확인합니다.\n2. 연차 신청 버튼을 눌러 연차, 반차, 시간차를 선택합니다.\n3. 특별휴가는 표시된 사용 가능 기간 안에서만 신청합니다.\n4. 신청 후에는 내 최근 신청 내역에서 상태를 확인합니다.\n5. 일정 변경이 생기면 승인 전에는 취소 또는 수정 요청을 진행합니다.",
        category: "공지",
        authorId,
        authorName,
        authorDept,
        isNotice: true,
        status: "active",
        viewCount: 0,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "notice-guide-2026-04-08-partleader",
        title: "[사용법] 파트장용 NCORE 확인 포인트",
        content:
          "1. 개인 신청 외에도 파트원 일정 변동을 달력과 전체 상황판에서 먼저 확인합니다.\n2. 같은 날짜에 반차, 시간차, 특별휴가가 겹치는지 우선 살핍니다.\n3. 필요한 경우 승인권자와 일정 조정을 먼저 진행한 뒤 신청 또는 수정합니다.\n4. 자리배치도에서는 당일 기준 부재 인원을 확인해 업무 공백을 미리 점검합니다.",
        category: "공지",
        authorId,
        authorName,
        authorDept,
        isNotice: true,
        status: "active",
        viewCount: 0,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "notice-guide-2026-04-08-teamleader",
        title: "[사용법] 팀장용 승인 및 현황 관리 안내",
        content:
          "1. 승인 대기 내역을 먼저 확인하고 일정 충돌 여부를 검토합니다.\n2. 전체 상황판과 자리배치도로 당일 부재 현황을 함께 확인합니다.\n3. 반려 시에는 사유를 명확하게 입력합니다.\n4. 특별휴가나 장기 부재는 기간과 남은 사용 가능 일정을 함께 확인한 뒤 판단합니다.",
        category: "공지",
        authorId,
        authorName,
        authorDept,
        isNotice: true,
        status: "active",
        viewCount: 0,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "notice-guide-2026-04-08-ceo",
        title: "[사용법] 대표용 전체 현황 확인 안내",
        content:
          "1. 전체 상황판에서 월간 부재 추이를 먼저 확인합니다.\n2. 날짜를 눌러 자리배치도와 당일 부재 인원을 함께 봅니다.\n3. 장기 부재와 복귀 임박 인원을 우선 확인합니다.\n4. 필요 시 공지사항을 통해 운영 안내를 공지합니다.",
        category: "공지",
        authorId,
        authorName,
        authorDept,
        isNotice: true,
        status: "active",
        viewCount: 0,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "notice-guide-2026-04-08-master",
        title: "[사용법] 마스터용 운영 관리 안내",
        content:
          "1. 권한/설정에서 기능 스위치와 권한 그룹을 먼저 점검합니다.\n2. 구성원 관리에서 사용자 정보, 근무시간, 특별휴가 부여를 관리합니다.\n3. 운영실에서는 휴일, 대리 등록, 로그 확인을 진행합니다.\n4. 공지사항은 전체 공지 성격으로 작성하고, 시스템 변경 사항은 먼저 공지 후 반영합니다.",
        category: "공지",
        authorId,
        authorName,
        authorDept,
        isNotice: true,
        status: "active",
        viewCount: 0,
        createdAt,
        updatedAt: createdAt
      }
    ];

    await writeDocs(db, "boardPosts", notices);

    const afterSnap = await db.collection("boardPosts").get();
    const afterDocs = afterSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const summary = {
      executedAt: nowKst(),
      beforeCount: beforeDocs.length,
      addedCount: notices.length,
      finalCount: afterDocs.length,
      createdIds: notices.map((item) => item.id),
      author: {
        id: authorId,
        name: authorName,
        dept: authorDept
      }
    };

    fs.writeFileSync(path.join(RUN_DIR, "boardPosts-after.json"), JSON.stringify(afterDocs, null, 2));
    fs.writeFileSync(path.join(RUN_DIR, "summary.json"), JSON.stringify(summary, null, 2));

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await admin.app(appName).delete().catch(() => {});
  }
}

main().catch((error) => {
  console.error("add-role-guide-notices failed:", error.message);
  process.exitCode = 1;
});
