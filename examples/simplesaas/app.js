const SimpleMVC = require('../../src/simplemvc.js');
const PLANS = require('./config/plans.js');
const { planList } = require('./config/plans.js');
const SubscriptionService = require('./services/SubscriptionService.js');
const AdminService = require('./services/AdminService.js');

const membership = new SimpleMVC.Membership();
const stripe = new SimpleMVC.Stripe();
const subscriptions = new SubscriptionService(membership, stripe);
const admin = new AdminService(membership);

async function refreshSessionUser(req) {
    if (!req.session.user)
        return;
    const user = await membership.getUser(req.session.user.id);
    if (user)
        req.session.user = user;
}

function isAdminEmail(email) {
    const adminEmail = process.env.ADMIN_EMAIL;
    return adminEmail && email === adminEmail;
}

function buildAccountViewModel(user) {
    const plan = subscriptions.getPlan(user);
    const planChanges = subscriptions.getAvailablePlanChanges(user);
    return {
        user,
        plan,
        planDetails: PLANS[plan] || PLANS.free,
        subscriptionStatus: user.profile?.subscriptionStatus || '-',
        pendingPlan: user.profile?.pendingPlan || '',
        pendingPlanEffective: user.profile?.pendingPlanEffective || '',
        canCancel: subscriptions.canCancel(user),
        hasPaidPlan: subscriptions.hasActivePaidPlan(user),
        hasPlanChanges: planChanges.length > 0,
        planChanges
    };
}

const mainController = new SimpleMVC.Controller('/', {
    '': function () {
        return this.view('index', { plans: planList });
    },
    'pricing': async function (req) {
        await refreshSessionUser(req);
        const currentPlan = req.session.user ? subscriptions.getPlan(req.session.user) : null;
        const canSubscribe = req.session.user && currentPlan === 'free';
        const hasPaidPlan = req.session.user ? subscriptions.hasActivePaidPlan(req.session.user) : false;
        const plans = planList.map(plan => ({
            ...plan,
            isCurrent: plan.key === currentPlan,
            showSubscribe: canSubscribe && plan.key !== 'free',
            showRegister: !req.session.user && plan.key === 'free',
            showLogin: !req.session.user && plan.key !== 'free',
            showManageOnAccount: hasPaidPlan && !canSubscribe && plan.key !== currentPlan
        }));
        return this.view('pricing', { plans, currentPlan, hasPaidPlan });
    },
    'register': {
        get: function () {
            return this.view('register');
        },
        post: async function (req) {
            const user = await membership.addUser(req.fields.email, req.fields.password, { plan: 'free' });
            if (!user) {
                return this.view('register', {
                    message: { color: 'red', text: 'That email is already registered.' }
                });
            }
            return this.view('register', {
                message: { color: 'green', text: 'Account created. You can log in now.' }
            });
        }
    },
    'login': {
        get: function () {
            return this.view('login');
        },
        post: async function (req) {
            const user = await membership.validateUser(req.fields.email, req.fields.password);
            if (!user) {
                return this.view('login', {
                    message: { color: 'red', text: 'Invalid credentials. Please try again.' }
                });
            }
            req.session.user = user;
            if (isAdminEmail(user.email))
                req.session.isAdmin = true;
            return this.redirect('/account');
        }
    },
    'logout': function (req) {
        req.session.destroy(() => {});
        return this.redirect('/');
    },
    'success': async function (req) {
        if (!req.query.session_id)
            return this.redirect('/pricing');

        const session = await stripe.getCheckoutSession(req.query.session_id);
        await refreshSessionUser(req);
        return this.view('success', {
            sessionId: session.id,
            status: session.payment_status,
            plan: session.metadata?.plan
        });
    }
});

const protectedController = new SimpleMVC.Controller('/', {
    'account': async function (req) {
        await refreshSessionUser(req);
        return this.view('account', buildAccountViewModel(req.session.user));
    },
    'checkout/basic': {
        post: async function (req) {
            try {
                const session = await subscriptions.startCheckout(req.session.user, 'basic');
                return this.redirect(session.url);
            } catch (ex) {
                return this.redirect('/pricing');
            }
        }
    },
    'checkout/pro': {
        post: async function (req) {
            try {
                const session = await subscriptions.startCheckout(req.session.user, 'pro');
                return this.redirect(session.url);
            } catch (ex) {
                return this.redirect('/pricing');
            }
        }
    },
    'account/cancel': {
        post: async function (req) {
            try {
                await subscriptions.cancelRebill(req.session.user.id);
                await refreshSessionUser(req);
                return this.view('account', {
                    ...buildAccountViewModel(req.session.user),
                    message: { color: 'green', text: 'Your subscription will cancel at the end of the billing period.' }
                });
            } catch (ex) {
                return this.redirect('/account');
            }
        }
    },
    'account/upgrade/:plan': {
        post: async function (req) {
            try {
                await subscriptions.changePlanNow(req.session.user.id, req.params.plan);
                await refreshSessionUser(req);
                return this.view('account', {
                    ...buildAccountViewModel(req.session.user),
                    message: { color: 'green', text: 'Plan upgraded immediately with proration.' }
                });
            } catch (ex) {
                return this.redirect('/account');
            }
        }
    },
    'account/downgrade/:plan': {
        post: async function (req) {
            try {
                await subscriptions.schedulePlanDowngrade(req.session.user.id, req.params.plan);
                await refreshSessionUser(req);
                return this.view('account', {
                    ...buildAccountViewModel(req.session.user),
                    message: { color: 'green', text: 'Downgrade scheduled for the end of your billing period.' }
                });
            } catch (ex) {
                return this.redirect('/account');
            }
        }
    }
});

protectedController.beforeRoute = function (req) {
    if (!req.session.user)
        return this.redirect('/login');
};

protectedController.allowExternalRedirects = true;

const adminController = new SimpleMVC.Controller('/admin/', {
    '': async function () {
        const users = await admin.listUsers();
        const rows = users.map(user => {
            const plan = user.profile?.plan || 'free';
            return {
                id: user.id,
                email: user.email,
                plan,
                subscriptionStatus: user.profile?.subscriptionStatus || '—',
                planOptions: planList.map(p => ({
                    key: p.key,
                    name: p.name,
                    selected: p.key === plan
                }))
            };
        });
        return this.view('index', { users: rows, plans: planList });
    },
    'user/:id/delete': {
        post: async function (req) {
            await admin.deleteUser(Number(req.params.id));
            return this.redirect('/admin');
        }
    },
    'user/:id/plan': {
        post: async function (req) {
            const plan = req.fields.plan;
            if (PLANS[plan])
                await admin.setPlan(Number(req.params.id), plan);
            return this.redirect('/admin');
        }
    }
});

adminController.beforeRoute = function (req) {
    if (!req.session.isAdmin)
        return this.redirect('/login');
};

(async () => {
    const app = new SimpleMVC.App();

    app.registerStripeWebhook('/webhooks/stripe', stripe.createWebhookHandler({
        'checkout.session.completed': async (event) => {
            await subscriptions.fulfillCheckout(event.data.object);
        },
        'customer.subscription.updated': async (event) => {
            await subscriptions.handleSubscriptionUpdated(event.data.object);
        },
        'customer.subscription.deleted': async (event) => {
            await subscriptions.handleSubscriptionDeleted(event.data.object);
        }
    }));

    app.addControllers(mainController, protectedController, adminController);
    await app.initDatabase();
    await app.initSessions();
    app.initStaticFiles('static');
    app.listen();
})();
