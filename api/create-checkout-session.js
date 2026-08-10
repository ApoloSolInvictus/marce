const Stripe = require('stripe');
const { getFirebaseAdmin } = require('./_firebase');

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
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const items = normalizeItems(body.items, body);

    if (!items.length) {
      return res.status(400).json({ error: 'At least one cart item is required.' });
    }

    const orderRef = await db.collection('orders').add({
      customerEmail: body.email || null,
      customerUid: body.uid || null,
      customer: body.customer || {},
      paymentMethod: body.paymentMethod || 'card',
      status: 'checkout_started',
      progress: 40,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      items,
    });

    const configuredMethods = (process.env.STRIPE_PAYMENT_METHODS || 'card,paypal')
      .split(',')
      .map((method) => method.trim())
      .filter(Boolean);
    const requestedMethod = body.paymentMethod || 'card';
    const methods = configuredMethods.includes(requestedMethod) ? [requestedMethod] : configuredMethods;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: methods,
      customer_email: body.email || undefined,
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: process.env.SHOP_CURRENCY || 'usd',
          unit_amount: item.unitAmount,
          product_data: {
            name: item.title,
            images: item.image && /^https?:\/\//.test(item.image) ? [item.image] : undefined,
          },
        },
      })),
      metadata: {
        orderId: orderRef.id,
        customerUid: body.uid || '',
      },
      success_url: `${process.env.SITE_URL}/account.html?order=${orderRef.id}&payment=success`,
      cancel_url: `${process.env.SITE_URL}/shop-checkout.html?payment=cancelled`,
    });

    await orderRef.update({
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
    });

    return res.status(200).json({ orderId: orderRef.id, url: session.url });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
