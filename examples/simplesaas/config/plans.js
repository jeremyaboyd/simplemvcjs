const PLANS = {
    free: {
        key: 'free',
        name: 'Free',
        priceEnv: null,
        price: '$0',
        features: ['Demo dashboard access', 'Up to 3 widgets']
    },
    basic: {
        key: 'basic',
        name: 'Basic',
        priceEnv: 'STRIPE_PRICE_BASIC',
        price: '$9/mo',
        features: ['Up to 25 widgets', 'Email support']
    },
    pro: {
        key: 'pro',
        name: 'Pro',
        priceEnv: 'STRIPE_PRICE_PRO',
        price: '$29/mo',
        features: ['Unlimited widgets', 'Priority support']
    }
};

module.exports = PLANS;
module.exports.planList = Object.values(PLANS);
