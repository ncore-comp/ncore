const admin = require('firebase-admin');
const { findServiceAccountPath } = require('./import-firestore');
const { getRequestMutationMode } = require('../functions/src/policies/requestPolicy');
(async () => {
  const appName = `debug-admin-create-${Date.now()}`;
  admin.initializeApp({ credential: admin.credential.cert(require(findServiceAccountPath())) }, appName);
  const db = admin.app(appName).firestore();
  try {
    const master = (await db.collection('users').doc('0').get()).data();
    const target = (await db.collection('users').doc('김효창').get()).data();
    const modeApproved = getRequestMutationMode(master, null, 'approved', { id: '김효창', name: target.name, dept: target.dept, role: target.role });
    const modePending = getRequestMutationMode(master, null, 'pending', { id: '김효창', name: target.name, dept: target.dept, role: target.role });
    console.log(JSON.stringify({ actorRole: master.role, actorId: master.id, targetRole: target.role, targetDept: target.dept, modeApproved, modePending }, null, 2));
  } finally { await admin.app(appName).delete().catch(()=>{}); }
})().catch((e)=>{ console.error(e.stack || String(e)); process.exit(1); });
