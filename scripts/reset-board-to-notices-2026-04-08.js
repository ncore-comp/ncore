"use strict";

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");
const { nowKst } = require("../functions/src/lib/time");

const ROOT_DIR = path.resolve(__dirname, "..");
const BACKUP_ROOT = path.join(ROOT_DIR, "backups");
const RUN_DIR = path.join(BACKUP_ROOT, "2026-04-08_reset-board-to-notices");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function deleteDocs(db, docs) {
  for (const group of chunk(docs, 400)) {
    const batch = db.batch();
    group.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function writeDocs(db, collectionName, docs) {
  for (const group of chunk(docs, 400)) {
    const batch = db.batch();
    group.forEach((doc) => {
      batch.set(db.collection(collectionName).doc(String(doc.id)), doc);
    });
    await batch.commit();
  }
}

async function main() {
  ensureDir(RUN_DIR);

  const serviceAccountPath = findServiceAccountPath();
  const appName = `reset-board-${Date.now()}`;
  admin.initializeApp(
    {
      credential: admin.credential.cert(require(serviceAccountPath))
    },
    appName
  );

  const db = admin.app(appName).firestore();

  try {
    const boardSnap = await db.collection("boardPosts").get();
    const boardDocs = boardSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    const usersSnap = await db.collection("users").get();
    const users = usersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    const masterUser = users.find((user) => String(user.role || "").trim().toLowerCase() === "master");

    fs.writeFileSync(
      path.join(RUN_DIR, "boardPosts-before.json"),
      JSON.stringify(
        {
          backedUpAt: nowKst(),
          count: boardDocs.length,
          docs: boardDocs
        },
        null,
        2
      )
    );

    await deleteDocs(db, boardSnap.docs);

    const authorId = String(masterUser?.id || "0");
    const authorName = String(masterUser?.name || "Web관리자");
    const authorDept = String(masterUser?.dept || "매뉴얼팀");
    const createdAt = nowKst();

    const notices = [
      {
        id: "notice-2026-04-08-01",
        title: "[공지] 4월 연차 신청 및 승인 일정 안내",
        content:
          "4월 연차 신청은 근무 일정에 맞춰 미리 등록해 주세요.\n승인권자는 신청 내역을 확인한 뒤 순차적으로 승인 처리해 주시기 바랍니다.\n부득이한 일정 변경이 있으면 사유를 함께 남겨 주세요.",
        category: "공지사항",
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
        id: "notice-2026-04-08-02",
        title: "[공지] 특별휴가 신청 시 유의사항",
        content:
          "특별휴가는 부여 건별로 사용 가능 기간 안에서만 신청할 수 있습니다.\n신청 화면에 표시되는 특별휴가만 선택해 주세요.\n사용 가능 기간이 지난 특별휴가는 신청할 수 없습니다.",
        category: "공지사항",
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
        id: "notice-2026-04-08-03",
        title: "[공지] 시스템 사용 중 오류 발견 시 전달 방법",
        content:
          "사용 중 이상 동작이나 화면 오류를 발견하면 발생 화면, 날짜, 계정, 간단한 설명을 함께 전달해 주세요.\n재현 화면이 있으면 스크린샷을 첨부해 주시면 확인이 더 빠릅니다.",
        category: "공지사항",
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
    const afterDocs = afterSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    const summary = {
      executedAt: nowKst(),
      removedCount: boardDocs.length,
      createdCount: notices.length,
      author: {
        id: authorId,
        name: authorName,
        dept: authorDept
      },
      createdIds: notices.map((item) => item.id),
      finalCount: afterDocs.length
    };

    fs.writeFileSync(path.join(RUN_DIR, "boardPosts-after.json"), JSON.stringify(afterDocs, null, 2));
    fs.writeFileSync(path.join(RUN_DIR, "summary.json"), JSON.stringify(summary, null, 2));

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await admin.app(appName).delete().catch(() => {});
  }
}

main().catch((error) => {
  console.error("reset-board-to-notices failed:", error.message);
  process.exitCode = 1;
});
