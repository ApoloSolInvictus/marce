const { getFirebaseAdmin } = require('./_firebase');
const { capturePayPalOrder } = require('./_paypal');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const orderId = body.orderId;
    const paypalOrderId = body.paypalOrderId;

    if (!orderId || !paypalOrderId) {
      return res.status(400).json({ error: 'orderId and paypalOrderId are required.' });
    }

    const orderRef = db.collection('orders').doc(orderId);
    const currentOrder = await orderRef.get();
    if (currentOrder.exists && currentOrder.data().status === 'paid') {
      return res.status(200).json({ ok: true, status: 'COMPLETED', alreadyCaptured: true });
    }

    const capture = await capturePayPalOrder(paypalOrderId);
    const captureStatus = capture.status || 'COMPLETED';

    await orderRef.set({
      status: captureStatus === 'COMPLETED' ? 'paid' : 'payment_pending',
      progress: captureStatus === 'COMPLETED' ? 60 : 50,
      paymentProvider: 'paypal',
      paypalOrderId,
      paypalCapture: capture,
      paidAt: captureStatus === 'COMPLETED' ? admin.firestore.FieldValue.serverTimestamp() : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    if (captureStatus === 'COMPLETED' && process.env.N8N_ORDER_WEBHOOK_URL) {
      await fetch(process.env.N8N_ORDER_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-automation-token': process.env.N8N_WEBHOOK_TOKEN || '',
        },
        body: JSON.stringify({
          orderId,
          status: 'paid',
          paymentProvider: 'paypal',
          paypalOrderId,
        }),
      });
    }

    return res.status(200).json({ ok: true, status: captureStatus });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
