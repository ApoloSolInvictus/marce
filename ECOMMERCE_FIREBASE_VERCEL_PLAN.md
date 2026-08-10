# Eterna Espressione Ecommerce Plan

This site is currently a static HTML gallery/shop. The next production step is to host it on Vercel and connect secure serverless functions to Firebase, Stripe/PayPal, and n8n.

## Recommended Architecture

- **Frontend:** existing HTML/CSS pages, including `shop.html`, `shop-cart.html`, `shop-checkout.html`, and `account.html`.
- **Customer accounts:** Firebase Authentication.
- **Customer/order data:** Cloud Firestore collections:
  - `customers/{uid}`
  - `orders/{orderId}`
- **Payments:** hosted checkout, not raw card fields inside the page.
  - Cards: American Express, MasterCard, Visa, Discover through Stripe Checkout or another certified gateway.
  - PayPal: PayPal Checkout directly, or through a gateway that supports PayPal in the merchant account.
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
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PAYMENT_METHODS`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `N8N_WEBHOOK_TOKEN`
- `N8N_ORDER_WEBHOOK_URL`

## Current API Scaffolding

- `api/create-checkout-session.js` creates a Firestore order and returns a hosted checkout URL.
- `api/stripe-webhook.js` receives payment confirmation and updates the order to `paid`.
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
