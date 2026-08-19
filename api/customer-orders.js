const { getFirebaseAdmin } = require('./_firebase');

function serializeDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function serializeOrder(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    customerEmail: data.customerEmail || null,
    status: data.status || 'checkout_started',
    progress: Number(data.progress || 0),
    paymentProvider: data.paymentProvider || 'paypal',
    items: Array.isArray(data.items) ? data.items : [],
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
    paidAt: serializeDate(data.paidAt),
  };
}

async function collectOrders(db, field, value) {
  if (!value) return [];
  const snapshot = await db.collection('orders').where(field, '==', value).limit(10).get();
  return snapshot.docs.map(serializeOrder);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const token = body.idToken;

    if (!token) {
      return res.status(401).json({ error: 'A Firebase sign-in token is required.' });
    }

    const verified = await admin.auth().verifyIdToken(token);
    const email = (verified.email || '').toLowerCase();
    const byUid = await collectOrders(db, 'customerUid', verified.uid);
    const byEmail = await collectOrders(db, 'customerEmail', email);
    const merged = {};

    byUid.concat(byEmail).forEach((order) => {
      merged[order.id] = order;
    });

    const orders = Object.keys(merged)
      .map((key) => merged[key])
      .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
      .slice(0, 10);

    return res.status(200).json({ orders });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
