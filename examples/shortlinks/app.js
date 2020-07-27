const SimpleMVC = require('simplemvcjs');
const fs = require('fs');
const URL = require('url').URL;

let links = {};

async function loadLinks() {
    fs.readFile('./links.json', (err, data) => {
        if (err) console.error(err);
        if (data) links = JSON.parse(data);
    });
}

function getLink(id) {
    return links[id];
}

function addLink(id, link) {
    if (links[id]) return false;
    try {
        new URL(link);
        links[id] = link;
        fs.writeFileSync('./links.json', JSON.stringify(links));
        return true;
    } catch { }
    return false;
}

const controller = new SimpleMVC.Controller("/", {
    "": function () {
        return this.view('index');
    },
    "l/:id": {
        get: function (req) {
            const link = getLink(req.params.id);
            return this.redirect(link);
        },
        post: function (req) {
            if (addLink(req.params.id, req.fields.url)) {
                return this.redirect('/');
            } else {
                return this.redirect('/');
            }
        }
    }
});

loadLinks();
const app = new SimpleMVC.App();
app.addControllers(controller);
app.listen("exmple.com", 8082);
