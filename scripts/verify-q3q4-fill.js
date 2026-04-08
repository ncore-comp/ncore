const admin = require('firebase-admin');
const { findServiceAccountPath } = require('./import-firestore');
(async () => {
  const appName = `verify-q3q4-${Date.now()}`;
  admin.initializeApp({ credential: admin.credential.cert(require(findServiceAccountPath())) }, appName);
  const db = admin.app(appName).firestore();
  try {
    const snap = await db.collection('users').get();
    const blanks = [];
    const sample = [];
    snap.docs.forEach((doc) => {
      const d = doc.data() || {};
      const item = { id: doc.id, name: String(d.name || ''), dept: String(d.dept || ''), workQ2: String(d.workQ2 || ''), workQ3: String(d.workQ3 || ''), workQ4: String(d.workQ4 || '') };
      if (item.workQ2 && (!item.workQ3 || !item.workQ4)) blanks.push(item);
      if (['김효창','최혜리','김유진','박진형'].includes(item.name)) sample.push(item);
    });
    console.log(JSON.stringify({ ok:true, remainingBlankTargets: blanks.length, sample }, null, 2));
  } finally {
    await admin.app(appName).delete().catch(() => {});
  }
})().catch((e)=>{ console.error(e.stack || String(e)); process.exit(1); });
