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

    getPlanRank(planKey) {
        return PLANS[planKey]?.rank ?? 0;
    }

    getPriceIdForPlan(planKey) {
        const plan = PLANS[planKey];
        if (!plan?.priceEnv)
            return;
        return process.env[plan.priceEnv];
    }

    getPlanByPriceId(priceId) {
        if (!priceId)
            return 'free';
        for (const [planKey, plan] of Object.entries(PLANS)) {
            if (!plan.priceEnv)
                continue;
            if (process.env[plan.priceEnv] === priceId)
                return planKey;
        }
        return 'free';
    }

    getAvailablePlanChanges(user) {
        const currentPlan = this.getPlan(user);
        const currentRank = this.getPlanRank(currentPlan);
        return Object.values(PLANS)
            .filter(plan => plan.key !== 'free' && plan.key !== currentPlan)
            .map(plan => ({
                ...plan,
                isUpgrade: plan.rank > currentRank,
                isDowngrade: plan.rank < currentRank
            }))
            .filter(plan => plan.isUpgrade || plan.isDowngrade);
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

    async getActiveSubscriptionForUser(user) {
        const subscriptionId = user?.profile?.stripeSubscriptionId;
        if (!subscriptionId)
            throw new Error('No subscription');

        const subscription = await this.stripe.getSubscription(subscriptionId, {
            expand: ['items.data.price']
        });
        const item = subscription?.items?.data?.[0];
        if (!item?.id)
            throw new Error('Subscription item not found');

        return { subscription, item };
    }

    async changePlanNow(userId, targetPlan) {
        const user = await this.membership.getUser(userId);
        if (!user)
            throw new Error('User not found');
        if (!PLANS[targetPlan] || targetPlan === 'free')
            throw new Error('Invalid plan');

        const currentPlan = this.getPlan(user);
        if (this.getPlanRank(targetPlan) <= this.getPlanRank(currentPlan))
            throw new Error('Target plan must be an upgrade');

        const newPriceId = this.getPriceIdForPlan(targetPlan);
        if (!newPriceId)
            throw new Error('Price ID is not configured');

        const { subscription, item } = await this.getActiveSubscriptionForUser(user);
        await this.stripe.updateSubscriptionPrice(subscription.id, {
            subscriptionItemId: item.id,
            newPriceId,
            prorationBehavior: 'create_prorations',
            billingCycleAnchor: 'unchanged'
        });

        await this.membership.updateUserProfile(userId, {
            plan: targetPlan,
            pendingPlan: '',
            pendingPlanEffective: '',
            subscriptionStatus: 'active',
            cancelAtPeriodEnd: 'false'
        });
    }

    async schedulePlanDowngrade(userId, targetPlan) {
        const user = await this.membership.getUser(userId);
        if (!user)
            throw new Error('User not found');
        if (!PLANS[targetPlan] || targetPlan === 'free')
            throw new Error('Invalid plan');

        const currentPlan = this.getPlan(user);
        if (this.getPlanRank(targetPlan) >= this.getPlanRank(currentPlan))
            throw new Error('Target plan must be a downgrade');

        const newPriceId = this.getPriceIdForPlan(targetPlan);
        if (!newPriceId)
            throw new Error('Price ID is not configured');

        const { subscription } = await this.getActiveSubscriptionForUser(user);
        await this.stripe.scheduleSubscriptionPriceChange(subscription.id, { newPriceId });

        await this.membership.updateUserProfile(userId, {
            pendingPlan: targetPlan,
            pendingPlanEffective: 'period_end',
            subscriptionStatus: 'active',
            cancelAtPeriodEnd: 'false'
        });
    }

    async handleSubscriptionUpdated(subscription) {
        const user = await this.findUserBySubscriptionId(subscription.id);
        if (!user)
            return;

        const activePriceId = subscription?.items?.data?.[0]?.price?.id;
        const effectivePlan = this.getPlanByPriceId(activePriceId);
        const pendingPlan = user.profile?.pendingPlan;
        const shouldClearPending = pendingPlan && pendingPlan === effectivePlan;

        let subscriptionStatus = 'active';
        if (subscription.cancel_at_period_end)
            subscriptionStatus = 'canceling';
        else if (subscription.status !== 'active')
            subscriptionStatus = String(subscription.status);

        await this.membership.updateUserProfile(user.id, {
            plan: effectivePlan || user.profile?.plan || 'free',
            subscriptionStatus,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ? 'true' : 'false',
            pendingPlan: shouldClearPending ? '' : (pendingPlan || ''),
            pendingPlanEffective: shouldClearPending ? '' : (user.profile?.pendingPlanEffective || '')
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
            cancelAtPeriodEnd: 'false',
            pendingPlan: '',
            pendingPlanEffective: ''
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
