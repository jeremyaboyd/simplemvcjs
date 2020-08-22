# SimpleMVC.js Documentation
This documentation is for a ***pre-release*** version of SimpleMVC.js. Any of the function signatures can change from one commit to the next, and may fall out of sync with this documentation.

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

### `App.initDbConnection()`
Initializes the MongoDB database connection, and `mongoose` data context using the `MONGO_*` environment variables.

```js
app.initDbConnection();
```

### `App.initSessions()`
Intializes the Session middleware.

```js
app.initSessions();
```

> NOTE: If the database connection has been previously intialised, session state will be stored in the collection `simple_sessions`, otherwise it will be stored only in memory.

> NOTE: due to a known/purposeful memory leak in the default memory store used by `express-session` it is recommended that you initialize the database first in a production environment. This also gives you an added bonus of being able to scale your application horizontally as well.

### `App.initStaticFiles(path: string)`
Adds a file route for http://{host}:{port}/* to be run after no other routes are found. This route will then look for files to be delivered stored at the relative path provided by the `path` parameter.

```js
app.initStaticFiles('static');
```

> NOTE: This should be called only AFTER all controllers have been added.

## SimpleMVC.Controller
The Controller class contains the logic for creating containered routes.

### `Controller.constructor(basePath: string, routes: { string: [function | { http_verb: function }] }?)`
Initializes the routes for a controller.

The optional `routes` parameter takes a dictionary where the key is a path relative to the `basePath` parameter, and the value is either a `function`, or another dictionary with an `HTTP VERB` for the key and a `function` for the value.

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
    if(!req.session.user || !request.session.user.profile.isAdmin)
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
Returns an HTTP 302 Redirect to the url/path provided in the `url` paremeter.

The redirect url can be:
* A fully qualified `URI`

    ```js
    return this.redirect('https://google.com');
    ```
* An absolue path

    ```js
    return this.redirect('/auth/login');
    ```
* A relative path

    ```js
    return this.redirect('../new');
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

## SimpleMVC.Membership
The Membership service contains various helper methods for enabling authentication on an application.

>NOTE: The Membership service requires the database to be initialized, and stores users in the `simple_users` collection.

Most functions return a `User` object, which is defined as:
```js
{
    id: ObjectId,
    email: String,
    profile: { String: String }
}
```

### `Membership.constructor()`
Initializes the Membership service and underlying database model.

### `Membership.addUser(email, password, profile)`
Creates a user. Returns the new user if creation was successful.

### `Membership.deleteUser(id)`
Delete a user from the collection.

### `Membership.getUser(id)`
Retrieve a user from the collection by their id.

### `Membership.getUserByEmail(email)`
Retrieve a user from the collection by their email.

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
const user = membership.addUser(req.fields.email, req.fields.password, { name: req.fields.name });
if(user)
    membership.sendActivation(user.id, 'John Q. Public <jqp@example.com>', 'Activate your account', 'Here is your activation code: {{activationCode}}');
```

>NOTE: Uses the SMTP Service, so it requires the `SMTP_*` environment variable to have been set.

### `Membership.activateUser(email, activationCode)`
Attempts to activate the user's account by matching the `activationCode` parameter to the `user.profile.activationCode` property. Returns `true` if successful.

```js
...
    "activate": {
        get: function(req) {
            if(membership.activateUser(req.query.email, req.query.activationCode)) {
                return this.view('activation/success');
            }

            return this.view('activation/error');
        }
    }
...
```