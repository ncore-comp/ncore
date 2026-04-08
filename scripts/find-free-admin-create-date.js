const admin = require('firebase-admin');
const { findServiceAccountPath } = require('./import-firestore');
(async () => {
  const appName = `find-clear-date-${Date.now()}`;
  admin.initializeApp({ credential: admin.credential.cert(require(findServiceAccountPath())) }, appName);
  const db = admin.app(appName).firestore();
  try {
    const snap = await db.collection('requests').where('userId','==','김효창').get();
    const used = new Set(snap.docs.map((d)=> String(d.data().startDate || '')));
    const candidates = ['2026-04-02','2026-04-03','2026-04-06','2026-04-07','2026-04-08'];
    const free = candidates.find((d)=> !used.has(d));
    console.log(JSON.stringify({ used: [...used].sort(), free }, null, 2));
  } finally { await admin.app(appName).delete().catch(()=>{}); }
})().catch((e)=>{ console.error(e.stack || String(e)); process.exit(1); });
