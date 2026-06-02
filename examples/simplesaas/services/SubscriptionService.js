const PLANS = require('../config/plans.js');
const { getUserModel } = require('../../../src/simplemvc.db.js');

function appUrl() {
    if (process.env.APP_URL)
        return process.env.APP_URL.replace(/\/$/, '');
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || 8080;
    return `http://${host}:${port}`;
}

class SubscriptionService {
    constructor(membership, stripe) {
        this.membership = membership;
        this.stripe = stripe;
    }

    getPlan(user) {
        return user?.profile?.plan || 'free';
    }

    hasActivePaidPlan(user) {
        const plan = this.getPlan(user);
        if (plan === 'free')
            return false;
        const status = user?.profile?.subscriptionStatus;
        return !status || status === 'active' || status === 'canceling';
    }

    canCancel(user) {
        const plan = this.getPlan(user);
        if (plan === 'free')
            return false;
        const status = user?.profile?.subscriptionStatus;
        return status === 'active' && user?.profile?.stripeSubscriptionId;
    }

    async startCheckout(user, planKey) {
        const plan = PLANS[planKey];
        if (!plan?.priceEnv)
            throw new Error('Invalid plan');

        if (this.hasActivePaidPlan(user))
            throw new Error('Already subscribed');

        const priceId = process.env[plan.priceEnv];
        if (!priceId)
            throw new Error(`${plan.priceEnv} is not configured`);

        const baseUrl = appUrl();
        const options = {
            mode: 'subscription',
            lineItems: [{ price: priceId, quantity: 1 }],
            successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${baseUrl}/pricing`,
            customerEmail: user.email,
            clientReferenceId: String(user.id),
            metadata: { userId: String(user.id), plan: planKey },
            subscriptionData: { metadata: { userId: String(user.id), plan: planKey } }
        };

        if (user.profile?.stripeCustomerId)
            options.customerId = user.profile.stripeCustomerId;

        return this.stripe.createCheckoutSession(options);
    }

    async fulfillCheckout(session) {
        const userId = session.metadata?.userId || session.client_reference_id;
        const plan = session.metadata?.plan;
        if (!userId || !plan)
            return;

        await this.membership.updateUserProfile(Number(userId), {
            plan,
            stripeCustomerId: session.customer ? String(session.customer) : '',
            stripeSubscriptionId: session.subscription ? String(session.subscription) : '',
            subscriptionStatus: 'active',
            cancelAtPeriodEnd: 'false'
        });
    }

    async findUserBySubscriptionId(subscriptionId) {
        const User = getUserModel();
        const rows = await User.findAll();
        for (const row of rows) {
            if (row.profile?.stripeSubscriptionId === subscriptionId)
                return this.membership.convertUser(row);
        }
    }

    async handleSubscriptionUpdated(subscription) {
        const user = await this.findUserBySubscriptionId(subscription.id);
        if (!user)
            return;

        let subscriptionStatus = 'active';
        if (subscription.cancel_at_period_end)
            subscriptionStatus = 'canceling';
        else if (subscription.status !== 'active')
            subscriptionStatus = String(subscription.status);

        await this.membership.updateUserProfile(user.id, {
            subscriptionStatus,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ? 'true' : 'false'
        });
    }

    async handleSubscriptionDeleted(subscription) {
        const user = await this.findUserBySubscriptionId(subscription.id);
        if (!user)
            return;

        await this.membership.updateUserProfile(user.id, {
            plan: 'free',
            stripeSubscriptionId: '',
            subscriptionStatus: 'canceled',
            cancelAtPeriodEnd: 'false'
        });
    }

    async cancelRebill(userId) {
        const user = await this.membership.getUser(userId);
        if (!user)
            throw new Error('User not found');

        const subscriptionId = user.profile?.stripeSubscriptionId;
        if (!subscriptionId)
            throw new Error('No subscription');

        await this.stripe.cancelSubscription(subscriptionId);
        await this.membership.updateUserProfile(userId, {
            subscriptionStatus: 'canceling',
            cancelAtPeriodEnd: 'true'
        });
    }
}

module.exports = SubscriptionService;
