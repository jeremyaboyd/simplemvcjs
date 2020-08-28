const SimpleMVC = require('../../src/simplemvc.js');
const fs = require('fs');
const URL = require('url').URL;
const LinkService = require('./services/LinkService.js');

const membership = new SimpleMVC.Membership();
const links = new LinkService();

const controller = new SimpleMVC.Controller("/", {
    "": async function () {
        const vm = {};
        vm.links = await links.getLinks();
        return this.view('index', vm);
    },
    "l/:id": {
        get: await function (req) {
            const link = await links.getLink(req.params.id);
            return this.redirect(link);
        },
        post: async function (req) {
            if (!req.session.user)
                return this.redirect('/login');

            if (await links.addLink({ userId: req.session.user._id, link: req.fields.link, url: req.fields.url })) {
                return this.redirect('/');
            } else {
                return this.redirect('/');
            }
        }
    },
    "login": {
        get: function () {
            return this.view('login');
        },
        post: async function (req) {
            const user = await membership.validateUser(req.fields.email, req.fields.password);
            if (!user) {
                return this.view('login', { message: { color: "red", message: "Invalid credentials. Please try again." } });
            }
            req.session.user = user;
            return this.redirect('/');
        }
    },
    "register": {
        post: async function (req) {
            const user = await membership.addUser(req.fields.email, req.fields.password);
            if (user) {
                await membership.sendActivationEmail(user.id, 'jeremy <jeremy@example.com>', 'activate your account!', '<p>Thank you for joining Super Shortlinker</p><a href="http://example.com/activate?email={{email}}&code={{activationCode}}">Activate your account</a>');
            }
            return this.view('register', { message: { color: "green", message: "Check your inbox and spam folders for an activation email." } });
        }
    },
    "activate": {
        get: async function (req) {
            if (await membership.activateUser(req.query.email, req.query.code))
                return this.view('activate', { message: { color: "green", message: "You have activated your account." } });
            return this.view('activate', { message: { color: "red", message: "The activation code was invalid." } });
        }
    }
});

loadLinks();
const app = new SimpleMVC.App();
app.addControllers(controller);
app.initDbConnection();
app.initSessions();
app.listen();
