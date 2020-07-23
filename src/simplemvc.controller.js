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
                this.routes[v] = {};
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

module.exports = SimpleMVCController;