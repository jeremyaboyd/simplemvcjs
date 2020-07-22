const express = require('express');
const mustache = require('mustache-express');
const formidable = require('express-formidable');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

require('dotenv').config();

class SimpleMVCApp {
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
            if (controller instanceof SimpleMVCController) {
                Object.keys(controller.routes).forEach((v) => {
                    const route = controller.routes[v];
                    const fullPath = controller.basePath + v;
                    if (typeof route === "function") {
                        this.express.all(fullPath, route);
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

class SimpleMVCViewResult {
    viewName;
    model;
    status = 200;
    constructor(viewName, model, status) {
        this.viewName = viewName;
        this.model = model;
        this.status = status || 200;
    }
}

class SimpleMVCContentResult {
    content = "";
    status = 200;
    constructor(content, status) {
        this.content = content;
        this.status = status || 200;
    }
}

class SimpleMVCJsonResult {
    data;
    status = 200;
    constructor(data, status) {
        this.data = data;
        this.status = status || 200;
    }
}

class SimpleMVCRedirectResult {
    url;
    constructor(url) {
        this.url = url;
    }
}

class SimpleMVCController {
    basePath;
    routes = {};
    constructor(basePath, routes) {
        this.basePath = basePath;
        if (routes)
            this.addRoutes(routes);
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
                if (result instanceof SimpleMVCViewResult) {
                    //remove slash to make absolute path relative for mustache
                    const viewPath = (this.basePath + result.viewName).substring(1);
                    const vm = {
                        session: req.session,
                        model: result.model
                    };
                    res.render(viewPath, vm);
                } else if (result instanceof SimpleMVCJsonResult) {
                    res.json(result.data);
                } else if (result instanceof SimpleMVCContentResult) {
                    res.send(result.content);
                } else if (result instanceof SimpleMVCRedirectResult) {
                    res.redirect(result.url);
                }
            } catch (ex) {
                res.status(500).send(ex);
            }
        }
    }

    view = (view, model, status) => new SimpleMVCViewResult(view, model, status);
    json = (data, status) => new SimpleMVCJsonResult(data, status);
    content = (content, status) => new SimpleMVCContentResult(content, status);
    redirect = (url) => new SimpleMVCRedirectResult(url);
}

class SimpleMVCUser {
    id;
    email;
    profile = {};
    constructor(id, email) {
        this.id = id;
        this.email = email;
    }
}

class SimpleMVCMembership {
    constructor() {
        this.userModel = new mongoose.model('simple_user', {
            email: String,
            password: String,
            created_on: { type: Date, default: Date.now },
            profile: [{ name: String, value: String, created_on: { type: Date, default: Date.now } }]
        });

        this.convertUser = function (model) {
            const convertedUser = new SimpleMVCUser(model._id, model.email);
            model.profile.forEach(profilePart => {
                convertedUser.profile[profilePart.name] = profilePart.value;
            });

        };
    }

    async addUser(email, password, profile) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new this.userModel({
            email,
            password: hashedPassword,
            profile: Object.keys(profile).map(k => {
                return { name: k, value: profile[k] }
            })
        });

        return this.convertUser(await newUser.save());
    }

    async updateUserEmail(id, email) {
        const user = await this.userModel.findById(id);
        user.email = email;
        return this.convertUser(await user.save());
    }

    async updateUserPassword(id, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.userModel.findById(id);
        user.password = hashedPassword;
        return this.convertUser(await user.save());
    }

    async updateUserProfile(id, profile) {
        const user = await this.userModel.findById(id);
        user.profile.push(Object.keys(profile).map((k) => {
            return {
                name: k,
                value: profile[k]
            }
        }));
    }

    async validateUser(email, password) {
        const user = await this.userModel.findOne({ email });
        if (await bcrypt.compare(password, user.password))
            return this.convertUser(user);
    }

    async getUser(id) {
        const user = await this.userModel.findById(id);
        return this.convertUser(user);
    }

    async deleteuser(id) {
        await this.userModel.findByIdAndDelete(id);
    }
}

module.exports.App = SimpleMVCApp;
module.exports.Controller = SimpleMVCController;
module.exports.Membership = SimpleMVCMembership;