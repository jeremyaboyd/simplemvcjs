const express = require('express');
const mustache = require('mustache-express');
const formidable = require('express-formidable');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);

const SimpleMVCController = require('./simplemvc.controller.js');

class SimpleMVCApp {
    express;
    __dirname = require('path').resolve();
    constructor() {
        this.express = express();

        this.express.use(formidable());
        this.express.use(cookieParser());

        this.express.engine('html', mustache());
        this.express.set('view engine', 'html');
        this.express.set('views', this.__dirname + '/views');
    }

    addControllers(...controllers) {
        controllers.forEach(controller => {
            if (controller instanceof SimpleMVCController) {
                Object.keys(controller.routes).forEach((v) => {
                    const route = controller.routes[v];
                    const fullPath = controller.basePath + v;
                    if (typeof route === "function") {
                        this.express.all(fullPath, route);
                    } else if (typeof route === "object") {
                        Object.keys(route).forEach(verb => {
                            this.express[verb](fullPath, route[verb]);
                        });
                    }
                });
            }
        });
    }

    initStaticFiles(path) {
        this.express.use(express.static(path))
    }

    initSessions() {
        var sessionOptions = {
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false
        };
        if (this.useMongoose)
            sessionOptions.store = new MongoStore({ mongooseConnection: mongoose.connection, collection: 'simple_sessions' });

        this.express.use(session(sessionOptions));
    }

    initDbConnection() {
        this.useMongoose = true;
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
        try {
            this.express.listen(parseInt(port || process.env.PORT), host || process.env.HOST);
            console.log(`SimpleMVC.App is listening on ${host || process.env.HOST} port ${port || process.env.PORT}`);
        } catch (ex) {
            console.error(ex);
        }
    }
}

module.exports = SimpleMVCApp;