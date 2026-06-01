const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const SimpleMVCStripe = require('../src/simplemvc.stripe.js');
const { buildCheckoutSessionParams } = require('../src/simplemvc.stripe.js');
const SimpleMVCApp = require('../src/simplemvc.app.js');

describe('buildCheckoutSessionParams', () => {
    it('builds payment session params without payment_method_types', () => {
        const params = buildCheckoutSessionParams({
            lineItems: [{ price: 'price_123', quantity: 2 }],
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
            customerEmail: 'user@example.com',
            clientReferenceId: '42',
            metadata: { orderId: '99' }
        });

        assert.equal(params.mode, 'payment');
        assert.deepEqual(params.line_items, [{ price: 'price_123', quantity: 2 }]);
        assert.equal(params.success_url, 'https://example.com/success');
        assert.equal(params.cancel_url, 'https://example.com/cancel');
        assert.equal(params.customer_email, 'user@example.com');
        assert.equal(params.client_reference_id, '42');
        assert.deepEqual(params.metadata, { orderId: '99' });
        assert.equal(params.payment_method_types, undefined);
    });

    it('builds subscription session params with subscription_data', () => {
        const params = buildCheckoutSessionParams({
            mode: 'subscription',
            lineItems: [{ price: 'price_sub' }],
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
            subscriptionData: { trial_period_days: 14 }
        });

        assert.equal(params.mode, 'subscription');
        assert.deepEqual(params.subscription_data, { trial_period_days: 14 });
    });

    it('throws when required fields are missing', () => {
        assert.throws(
            () => buildCheckoutSessionParams({ successUrl: 'a', cancelUrl: 'b' }),
            /lineItems/
        );
        assert.throws(
            () => buildCheckoutSessionParams({ lineItems: [{ price: 'p' }], cancelUrl: 'b' }),
            /successUrl/
        );
    });
});

describe('SimpleMVCStripe', () => {
    const originalSecretKey = process.env.STRIPE_SECRET_KEY;
    const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    afterEach(() => {
        if (originalSecretKey === undefined)
            delete process.env.STRIPE_SECRET_KEY;
        else
            process.env.STRIPE_SECRET_KEY = originalSecretKey;

        if (originalWebhookSecret === undefined)
            delete process.env.STRIPE_WEBHOOK_SECRET;
        else
            process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    });

    it('createCheckoutSession returns id and url from Stripe client', async () => {
        const mockClient = {
            checkout: {
                sessions: {
                    create: async (params) => {
                        assert.equal(params.mode, 'payment');
                        assert.equal(params.payment_method_types, undefined);
                        return { id: 'cs_test_123', url: 'https://checkout.stripe.com/pay/cs_test_123' };
                    }
                }
            }
        };

        const stripe = new SimpleMVCStripe(mockClient);
        const result = await stripe.createCheckoutSession({
            lineItems: [{ price: 'price_abc' }],
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel'
        });

        assert.deepEqual(result, {
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/pay/cs_test_123'
        });
    });

    it('getClient throws when STRIPE_SECRET_KEY is missing', () => {
        delete process.env.STRIPE_SECRET_KEY;
        const stripe = new SimpleMVCStripe();
        assert.throws(() => stripe.getClient(), /STRIPE_SECRET_KEY/);
    });

    it('verifyWebhook uses webhook secret from environment', () => {
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        let capturedArgs;
        const mockClient = {
            webhooks: {
                constructEvent: (...args) => {
                    capturedArgs = args;
                    return { type: 'checkout.session.completed', data: { object: {} } };
                }
            }
        };

        const stripe = new SimpleMVCStripe(mockClient);
        const event = stripe.verifyWebhook(Buffer.from('{}'), 'sig_header');

        assert.equal(capturedArgs[2], 'whsec_test');
        assert.equal(event.type, 'checkout.session.completed');
    });

    it('verifyWebhook throws when STRIPE_WEBHOOK_SECRET is missing', () => {
        delete process.env.STRIPE_WEBHOOK_SECRET;
        const stripe = new SimpleMVCStripe({ webhooks: { constructEvent: () => ({}) } });
        assert.throws(
            () => stripe.verifyWebhook(Buffer.from('{}'), 'sig'),
            /STRIPE_WEBHOOK_SECRET/
        );
    });

    describe('createWebhookHandler', () => {
        let stripe;
        let mockClient;

        beforeEach(() => {
            process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
            mockClient = {
                webhooks: {
                    constructEvent: (body, signature, secret) => {
                        if (signature === 'bad')
                            throw new Error('Invalid signature');
                        return {
                            type: 'checkout.session.completed',
                            data: { object: { id: 'cs_123' } }
                        };
                    }
                }
            };
            stripe = new SimpleMVCStripe(mockClient);
        });

        it('returns 400 when signature verification fails', async () => {
            const app = new SimpleMVCApp();
            app.registerStripeWebhook('/webhooks/stripe', stripe.createWebhookHandler({}));

            const response = await request(app.express)
                .post('/webhooks/stripe')
                .set('stripe-signature', 'bad')
                .set('Content-Type', 'application/json')
                .send('{}');

            assert.equal(response.status, 400);
        });

        it('returns 200 and invokes handler for verified events', async () => {
            const app = new SimpleMVCApp();
            let handledSessionId;
            app.registerStripeWebhook('/webhooks/stripe', stripe.createWebhookHandler({
                'checkout.session.completed': async (event) => {
                    handledSessionId = event.data.object.id;
                }
            }));

            const response = await request(app.express)
                .post('/webhooks/stripe')
                .set('stripe-signature', 'valid')
                .set('Content-Type', 'application/json')
                .send('{}');

            assert.equal(response.status, 200);
            assert.deepEqual(response.body, { received: true });
            assert.equal(handledSessionId, 'cs_123');
        });
    });
});
