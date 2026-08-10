# Eterna Espressione - Marcello Castagna

Static gallery and shop for Marcello Castagna, prepared for Vercel hosting with Firebase customer/order storage, Stripe Checkout, PayPal through Stripe Checkout, and optional n8n order automation.

## Live Domains

- Production domain: `https://marce.wstudio3d.com`
- Vercel domain: `https://marce-alpha.vercel.app`
- GitHub repo: `https://github.com/ApoloSolInvictus/marce.git`

## Local Development

```bash
npm install
npm run build
```

The build script copies the static HTML site and assets into `public/`, which is the output directory used by Vercel.

## Vercel Project Settings

Use these settings in Vercel:

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Build Command | `npm run build` |
| Output Directory | `public` |
| Install Command | `npm install` |
| Production Domain | `marce.wstudio3d.com` |

The repository includes `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "public",
  "cleanUrls": false,
  "trailingSlash": false
}
```

`cleanUrls` stays `false` because the template links use routes like `shop-cart.html`, `shop-checkout.html`, and `account.html`.

## Required Vercel Environment Variables

Add these in Vercel under Project Settings > Environment Variables. Add them for Production first, then Preview/Development if needed.

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `SITE_URL` | Yes | `https://marce.wstudio3d.com` | Used for Stripe success and cancel redirects. Do not include a trailing slash. |
| `SHOP_CURRENCY` | Yes | `usd` | Stripe currency code. Keep lowercase. |
| `STRIPE_SECRET_KEY` | Yes | `sk_live_...` | Secret key from Stripe. Use test key only for test deployments. |
| `STRIPE_WEBHOOK_SECRET` | Yes | `whsec_...` | Secret from the Stripe webhook endpoint. |
| `STRIPE_PAYMENT_METHODS` | Yes | `card,paypal` | Enables credit/debit cards and PayPal in Stripe Checkout when the Stripe account supports them. |
| `FIREBASE_PROJECT_ID` | Yes | `eterna-espressione` | Firebase project ID. |
| `FIREBASE_CLIENT_EMAIL` | Yes | `firebase-adminsdk-...@...iam.gserviceaccount.com` | Service account client email. |
| `FIREBASE_PRIVATE_KEY` | Yes | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` | Paste as one value. Keep the `\n` line breaks escaped if Vercel stores it on one line. |
| `N8N_ORDER_WEBHOOK_URL` | Optional | `https://your-n8n-domain/webhook/order-paid` | Called after Stripe marks an order as paid. |
| `N8N_WEBHOOK_TOKEN` | Recommended | long random token | Protects the n8n status webhook and outgoing n8n calls. |

## Firebase Setup

1. Create or select a Firebase project.
2. Enable Firestore Database.
3. Enable Firebase Authentication with Email/Password when customer login is ready to go live.
4. Create a Firebase service account:
   - Firebase Console > Project Settings > Service Accounts.
   - Generate a new private key.
   - Copy `project_id`, `client_email`, and `private_key` into the Vercel variables above.
5. Firestore will receive orders in the `orders` collection.

The checkout currently sends the billing/shipping form, customer email, selected payment method, cart items, order status, and progress value to Firestore through the Vercel API.

## Stripe and PayPal Setup

1. Create or open the Stripe account for the gallery.
2. Add `STRIPE_SECRET_KEY` in Vercel.
3. In Stripe, create a webhook endpoint:

```text
https://marce.wstudio3d.com/api/stripe-webhook
```

4. Subscribe the webhook to:

```text
checkout.session.completed
```

5. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
6. Keep `STRIPE_PAYMENT_METHODS=card,paypal` if PayPal is enabled in the Stripe account. If PayPal is not available yet, use `card`.

Accepted card brands are handled by Stripe Checkout: American Express, MasterCard, Visa, and Discover availability depends on the Stripe account and region.

## n8n Automation Setup

The site supports two automation directions:

1. Stripe to n8n after payment:
   - Set `N8N_ORDER_WEBHOOK_URL`.
   - Set `N8N_WEBHOOK_TOKEN`.
   - `api/stripe-webhook.js` sends `orderId`, `status`, and `checkoutSessionId` to n8n.

2. n8n or the owner updating order progress:
   - Send a `POST` request to:

```text
https://marce.wstudio3d.com/api/order-status-webhook
```

   - Include this header:

```text
x-automation-token: YOUR_N8N_WEBHOOK_TOKEN
```

   - Example JSON body:

```json
{
  "orderId": "Firestore order document ID",
  "status": "shipped",
  "ownerNote": "Artwork packed and handed to carrier."
}
```

Supported statuses:

| Status | Progress |
| --- | --- |
| `order_started` | 20 |
| `checkout_started` | 40 |
| `paid` | 60 |
| `preparing` | 70 |
| `shipped` | 85 |
| `delivered` | 100 |
| `complete` | 100 |

## Current Shop Behavior

- Shop products are added to a browser cart with `localStorage`.
- Cart and Checkout pages render only the real selected products.
- Products can be removed from both Cart and Checkout.
- Quantities can be increased or decreased before payment.
- Checkout sends the cart to `/api/create-checkout-session`.
- Stripe redirects the customer to secure hosted payment.
- After payment, Stripe webhook updates the Firestore order and can notify n8n.

## Production Notes

This is ready as a functional prototype. Before accepting real high-value art payments, the next production hardening step is to move final product prices to a trusted server catalog or Stripe Price IDs, so the browser cannot be the source of truth for artwork pricing.

