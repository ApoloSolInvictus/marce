const { getFirebaseAdmin } = require('./_firebase');

const statusProgress = {
  order_started: 20,
  checkout_started: 40,
  paid: 60,
  preparing: 70,
  shipped: 85,
  delivered: 100,
  complete: 100,
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers['x-automation-token'];
    if (!process.env.N8N_WEBHOOK_TOKEN || token !== process.env.N8N_WEBHOOK_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const orderId = body.orderId;
    const status = body.status;

    if (!orderId || !status) {
      return res.status(400).json({ error: 'orderId and status are required' });
    }

    await db.collection('orders').doc(orderId).set({
      status,
      progress: statusProgress[status] || 0,
      ownerNote: body.ownerNote || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
