const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const SimpleMVC = require('../src/simplemvc.js');

describe('SimpleMVC.App integration', () => {
    let app;

    before(async () => {
        process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';
        app = new SimpleMVC.App();
        const homeController = new SimpleMVC.Controller('/', {
            '': function () {
                return this.text('ok');
            },
            'json': function () {
                return this.json({ hello: 'world' });
            }
        });
        app.addControllers(homeController);
        await app.initSessions();
    });

    it('serves text routes', async () => {
        const response = await request(app.express).get('/');
        assert.equal(response.status, 200);
        assert.equal(response.text, 'ok');
    });

    it('serves json routes', async () => {
        const response = await request(app.express).get('/json');
        assert.equal(response.status, 200);
        assert.deepEqual(response.body, { hello: 'world' });
    });

    it('blocks unsafe redirects by default', async () => {
        const redirectController = new SimpleMVC.Controller('/redirect/', {
            '': function () {
                return this.redirect('https://example.com');
            }
        });
        app.addControllers(redirectController);

        const response = await request(app.express).get('/redirect/');
        assert.equal(response.status, 400);
    });
});
