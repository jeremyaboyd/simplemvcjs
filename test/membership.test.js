const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { profileToPlainObject } = require('../src/simplemvc.membership.js');

describe('profileToPlainObject', () => {
    it('converts a Map to a plain object (spread on Map is empty)', () => {
        const map = new Map([['name', 'Jane'], ['role', 'user']]);
        assert.deepEqual({ ...map }, {});
        assert.deepEqual(profileToPlainObject(map), { name: 'Jane', role: 'user' });
    });

    it('copies a plain object profile', () => {
        const profile = { name: 'Jane', role: 'user' };
        assert.deepEqual(profileToPlainObject(profile), profile);
        assert.notEqual(profileToPlainObject(profile), profile);
    });

    it('returns empty object for null or undefined', () => {
        assert.deepEqual(profileToPlainObject(null), {});
        assert.deepEqual(profileToPlainObject(undefined), {});
    });
});
