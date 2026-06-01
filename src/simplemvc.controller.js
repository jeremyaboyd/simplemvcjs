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

const SESSION_VIEW_KEYS = ['user', 'admin', 'isAdmin'];

function buildSessionViewModel(session) {
    if (!session) return {};
    const vm = {};
    for (const key of SESSION_VIEW_KEYS) {
        if (session[key] !== undefined)
            vm[key] = session[key];
    }
    return vm;
}

function sanitizeViewName(viewName) {
    const normalized = String(viewName).replace(/\\/g, '/');
    const segments = normalized.split('/').filter(segment => segment && segment !== '.' && segment !== '..');
    return segments.join('/');
}

function isSafeRedirectUrl(url, allowExternalRedirects) {
    if (!url || typeof url !== 'string')
        return false;
    if (allowExternalRedirects)
        return true;
    if (!url.startsWith('/') || url.startsWith('//'))
        return false;
    return true;
}

class SimpleMVCController {
    basePath;
    routes = {};
    allowExternalRedirects = false;
    beforeRoute = function (req) { };

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

        const processResult = (result, req, res) => {
            if (result instanceof SimpleMVCViewResult) {
                const viewPath = sanitizeViewName((that.basePath + result.viewName).substring(1));
                const vm = {
                    session: buildSessionViewModel(req.session),
                    model: result.model
                };

                res.status(result.status || 200);
                res.render(viewPath, vm);
                return true;
            }
            if (result instanceof SimpleMVCJsonResult) {
                res.status(result.status || 200);
                res.json(result.data);
                return true;
            }
            if (result instanceof SimpleMVCTextResult) {
                res.status(result.status || 200);
                res.send(result.content);
                return true;
            }
            if (result instanceof SimpleMVCRedirectResult) {
                if (!isSafeRedirectUrl(result.url, that.allowExternalRedirects)) {
                    res.status(400).send('Invalid redirect URL');
                    return true;
                }
                res.redirect(result.url);
                return true;
            }
            return false;
        };

        return async (req, res) => {
            try {
                let result = await this.beforeRoute.call(that, req);
                if (result) {
                    if (!processResult(result, req, res) && !res.headersSent)
                        res.status(500).send('Internal Server Error');
                    return;
                }
                result = await route.call(that, req, res);
                if (!result) {
                    if (!res.headersSent)
                        res.status(204).end();
                    return;
                }

                if (!processResult(result, req, res) && !res.headersSent)
                    res.status(500).send('Internal Server Error');
            } catch (ex) {
                console.error(ex);
                if (!res.headersSent)
                    res.status(500).send('Internal Server Error');
            }
        };
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
module.exports.buildSessionViewModel = buildSessionViewModel;
module.exports.isSafeRedirectUrl = isSafeRedirectUrl;
module.exports.sanitizeViewName = sanitizeViewName;
