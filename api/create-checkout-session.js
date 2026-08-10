const Stripe = require('stripe');
const { getFirebaseAdmin } = require('./_firebase');

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

    const orderRef = await db.collection('orders').add({
      customerEmail: body.email || null,
      customerUid: body.uid || null,
      status: 'checkout_started',
      progress: 40,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      items: body.items || [],
    });

    const methods = (process.env.STRIPE_PAYMENT_METHODS || 'card,paypal')
      .split(',')
      .map((method) => method.trim())
      .filter(Boolean);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: methods,
      customer_email: body.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: process.env.SHOP_CURRENCY || 'usd',
            unit_amount: Number(body.amount || 15000),
            product_data: {
              name: body.title || 'Eterna Espressione Artwork',
            },
          },
        },
      ],
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
