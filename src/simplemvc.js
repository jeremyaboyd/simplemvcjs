const express = require('express');
const mustache = require('mustache-express');
const formidable = require('express-formidable');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mongoose = require('mongoose');

require('dotenv').config();

class SimpleApp {
    express;
    __dirname = require('path').resolve();
    constructor() {
        this.express = express();

        this.express.use(formidable());
        this.express.use(cookieParser());
        this.express.use(session({ secret: process.env.SESSION_SECRET }));

        this.express.engine('mustache', mustache());
        this.express.set('view engine', 'mustache');
        this.express.set('views', this.__dirname + '/src/views');
    }

    addMiddleware(middleware) {
        this.express.use(middleware);
    }

    addControllers(...controllers) {
        controllers.forEach(controller => {
            if (controller instanceof SimpleController) {
                Object.keys(controller.routes).forEach((v) => {
                    const route = controller.routes[v];
                    const fullPath = controller.basePath + v;
                    if (typeof route === "function") {
                        this.express.get(fullPath, route);
                    } else {
                        if (route["get"])
                            this.express.get(fullPath, route.get);

                        if (route["post"])
                            this.express.post(fullPath, route.post);
                    }
                });
            }
        });
    }

    initDbConnection() {
        const {
            MONGO_SCHEME,
            MONGO_USER,
            MONGO_PASSWORD,
            MONGO_SERVER,
            MONGO_DB
        } = process.env;
        const connectionString = `${MONGO_SCHEME}://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_SERVER}/${MONGO_DB}`
        mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
    }

    listen(host, port) {
        this.express.listen(parseInt(port || process.env.PORT), host || process.env.HOST);
    }
}

class SimpleViewResult {
    viewName;
    model;
    status = 200;
    constructor(viewName, model, status) {
        this.viewName = viewName;
        this.model = model;
        this.status = status || 200;
    }
}

class SimpleContentResult {
    content = "";
    status = 200;
    constructor(content, status) {
        this.content = content;
        this.status = status || 200;
    }
}

class SimpleJsonResult {
    data;
    status = 200;
    constructor(data, status) {
        this.data = data;
        this.status = status || 200;
    }
}

class SimpleController {
    basePath;
    routes = {};
    constructor(basePath, routes) {
        this.basePath = basePath;
        if (routes)
            addRoutes(routes);
    }

    addRoutes(routes) {
        Object.keys(routes).forEach((v) => {
            let route = routes[v];
            if (typeof route === "function") {
                this.routes[v] = this.requestHandler(route);
            } else {
                if (route["get"])
                    this.routes[v].get = this.requestHandler(route.get);

                if (route["post"])
                    this.routes[v].post = this.requestHandler(route.post);
            }
        });
    }

    requestHandler(route) {
        const that = this;
        return async (req, res) => {
            try {
                const result = await route.call(that, req, res);
                if (!result) return;

                res.status(result.status || 200);
                if (result instanceof SimpleViewResult) {
                    const viewPath = (this.basePath + result.viewName).substring(1); //remove slash to make absolute path relative for mustache
                    const vm = {
                        session: req.session,
                        model: result.model
                    };
                    res.render(viewPath, vm);
                } else if (result instanceof SimpleJsonResult) {
                    res.json(result.data);
                }
            } catch (ex) {
                res.status(500).send(ex);
            }
        }
    }

    view = (view, model, status) => new SimpleViewResult(view, model, status);
    json = (data, status) => new SimpleJsonResult(data, status);
    content = (content, status) => new SimpleContentResult(content, status);
}

module.exports.App = SimpleApp;
module.exports.Controller = SimpleController;