# SimpleMVC.js Documentation
This documentation targets SimpleMVC.js **0.10.2+**. Copy [`.env.example`](.env.example) when configuring a new application.

### Adding the SimpleMVC package to your application
1. Install the `simplemvcjs` package from npm (or download it manually).

    ```
    npm install simplemvcjs
    ```
2. Create the reference to SimpleMVC by requiring the package

    ```js
    const SimpleMVC = require('simplemvcjs');
    ```

## SimpleMVC.App
The App class is the foundation of SimpleMVC.js.

It encapsulates the http server, controller routing, sessions, static files, and database initialization.

### `App.constructor()`
Initializes the various components for the base application to function.

```js
var app = new SimpleMVC.App();
```

### `App.addControllers(...controllers: SimpleMVCController[])`
Adds the individual controller routes to the http server. 

```js
app.addControllers(homeController, newsController, authController, accountController);
```
> NOTE: If the same route is defined in multiple actions only the first one is executed.

### `App.listen(host: string = process.env.HOST, port: int = process.env.PORT)`
Creates an http server that listens on http://{host}:{port}.

```js
app.listen('example.com', 8080);
```

> NOTE: If `host` or `port` parameters are falsey, the `HOST` or `PORT` environment variables will be used.

### `App.initDatabase()`
Initializes the SQL database connection using [Sequelize](https://sequelize.org/docs/v6/) and the `DB_*` environment variables. Creates framework tables (`simple_users`, `simple_sessions`) via `sync()`.

```js
await app.initDatabase();
```

### `App.initSessions()`
Initializes the Session middleware. Returns a `Promise` and **requires** `SESSION_SECRET` in the environment.

```js
await app.initSessions();
```

> NOTE: If the database connection has been previously initialised with `initDatabase()`, session state will be stored in the `simple_sessions` table, otherwise it will be stored only in memory.

> NOTE: due to a known/purposeful memory leak in the default memory store used by `express-session` it is recommended that you initialize the database first in a production environment. This also gives you an added bonus of being able to scale your application horizontally as well.

### `App.initStaticFiles(path: string)`
Adds a file route for http://{host}:{port}/* to be run after no other routes are found. This route will then look for files to be delivered stored at the path provided by the `path` parameter (absolute or relative to application root).

```js
app.initStaticFiles('static');
```

> NOTE: **Prior to version 0.9.7** This should be called only AFTER all controllers have been added.

## SimpleMVC.Controller
The Controller class contains the logic for creating containered routes.

### `Controller.constructor(basePath: string, routes: { string: [function | { http_verb: function }] }?)`
Initializes the routes for a controller.

The optional `routes` parameter takes a dictionary where the key is a path relative to the `basePath` parameter, and the value is either a `function`, or another dictionary with an `HTTP VERB` for the key and a `function` for the value.

When the value is a bare `function`, the route is registered for **GET** requests only. Use the verb dictionary form for `post`, `put`, and other methods.

```js
const homeController = new SimpleMVC.Controller('/', {
    "": function(req) {
        return this.text("hello, world!");
    },
    "name": {
        post: function(req) {
            return this.text(`hello, {req.fields.name}!`);
        }
    }
});
```

### `Controller.beforeRoute: function`
The `beforeRoute` property is a `function` that can be overwritten to provide logic that will be called prior to every route in the controller executing.

```js
adminController.beforeRoute = function(req) {
    if(!req.session.user || !req.session.user.profile.isAdmin)
        return this.redirect('/auth/login');
}
```

### `Controller.addRoutes(routes: { string: [function | { http_verb: function }] })`
Just like the constructor, the `routes` parameter takes a dictionary where the key is a path relative to the `basePath` parameter, and the value is either a `function`, or another dictionary with an `HTTP VERB` for the key and a `function` for the value.

This function could be useful if you want to optionally add routes based on a configuration.

```js
if(process.env.ADMIN_DIAGNOSTICS) {
    adminController.addRoutes({
        "diagnostics": function(req) {
            const report = adminService.getDiagnosticsReport();
            return this.view('diagnostics', report);
        }
    })
}
```

### `Controller.json(data: { }, status: int = 200)`
Returns an `application/json` response with the json object provided in the `data` parameter.

The optional `status` parameter defaults to 200 OK.

```js
return this.json({
    someProperty: 'some value'
});
```

### `Controller.redirect(url: string)`
Returns an HTTP 302 Redirect to the url/path provided in the `url` parameter.

By default, only **same-origin relative paths** starting with `/` are allowed (for example `/auth/login`). Protocol-relative URLs (`//evil.com`) and absolute external URLs are rejected.

To allow external redirects (for example short-link targets), set `controller.allowExternalRedirects = true` on that controller instance.

```js
return this.redirect('/auth/login');
```

### `Controller.text(text: string, status: int = 200)`
Returns a `text/plain` response with `text` parameter as the body of the response.

The optional `status` parameter defaults to 200 OK.

```js
return this.text('hello world')
```

### `Controller.view(view: string, model: { }, status: int = 200)`

Returns a `mustache` rendered view bound to the object in the `model` parameter.

```js
return this.view('index', {name: request.fields.name});
```

Views receive `{{model}}` for the route model and a limited `{{session}}` object (`user`, `admin`, `isAdmin` only). Route handlers still have full access to `req.session`.

## SimpleMVC.getSequelize()
Returns the shared Sequelize instance after `App.initDatabase()` has been called. Use this to define application-specific models in the same database.

```js
const { DataTypes } = require('sequelize');
const sequelize = SimpleMVC.getSequelize();
const Post = sequelize.define('Post', { title: DataTypes.STRING });
```

## SimpleMVC.Membership
The Membership service contains various helper methods for enabling authentication on an application.

>NOTE: The Membership service requires the database to be initialized, and stores users in the `simple_users` table.

Most functions return a `User` object, which is defined as:
```js
{
    id: Number,
    email: String,
    profile: { String: String }
}
```

### `Membership.constructor()`
Initializes the Membership service and underlying database model.

### `Membership.addUser(email, password, profile)`
Creates a user. Returns the new user if creation was successful.

### `Membership.deleteUser(id)`
Delete a user from the database.

### `Membership.getUser(id)`
Retrieve a user from the collection by their id.

### `Membership.getUserByEmail(email)`
Retrieve a user from the collection by their email.

### `Membership.listUsers({ limit, offset })`
Returns an array of users (without passwords). Defaults to `limit: 100`, `offset: 0`.

### `Membership.updateUserEmail(id, email)`
Updates the user's email.

### `Membership.updateUserPassword(id, password)`
Updates the user's password.

### `Membership.updateUserProfile(id, profileObject)`
Updates the user's profile.

>NOTE: Only updates the properties that are passed in. Currently there is no way to delete a profile property.

### `Membership.validateUser(email, password)`
Returns the user if the email and password match what is in the database.

### User Activation
User activation is optional. It creates 2 user profile properties called `activationCode` and `activatedOn`. If you wish to use the built in activation, do not override these values.
### `Membership.sendActivationEmail(id, from, subject, template)`
Sends an activation email to the email address in the collection for the user. The email is sent through the `SMTP Service`. The email is rendered from the mustache markup passed in through the `template` parameter.

```js
const user = await membership.addUser(req.fields.email, req.fields.password, { name: req.fields.name });
if (user)
    await membership.sendActivationEmail(user.id, 'John Q. Public <jqp@example.com>', 'Activate your account', 'Here is your activation code: {{activationCode}}');
```

>NOTE: Uses the SMTP Service, so it requires the `SMTP_*` environment variable to have been set.

### `Membership.activateUser(email, activationCode)`
Attempts to activate the user's account by matching the `activationCode` parameter to the `user.profile.activationCode` property. Returns `true` if successful.

```js
...
    "activate": {
        get: async function(req) {
            if (await membership.activateUser(req.query.email, req.query.code)) {
                return this.view('activation/success');
            }

            return this.view('activation/error');
        }
    }
...
```

## SimpleMVC.Stripe
The Stripe service wraps [Checkout Sessions](https://docs.stripe.com/payments/checkout) for one-time and subscription payments. It follows Stripe best practices: hosted Checkout, dynamic payment methods (no `payment_method_types` in API calls), and verified webhooks.

>NOTE: Requires `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in the environment. Prefer a [restricted API key](https://docs.stripe.com/keys/restricted-api-keys) (`rk_`) with only the permissions your app needs over a full secret key (`sk_`).

### Environment variables
| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server-side API key (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from your Stripe webhook endpoint |

### `Stripe.createCheckoutSession(options)`
Creates a hosted Checkout Session and returns `{ id, url }`. Redirect the user to `url` to complete payment.

Options:
- `mode` — `'payment'` (default) or `'subscription'`
- `lineItems` — `[{ price: 'price_...', quantity: 1 }]`
- `successUrl`, `cancelUrl` — required; use `{CHECKOUT_SESSION_ID}` in `successUrl` to retrieve the session later
- `customerEmail`, `customerId`, `clientReferenceId`, `metadata` — optional
- `subscriptionData` — optional, e.g. `{ trial_period_days: 14 }` when `mode` is `'subscription'`

Set `allowExternalRedirects = true` on your controller to redirect to Stripe-hosted Checkout.

```js
const stripe = new SimpleMVC.Stripe();

const controller = new SimpleMVC.Controller('/', {
    'checkout': {
        post: async function (req) {
            const session = await stripe.createCheckoutSession({
                lineItems: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
                successUrl: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${process.env.APP_URL}/pricing`,
                clientReferenceId: String(req.session.user?.id),
                metadata: { userId: String(req.session.user?.id) }
            });
            return this.redirect(session.url);
        }
    },
    'success': async function (req) {
        const session = await stripe.getCheckoutSession(req.query.session_id);
        return this.view('success', { sessionId: session.id, status: session.payment_status });
    }
});
controller.allowExternalRedirects = true;
```

### Subscription checkout
```js
const session = await stripe.createCheckoutSession({
    mode: 'subscription',
    lineItems: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    successUrl: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${process.env.APP_URL}/pricing`,
    subscriptionData: { trial_period_days: 14 }
});
```

### `Stripe.getCheckoutSession(sessionId, options)`
Retrieves a Checkout Session (e.g. on your success page). Pass `expand: ['line_items']` to include line item details.

### `Stripe.cancelSubscription(subscriptionId, options)`
Cancels a subscription. By default (`cancelAtPeriodEnd: true`) the subscription remains active until the end of the billing period. Pass `cancelAtPeriodEnd: false` to cancel immediately.

```js
await stripe.cancelSubscription(subscriptionId);
await stripe.cancelSubscription(subscriptionId, { cancelAtPeriodEnd: false });
```

### Webhooks
Register the webhook route on the App **before** `listen()`. The App skips body parsing on this path so Stripe signature verification works.

```js
const stripe = new SimpleMVC.Stripe();
const app = new SimpleMVC.App();

app.registerStripeWebhook('/webhooks/stripe', stripe.createWebhookHandler({
    'checkout.session.completed': async (event) => {
        const session = event.data.object;
        // Fulfill order using session.metadata or client_reference_id
    }
}));

app.addControllers(controller);
await app.initSessions();
app.listen();
```

### `Stripe.verifyWebhook(rawBody, signature)`
Low-level signature verification. Returns the parsed Stripe Event. Used internally by `createWebhookHandler`.