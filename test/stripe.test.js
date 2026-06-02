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

    it('getSubscription retrieves subscription by id', async () => {
        let capturedId;
        let capturedOptions;
        const stripe = new SimpleMVCStripe({
            subscriptions: {
                retrieve: async (id, options) => {
                    capturedId = id;
                    capturedOptions = options;
                    return { id, items: { data: [] } };
                }
            }
        });

        const sub = await stripe.getSubscription('sub_abc', { expand: ['items.data.price'] });
        assert.equal(sub.id, 'sub_abc');
        assert.equal(capturedId, 'sub_abc');
        assert.deepEqual(capturedOptions, { expand: ['items.data.price'] });
    });

    it('getSubscription throws when subscriptionId is missing', async () => {
        const stripe = new SimpleMVCStripe({ subscriptions: { retrieve: async () => ({}) } });
        await assert.rejects(() => stripe.getSubscription(''), /subscriptionId/);
    });

    it('updateSubscriptionPrice updates subscription with proration defaults', async () => {
        let capturedUpdate;
        const stripe = new SimpleMVCStripe({
            subscriptions: {
                retrieve: async () => ({ items: { data: [{ id: 'si_123' }] } }),
                update: async (id, params) => {
                    capturedUpdate = { id, params };
                    return { id, ...params };
                }
            }
        });

        await stripe.updateSubscriptionPrice('sub_123', { newPriceId: 'price_pro' });
        assert.deepEqual(capturedUpdate, {
            id: 'sub_123',
            params: {
                items: [{ id: 'si_123', price: 'price_pro' }],
                proration_behavior: 'create_prorations',
                billing_cycle_anchor: 'unchanged'
            }
        });
    });

    it('updateSubscriptionPrice respects explicit item and options', async () => {
        let capturedUpdate;
        const stripe = new SimpleMVCStripe({
            subscriptions: {
                retrieve: async () => ({ items: { data: [] } }),
                update: async (id, params) => {
                    capturedUpdate = { id, params };
                    return { id, ...params };
                }
            }
        });

        await stripe.updateSubscriptionPrice('sub_321', {
            subscriptionItemId: 'si_999',
            newPriceId: 'price_basic',
            prorationBehavior: 'none',
            billingCycleAnchor: 'now'
        });
        assert.deepEqual(capturedUpdate, {
            id: 'sub_321',
            params: {
                items: [{ id: 'si_999', price: 'price_basic' }],
                proration_behavior: 'none',
                billing_cycle_anchor: 'now'
            }
        });
    });

    it('updateSubscriptionPrice throws when newPriceId is missing', async () => {
        const stripe = new SimpleMVCStripe({
            subscriptions: { retrieve: async () => ({ items: { data: [{ id: 'si_123' }] } }), update: async () => ({}) }
        });
        await assert.rejects(() => stripe.updateSubscriptionPrice('sub_123', {}), /newPriceId/);
    });

    it('scheduleSubscriptionPriceChange creates and updates subscription schedule', async () => {
        let scheduleCreateParams;
        let scheduleUpdate;
        const stripe = new SimpleMVCStripe({
            subscriptions: {
                retrieve: async () => ({
                    current_period_start: 1700000000,
                    current_period_end: 1702592000,
                    items: { data: [{ price: { id: 'price_basic' }, quantity: 1 }] }
                })
            },
            subscriptionSchedules: {
                create: async (params) => {
                    scheduleCreateParams = params;
                    return { id: 'sub_sched_123' };
                },
                update: async (id, params) => {
                    scheduleUpdate = { id, params };
                    return { id, ...params };
                }
            }
        });

        await stripe.scheduleSubscriptionPriceChange('sub_123', { newPriceId: 'price_pro' });
        assert.deepEqual(scheduleCreateParams, { from_subscription: 'sub_123' });
        assert.equal(scheduleUpdate.id, 'sub_sched_123');
        assert.equal(scheduleUpdate.params.end_behavior, 'release');
        assert.equal(scheduleUpdate.params.phases[1].items[0].price, 'price_pro');
    });

    it('scheduleSubscriptionPriceChange throws when newPriceId is missing', async () => {
        const stripe = new SimpleMVCStripe({
            subscriptions: { retrieve: async () => ({ items: { data: [{ price: { id: 'price_basic' } }] } }) },
            subscriptionSchedules: { create: async () => ({ id: 'sub_sched_123' }), update: async () => ({}) }
        });
        await assert.rejects(() => stripe.scheduleSubscriptionPriceChange('sub_123', {}), /newPriceId/);
    });

    it('cancelSubscription sets cancel_at_period_end by default', async () => {
        let capturedId;
        let capturedParams;
        const mockClient = {
            subscriptions: {
                update: async (id, params) => {
                    capturedId = id;
                    capturedParams = params;
                    return { id, cancel_at_period_end: true, status: 'active' };
                },
                cancel: async () => {
                    throw new Error('cancel should not be called');
                }
            }
        };

        const stripe = new SimpleMVCStripe(mockClient);
        const subscription = await stripe.cancelSubscription('sub_123');

        assert.equal(capturedId, 'sub_123');
        assert.deepEqual(capturedParams, { cancel_at_period_end: true });
        assert.equal(subscription.cancel_at_period_end, true);
    });

    it('cancelSubscription cancels immediately when cancelAtPeriodEnd is false', async () => {
        let capturedId;
        const mockClient = {
            subscriptions: {
                update: async () => {
                    throw new Error('update should not be called');
                },
                cancel: async (id) => {
                    capturedId = id;
                    return { id, status: 'canceled' };
                }
            }
        };

        const stripe = new SimpleMVCStripe(mockClient);
        const subscription = await stripe.cancelSubscription('sub_456', { cancelAtPeriodEnd: false });

        assert.equal(capturedId, 'sub_456');
        assert.equal(subscription.status, 'canceled');
    });

    it('cancelSubscription throws when subscriptionId is missing', async () => {
        const stripe = new SimpleMVCStripe({ subscriptions: { update: async () => ({}), cancel: async () => ({}) } });
        await assert.rejects(() => stripe.cancelSubscription(''), /subscriptionId/);
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
