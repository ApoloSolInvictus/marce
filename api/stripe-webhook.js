const Stripe = require('stripe');
const { getFirebaseAdmin } = require('./_firebase');

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata && session.metadata.orderId;

      if (orderId) {
        const admin = getFirebaseAdmin();
        const db = admin.firestore();
        await db.collection('orders').doc(orderId).set({
          status: 'paid',
          progress: 60,
          paymentStatus: session.payment_status,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        if (process.env.N8N_ORDER_WEBHOOK_URL) {
          await fetch(process.env.N8N_ORDER_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-automation-token': process.env.N8N_WEBHOOK_TOKEN || '',
            },
            body: JSON.stringify({
              orderId,
              status: 'paid',
              checkoutSessionId: session.id,
            }),
          });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
