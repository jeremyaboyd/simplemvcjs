const express = require('express');
const mustache = require('mustache-express');
const formidable = require('express-formidable');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const {
    initSequelize,
    createSessionStore,
    defineModels,
    syncModels
} = require('./simplemvc.db.js');

const SimpleMVCController = require('./simplemvc.controller.js');

class SimpleMVCApp {
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
                        this.express.get(fullPath, route);
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
        this.express.use(express.static(path));
    }

    async initSessions() {
        if (!process.env.SESSION_SECRET) {
            throw new Error('SESSION_SECRET must be set in the environment');
        }

        const sessionOptions = {
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false
        };

        if (this.useDatabase) {
            if (this.dbConnectionPromise)
                await this.dbConnectionPromise;
            sessionOptions.store = createSessionStore();
        }

        this.express.use(session(sessionOptions));
    }

    initDatabase() {
        this.useDatabase = true;
        initSequelize();
        defineModels();
        this.dbConnectionPromise = syncModels();
        return this.dbConnectionPromise;
    }

    listen(host, port) {
        const resolvedHost = host || process.env.HOST || 'localhost';
        const resolvedPort = parseInt(port || process.env.PORT, 10) || 8080;

        const server = this.express.listen(resolvedPort, resolvedHost, () => {
            console.log(`SimpleMVC.App is listening on ${resolvedHost} port ${resolvedPort}`);
        });

        server.on('error', (ex) => {
            console.error(ex);
        });

        return server;
    }
}

module.exports = SimpleMVCApp;
