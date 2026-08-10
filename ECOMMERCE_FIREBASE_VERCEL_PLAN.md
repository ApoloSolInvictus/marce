# Eterna Espressione Ecommerce Plan

This site is currently a static HTML gallery/shop. The next production step is to host it on Vercel and connect secure serverless functions to Firebase, PayPal, and n8n.

## Recommended Architecture

- **Frontend:** existing HTML/CSS pages, including `shop.html`, `shop-cart.html`, `shop-checkout.html`, and `account.html`.
- **Customer accounts:** Firebase Authentication.
- **Customer/order data:** Cloud Firestore collections:
  - `customers/{uid}`
  - `orders/{orderId}`
- **Payments:** PayPal hosted checkout only. The site can display American Express, MasterCard, Visa, and Discover logos as accepted through PayPal, but card data must stay inside PayPal checkout.
- **Backend:** Vercel Functions in `/api`.
- **Automation:** n8n receives payment/order events and calls `/api/order-status-webhook` to update the order.
- **Email notices:** Firebase Trigger Email extension, SendGrid, Resend, Mailgun, or an n8n email workflow.

## Order Progress States

The progress bars can be reused from `progressbar.html` and are now prepared in `shop-cart.html`, `shop-checkout.html`, and `account.html`.

Suggested states:

1. `order_started` - customer adds artwork to cart.
2. `checkout_started` - customer fills billing/shipping/account details.
3. `paid` - payment provider confirms payment.
4. `preparing` - owner confirms the artwork is being prepared.
5. `shipped` - owner or automation adds shipping information.
6. `delivered` / `complete` - order is received and closed.

## Required Vercel Environment Variables

Use real production values in Vercel only. Do not commit secrets to GitHub.

- `SITE_URL`
- `SHOP_CURRENCY`
- `PAYPAL_ENVIRONMENT`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_MERCHANT_EMAIL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `N8N_WEBHOOK_TOKEN`
- `N8N_ORDER_WEBHOOK_URL`

## Domain Setup

The production domain should be managed in Vercel, not GitHub Pages.

- Remove the GitHub Pages custom-domain `CNAME` file from the repository.
- In the DNS provider for `wstudio3d.com`, set:
  - Type: `CNAME`
  - Name/Host: `marce`
  - Value/Target: the Vercel-provided DNS target for the project, or Vercel's recommended CNAME target.
- In Vercel, keep `marce.wstudio3d.com` added to the `marce-alpha` project and verify the domain after DNS propagation.
- Avoid setting `marce-alpha.vercel.app` to redirect to `marce.wstudio3d.com` until Vercel shows the custom domain as valid.

## Current API Scaffolding

- `api/create-paypal-order.js` creates a Firestore order and returns a PayPal approval URL.
- `api/capture-paypal-order.js` captures PayPal approval, updates the order to `paid`, and can notify n8n.
- `api/order-status-webhook.js` lets n8n or the owner update Firestore order progress securely.
- `api/_firebase.js` initializes Firebase Admin on Vercel.

## Activation Checklist

1. Create or choose a Firebase project.
2. Enable Firebase Authentication with email/password.
3. Create Firestore database and security rules for customers/orders.
4. Create a Firebase service account for Vercel server functions.
5. Add all required environment variables in Vercel.
6. Connect a payment provider and enable the needed methods.
7. Configure payment webhooks and/or n8n workflows.
8. Add email notification workflow for owner and customer.
9. Replace demo cart data with live cart/order data.
