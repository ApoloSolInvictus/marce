function getPayPalBaseUrl() {
  return (process.env.PAYPAL_ENVIRONMENT || 'sandbox') === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function getSiteUrl() {
  return (process.env.SITE_URL || 'https://www.eternaespressione.com').replace(/\/$/, '');
}

function getCurrency() {
  return (process.env.SHOP_CURRENCY || 'USD').toUpperCase();
}

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing PayPal environment variables.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error_description || body.message || 'PayPal authentication failed.');
  }

  return body.access_token;
}

async function createPayPalOrder({ orderId, items, customerEmail }) {
  const accessToken = await getPayPalAccessToken();
  const currency = getCurrency();
  const itemTotal = items.reduce((sum, item) => sum + (item.unitAmount * item.quantity), 0);
  const total = (itemTotal / 100).toFixed(2);

  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: orderId,
        invoice_id: orderId,
        custom_id: orderId,
        amount: {
          currency_code: currency,
          value: total,
          breakdown: {
            item_total: {
              currency_code: currency,
              value: total,
            },
          },
        },
        items: items.map((item) => ({
          name: String(item.title || 'Eterna Espressione Artwork').slice(0, 127),
          quantity: String(item.quantity),
          unit_amount: {
            currency_code: currency,
            value: (item.unitAmount / 100).toFixed(2),
          },
          category: 'PHYSICAL_GOODS',
        })),
        payee: process.env.PAYPAL_MERCHANT_EMAIL ? { email_address: process.env.PAYPAL_MERCHANT_EMAIL } : undefined,
      }],
      payer: customerEmail ? { email_address: customerEmail } : undefined,
      application_context: {
        brand_name: 'Eterna Espressione',
        landing_page: 'LOGIN',
        shipping_preference: 'GET_FROM_FILE',
        user_action: 'PAY_NOW',
        return_url: `${getSiteUrl()}/account.html?order=${orderId}&payment=paypal-success`,
        cancel_url: `${getSiteUrl()}/shop-checkout.html?order=${orderId}&payment=paypal-cancelled`,
      },
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || 'PayPal order could not be created.');
  }

  return body;
}

async function capturePayPalOrder(paypalOrderId) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || 'PayPal order could not be captured.');
  }

  return body;
}

module.exports = {
  createPayPalOrder,
  capturePayPalOrder,
  getCurrency,
};
