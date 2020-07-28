class SimpleMVCViewResult {
    viewName = "";
    model = {};
    status = 200;
    constructor(viewName, model, status) {
        this.viewName = viewName;
        this.model = model;
        this.status = status || 200;
    }
}

class SimpleMVCTextResult {
    content = "";
    status = 200;
    constructor(content = "", status = 200) {
        this.content = content;
        this.status = status;
    }
}

class SimpleMVCJsonResult {
    data = {};
    status = 200;
    constructor(data = {}, status = 200) {
        this.data = data;
        this.status = status;
    }
}

class SimpleMVCRedirectResult {
    url = "";
    constructor(url = "") {
        this.url = url;
    }
}

class SimpleMVCController {
    basePath;
    routes = {};
    constructor(basePath = "/", routes = {}) {
        this.basePath = basePath;
        if (routes)
            this.addRoutes(routes);
    }

    addRoutes(routes = {}) {
        Object.keys(routes).forEach((v) => {
            let route = routes[v];
            if (typeof route === "function") {
                this.routes[v] = this.requestHandler(route);
            } else if (typeof route === "object") {
                this.routes[v] = {};
                Object.keys(route)
                    .forEach(verb => {
                        this.routes[v][verb] = this.requestHandler(route[verb]);
                    });
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
                } else if (result instanceof SimpleMVCTextResult) {
                    res.send(result.content);
                } else if (result instanceof SimpleMVCRedirectResult) {
                    res.redirect(result.url);
                }
            } catch (ex) {
                res.status(500).send(ex);
            }
        }
    }

    view = (view = "", model = {}, status = 200) => new SimpleMVCViewResult(view, model, status);
    json = (data = {}, status = 200) => new SimpleMVCJsonResult(data, status);
    /**
     * @deprecated Since version 0.9.2. Will be deleted in version 1.0. Use text instead.
     */
    content = (content = "", status = 200) => new SimpleMVCTextResult(content, status);
    text = (text = "", status = 200) => new SimpleMVCTextResult(text, status);
    redirect = (url = "") => new SimpleMVCRedirectResult(url);
}

module.exports = SimpleMVCController;