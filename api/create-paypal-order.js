const { getFirebaseAdmin } = require('./_firebase');
const { createPayPalOrder } = require('./_paypal');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function verifiedCustomer(admin, body) {
  if (!body.idToken) {
    return {
      uid: body.uid || null,
      email: normalizeEmail(body.email) || null,
    };
  }

  const verified = await admin.auth().verifyIdToken(body.idToken);
  const verifiedEmail = normalizeEmail(verified.email);
  const checkoutEmail = normalizeEmail(body.email);

  if (checkoutEmail && verifiedEmail && checkoutEmail !== verifiedEmail) {
    const error = new Error('The signed-in Google account must match the checkout email address.');
    error.statusCode = 400;
    throw error;
  }

  return {
    uid: verified.uid,
    email: verifiedEmail || checkoutEmail || null,
  };
}

function normalizeItems(items, fallbackBody) {
  if (Array.isArray(items) && items.length) {
    return items.map((item) => {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const unitAmount = Math.max(1, Math.round(Number(item.unitAmount || item.amount || 0)));

      return {
        id: item.id || null,
        title: item.title || 'Eterna Espressione Artwork',
        image: item.image || null,
        quantity,
        unitAmount,
      };
    }).filter((item) => item.unitAmount > 0);
  }

  const fallbackAmount = Math.max(1, Math.round(Number(fallbackBody.amount || 15000)));
  return [{
    id: null,
    title: fallbackBody.title || 'Eterna Espressione Artwork',
    image: null,
    quantity: 1,
    unitAmount: fallbackAmount,
  }];
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
    const items = normalizeItems(body.items, body);
    const customer = await verifiedCustomer(admin, body);

    if (!items.length) {
      return res.status(400).json({ error: 'At least one cart item is required.' });
    }

    const orderRef = await db.collection('orders').add({
      customerEmail: customer.email,
      customerUid: customer.uid,
      customer: body.customer || {},
      paymentProvider: 'paypal',
      paymentMethod: 'paypal',
      status: 'checkout_started',
      progress: 40,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      items,
    });

    const paypalOrder = await createPayPalOrder({
      orderId: orderRef.id,
      items,
      customerEmail: customer.email,
    });
    const approvalLink = (paypalOrder.links || []).find((link) => link.rel === 'approve');

    if (!approvalLink || !approvalLink.href) {
      throw new Error('PayPal did not return an approval URL.');
    }

    await orderRef.update({
      paypalOrderId: paypalOrder.id,
      approvalUrl: approvalLink.href,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      orderId: orderRef.id,
      paypalOrderId: paypalOrder.id,
      url: approvalLink.href,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};
