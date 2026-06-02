const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { initSequelize, syncModels, resetForTests } = require('../src/simplemvc.db.js');
const SimpleMVCMembership = require('../src/simplemvc.membership.js');

describe('SimpleMVC.Membership database', () => {
    let membership;

    before(async () => {
        resetForTests();
        process.env.DB_DIALECT = 'sqlite';
        process.env.DB_STORAGE = ':memory:';
        initSequelize();
        await syncModels();
        membership = new SimpleMVCMembership();
    });

    it('addUser creates a user with integer id', async () => {
        const user = await membership.addUser('test@example.com', 'password123', { name: 'Test' });
        assert.ok(user);
        assert.equal(typeof user.id, 'number');
        assert.equal(user.email, 'test@example.com');
        assert.equal(user.profile.name, 'Test');
    });

    it('validateUser returns user for correct credentials', async () => {
        const user = await membership.validateUser('test@example.com', 'password123');
        assert.ok(user);
        assert.equal(user.email, 'test@example.com');
    });

    it('validateUser returns undefined for wrong password', async () => {
        const user = await membership.validateUser('test@example.com', 'wrong');
        assert.equal(user, undefined);
    });

    it('updateUserProfile merges profile fields', async () => {
        const user = await membership.getUserByEmail('test@example.com');
        const updated = await membership.updateUserProfile(user.id, { role: 'member' });
        assert.equal(updated.profile.name, 'Test');
        assert.equal(updated.profile.role, 'member');
    });

    it('activateUser sets activatedOn when code matches', async () => {
        await membership.updateUserProfile(
            (await membership.getUserByEmail('test@example.com')).id,
            { activationCode: 'abc123' }
        );
        const activated = await membership.activateUser('test@example.com', 'abc123');
        assert.equal(activated, true);
        const user = await membership.getUserByEmail('test@example.com');
        assert.ok(user.profile.activatedOn);
    });

    it('listUsers returns users without passwords', async () => {
        await membership.addUser('other@example.com', 'password456', { name: 'Other' });
        const users = await membership.listUsers();
        assert.ok(users.length >= 2);
        for (const user of users) {
            assert.equal(typeof user.id, 'number');
            assert.ok(user.email);
            assert.equal(user.password, undefined);
        }
    });

    it('deleteUser removes the user', async () => {
        const user = await membership.getUserByEmail('test@example.com');
        await membership.deleteUser(user.id);
        const gone = await membership.getUser(user.id);
        assert.equal(gone, undefined);
    });
});
