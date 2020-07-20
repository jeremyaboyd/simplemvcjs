## SimpleMVC.js
A highly opinionated MVC micro web-framework for Node.js

### Quick Start
This quick start assume a slight familiarity with Node.js and how to structure a project
1. Initialize your NPM package

	`npm init`, and fill out the questions
2. Include simplemvc.js in your project
    1. You can do this through npm ***(not supported currently)***
    
         `npm install simplemvcjs`
    2. Or by [downloading](#) and including simplemvc.js manually in your project.
3. Create and/or open app.js
4. Import/Require SimpleMVC
	
	`const SimpleMVC = require('simplemvcjs')`
	
	or if you downloaded the project
	
	`const SimpleMVC = require('/path/to/simplemvc.js')`
5. Create your first SimpleMVC.Controller
	```js
	const HomeController = new SimpleMVC.Controller("/", {
		"": function() {
			return this.content("Hello, World!");
		}
	});
	```
6. Create your your SimpleMVC.App
	```js
	const app = new SimpleMVC.App();
	app.addControlers(HomeController);
	app.listen();
	```
7. Create your `dotenv` file
	```ini
	#server
	HOST=localhost
	PORT=8080
	SESSION_SECRET=\Qvu$-pN84PfeJ>~sW

	#database
	MONGO_USER=
	MONGO_PASSWORD=
	MONGO_SERVER=
	MONGO_DB=

	#smtp
	SMTP_USER=
	SMTP_PASSWORD=
	SMTP_SERVER=
	SMTP_PORT=
	```
8. Run it via `node ./app.js`

### Project Structure
While SimpleMVC is highly opinionated, we have a relatively lax project structure requirement. There is a specific structure for the core files required.
```
/.env       - this is the dotenv file the sets your application's global variables
/app.js     - this can be any name, but throughout documentation it will be refered to as your app.js
/src/views  - the root directory for your view templates
/src/static - the root directory for your static files
```
These directories would be relative to your `app.js` file and are required for finding specific views and static content.

### Routing
Routing in SimpleMVC is defined by the combination of a base path (the first constructor parameter) and a routes dictionary (the second constructor parameter), and can then be expanded after initialization through the `Controller.addRoutes()` function.

Individual routes are defined as such:
```js
{
	"route/path": function(req, res) {
		const model = { someProperty: "some value" };
		return this.view('viewName', model);
	}
}
```
In the previous example, if the controller's base path was defined as `"/"`, the route would be `/route/path` and the view file would be located at `./src/views/viewName`.
### Views
Views are [Mustache(5)](https://mustache.github.io/mustache.5.html) templates. And when you return a view with a model from your route, the model will be accessed as  {{model}} inside the Mustache templates.

All views need the `.mustache` file extension.

### Other Responses

### Road Map
