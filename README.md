# SimpleMVC.js
A highly opinionated MVC micro web-framework for Node.js

## Examples
1. [Simple Blog](https://github.com/jeremyaboyd/simplemvcjs/tree/master/examples/simpleblog)

    Shows the basic use of routing, views, static files, and the SimpleMVC.SMTP class.
2. Simple SaaS - Coming Soon

    Utilizes all parts of the SimpleMVC library (routing, views, json responses, static files, SMTP, and Membership)
3. [Shortlinker](https://github.com/jeremyaboyd/simplemvcjs/tree/master/examples/shortlinks)

## Quick Start
This quick start assumes atleast a base familiarity with Node.js, NPM, and how to build a website.
1. Initialize your NPM package

	`npm init`, and fill out the questions
2. Include simplemvc.js in your project
    1. By [downloading](https://raw.githubusercontent.com/jeremyaboyd/simplemvcjs/master/src/simplemvc.js) and including simplemvc.js manually in your project.
    2. Through npm by running `npm install simplemvcjs`
3. Create and open `app.js` (needed for steps 4-6)
4. Import SimpleMVC
	
	`const SimpleMVC = require('simplemvcjs');`
	
	or if you downloaded the project:
	
	`const SimpleMVC = require('/path/to/simplemvc.js');`
5. Create your first SimpleMVC.Controller
	```js
	const HomeController = new SimpleMVC.Controller("/", {
	    "": function() {
	        return this.text("Hello, World!");
	    }
	});
	```
6. Create your SimpleMVC.App
	```js
	const app = new SimpleMVC.App();
	app.addControllers(HomeController);
	app.listen();
	```
7. Create the `.env` file
	```ini
	#server
	HOST=localhost
	PORT=8080
	SESSION_SECRET=

	#database
	MONGO_SCHEME=
	MONGO_USER=
	MONGO_PASSWORD=
	MONGO_SERVER=
	MONGO_DB=

	#smtp
	SMTP_USER=
	SMTP_PASS=
	SMTP_HOST=
	SMTP_PORT=
	SMTP_SECURE=
	```
8. Run it via `node ./app.js`

## Project Structure
While SimpleMVC is highly opinionated, we have a relatively lax project structure requirement. There is a specific structure for the core files required.
```
/.env       - this is the dotenv file the sets your application's global variables
/app.js     - this can be any name, but throughout documentation it will be refered to as app.js
/views/     - the root directory for your view templates
/static/    - the root directory for your static files - can be renamed with app.initStaticFiles('/path/to/static/files');
```
These directories would be relative to your `app.js` file and are required for finding specific views and static content.

### Routing
Routing in SimpleMVC is defined by the combination of a base path (the first constructor parameter) and a routes dictionary (the second constructor parameter), and can then be expanded after initialization through the `Controller.addRoutes()` function.
```js
const HomeController = new SimpleMVC.Controller("/", {
    "": function() {
       return this.view('index');
    }
})
```

Individual routes are defined as such:
```js
HomeController.addRoutes({
   "route/path": function(req, res) {
        const model = { someProperty: "some value" };
        return this.view('viewName', model);
    }
});
```
In the previous example, if the controller's base path was defined as `"/"`, the route would be `/route/path` and the view file would be located at `./src/views/viewName`.
### Views
Views are [Mustache(5)](https://mustache.github.io/mustache.5.html) templates. And when you return a view with a model from your route, the model will be accessed as  {{model}} inside the Mustache templates.

All views need a `.html` file extension.

## A Simple Example
```js
const SimpleMVC = require('../libs/simplemvc.js');
const BlogService = require('./services/BlogService.js');

const HomeController = new SimpleMVC.Controller("/", {
    "": async function () {
        const latestPosts = await BlogService.getPostsDesc(0, 10);
        let view = {
            title: "My Website",
            posts: latestPosts,
        };
        return this.view('index', view);
    },
    "post/:id": async function (req) {
        const post = await BlogService.getPost(req.params.id);
        return this.view('single', post);
    },
    "about": function () {
        return this.view('about', { title: "About Me" });
    }
});

const app = new SimpleMVC.App();
app.initDbConnection();
app.addControllers(HomeController);
app.listen();
```