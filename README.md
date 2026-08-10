# Eterna Espressione - Marcello Castagna

Static gallery and shop for Marcello Castagna, prepared for Vercel hosting with Firebase customer/order storage, PayPal Checkout, and optional n8n order automation.

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

## Domain Routing Checklist

Current deployment notes:

- `marce-alpha.vercel.app` redirects to `https://www.eternaespressione.com`.
- `https://www.eternaespressione.com` is serving the current site correctly.
- `marce.wstudio3d.com` DNS points to Vercel, but Vercel returns `DEPLOYMENT_NOT_FOUND` until that exact hostname is attached to the correct Vercel project.

To make `https://marce.wstudio3d.com` work:

1. Open the Vercel project that deploys this GitHub repo.
2. Go to Settings > Domains.
3. Add `marce.wstudio3d.com`.
4. If Vercel says the domain is already assigned elsewhere, remove it from the old Vercel project first.
5. Keep the DNS CNAME for `marce.wstudio3d.com` pointed to the Vercel target provided by Vercel.
6. Set the preferred production domain in Vercel:
   - Use `marce.wstudio3d.com` if that should be the client-facing domain.
   - Use `www.eternaespressione.com` if that is the final brand domain.
7. Avoid keeping multiple forced redirects until the final production domain is chosen.

## Required Vercel Environment Variables

Add these in Vercel under Project Settings > Environment Variables. Add them for Production first, then Preview/Development if needed.

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `SITE_URL` | Yes | `https://www.eternaespressione.com` | Used for PayPal return and cancel redirects. Do not include a trailing slash. |
| `SHOP_CURRENCY` | Yes | `USD` | PayPal currency code. Keep uppercase. |
| `PAYPAL_ENVIRONMENT` | Yes | `sandbox` or `live` | Use `sandbox` for testing and `live` for production. |
| `PAYPAL_CLIENT_ID` | Yes | PayPal REST app client ID | Create this in the PayPal Developer Dashboard. |
| `PAYPAL_CLIENT_SECRET` | Yes | PayPal REST app secret | Store as a secret in Vercel. |
| `PAYPAL_MERCHANT_EMAIL` | Optional | seller@example.com | PayPal merchant email when the account requires an explicit payee. |
| `FIREBASE_PROJECT_ID` | Yes | `eterna-espressione` | Firebase project ID. |
| `FIREBASE_CLIENT_EMAIL` | Yes | `firebase-adminsdk-...@...iam.gserviceaccount.com` | Service account client email. |
| `FIREBASE_PRIVATE_KEY` | Yes | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` | Paste as one value. Keep the `\n` line breaks escaped if Vercel stores it on one line. |
| `N8N_ORDER_WEBHOOK_URL` | Optional | `https://your-n8n-domain/webhook/order-paid` | Called after PayPal confirms an order as paid. |
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

The checkout currently sends the billing/shipping form, customer email, cart items, order status, and progress value to Firestore through the Vercel API.

## PayPal Setup

1. Create or open the PayPal Business account for the gallery.
2. Go to the PayPal Developer Dashboard and create a REST API app.
3. Add the PayPal credentials to Vercel:

```text
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

4. Test purchases with PayPal sandbox accounts.
5. When ready for production, switch to live PayPal credentials and set `PAYPAL_ENVIRONMENT=live`.

Accepted card brands are shown on the site, but payment is completed only through PayPal. American Express, MasterCard, Visa, and Discover availability depends on the customer's PayPal checkout options and region.

## n8n Automation Setup

The site supports two automation directions:

1. PayPal to n8n after payment:
   - Set `N8N_ORDER_WEBHOOK_URL`.
   - Set `N8N_WEBHOOK_TOKEN`.
   - `api/capture-paypal-order.js` sends `orderId`, `status`, `paymentProvider`, and `paypalOrderId` to n8n after a PayPal capture succeeds.

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
- Checkout sends the cart to `/api/create-paypal-order`.
- PayPal redirects the customer to secure hosted payment.
- After PayPal returns the customer to `account.html`, `/api/capture-paypal-order` captures the payment, updates Firestore, and can notify n8n.

## Production Notes

This is ready as a functional prototype. Before accepting real high-value art payments, the next production hardening step is to move final product prices to a trusted server catalog or PayPal product/order configuration, so the browser cannot be the source of truth for artwork pricing.
