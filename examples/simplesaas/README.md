# Examples / Simple SaaS

A demo subscription app with **Free**, **Basic**, and **Pro** tiers. It uses local SimpleMVC sources (not the npm package), Membership for auth, and Stripe Checkout for paid plans.

There is no real product functionality — only billing, account, and admin demo flows.

## Prerequisites

1. Run `npm install` from the **repository root** (dependencies live there).
2. Copy `.env.example` to `.env` in this folder and fill in values.
3. Create two recurring **Prices** in the [Stripe Dashboard](https://dashboard.stripe.com/test/products) (Basic and Pro) and set `STRIPE_PRICE_BASIC` and `STRIPE_PRICE_PRO`.

## Local Stripe webhooks

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward events:

```bash
stripe listen --forward-to localhost:8080/webhooks/stripe
```

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`. Enable these events on your endpoint:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Run

From this directory:

```bash
node app.js
```

Or `npm start`.

Register a user (Free tier by default), subscribe from **Pricing**, and manage billing on **Account**. Log in with `ADMIN_EMAIL` to open **Admin** and list or maintain users.

## Demo limitations

- No upgrades between Basic and Pro (cancel first, or use admin plan override).
- No Stripe Customer Portal.
- Admin plan changes do not sync with Stripe.
- No email verification or password reset.
