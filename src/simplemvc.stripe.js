const Stripe = require('stripe');

function buildCheckoutSessionParams({
    mode = 'payment',
    lineItems,
    successUrl,
    cancelUrl,
    customerEmail,
    customerId,
    clientReferenceId,
    metadata,
    subscriptionData
} = {}) {
    if (!lineItems?.length)
        throw new Error('lineItems is required and must contain at least one item');
    if (!successUrl)
        throw new Error('successUrl is required');
    if (!cancelUrl)
        throw new Error('cancelUrl is required');
    if (mode !== 'payment' && mode !== 'subscription')
        throw new Error('mode must be "payment" or "subscription"');

    const params = {
        mode,
        line_items: lineItems.map(({ price, quantity = 1 }) => ({ price, quantity })),
        success_url: successUrl,
        cancel_url: cancelUrl
    };

    if (customerEmail)
        params.customer_email = customerEmail;
    if (customerId)
        params.customer = customerId;
    if (clientReferenceId)
        params.client_reference_id = clientReferenceId;
    if (metadata)
        params.metadata = metadata;
    if (mode === 'subscription' && subscriptionData)
        params.subscription_data = subscriptionData;

    return params;
}

class SimpleMVCStripe {
    constructor(client) {
        this._client = client;
    }

    getClient() {
        if (this._client)
            return this._client;

        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey)
            throw new Error('STRIPE_SECRET_KEY must be set in the environment');

        this._client = new Stripe(secretKey);
        return this._client;
    }

    async createCheckoutSession(options) {
        const params = buildCheckoutSessionParams(options);
        const session = await this.getClient().checkout.sessions.create(params);
        return { id: session.id, url: session.url };
    }

    async getCheckoutSession(sessionId, { expand = [] } = {}) {
        if (!sessionId)
            throw new Error('sessionId is required');

        return this.getClient().checkout.sessions.retrieve(sessionId, {
            expand: expand.length ? expand : undefined
        });
    }

    async cancelSubscription(subscriptionId, { cancelAtPeriodEnd = true } = {}) {
        if (!subscriptionId)
            throw new Error('subscriptionId is required');

        const client = this.getClient();
        if (cancelAtPeriodEnd)
            return client.subscriptions.update(subscriptionId, { cancel_at_period_end: true });

        return client.subscriptions.cancel(subscriptionId);
    }

    verifyWebhook(rawBody, signature) {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret)
            throw new Error('STRIPE_WEBHOOK_SECRET must be set in the environment');
        if (!signature)
            throw new Error('Stripe-Signature header is required');

        return this.getClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
    }

    createWebhookHandler(handlers = {}) {
        return async (req, res) => {
            const signature = req.headers['stripe-signature'];

            let event;
            try {
                event = this.verifyWebhook(req.body, signature);
            } catch (ex) {
                console.error('Stripe webhook signature verification failed');
                res.status(400).send('Webhook signature verification failed');
                return;
            }

            const handler = handlers[event.type];
            if (handler) {
                try {
                    await handler(event);
                } catch (ex) {
                    console.error(ex);
                    res.status(500).send('Webhook handler failed');
                    return;
                }
            }

            res.json({ received: true });
        };
    }
}

module.exports = SimpleMVCStripe;
module.exports.buildCheckoutSessionParams = buildCheckoutSessionParams;
