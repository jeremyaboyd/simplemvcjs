const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    buildSessionViewModel,
    isSafeRedirectUrl,
    sanitizeViewName
} = require('../src/simplemvc.controller.js');

describe('buildSessionViewModel', () => {
    it('exposes only safe session keys', () => {
        const session = {
            user: { id: '1', email: 'a@b.com' },
            isAdmin: true,
            secretToken: 'hidden'
        };
        assert.deepEqual(buildSessionViewModel(session), {
            user: { id: '1', email: 'a@b.com' },
            isAdmin: true
        });
    });

    it('returns empty object when session is missing', () => {
        assert.deepEqual(buildSessionViewModel(null), {});
    });
});

describe('isSafeRedirectUrl', () => {
    it('allows relative paths by default', () => {
        assert.equal(isSafeRedirectUrl('/login', false), true);
        assert.equal(isSafeRedirectUrl('/auth/login?next=/', false), true);
    });

    it('blocks external and protocol-relative URLs by default', () => {
        assert.equal(isSafeRedirectUrl('https://example.com', false), false);
        assert.equal(isSafeRedirectUrl('//evil.com', false), false);
    });

    it('allows external URLs when enabled', () => {
        assert.equal(isSafeRedirectUrl('https://example.com', true), true);
    });
});

describe('sanitizeViewName', () => {
    it('removes path traversal segments', () => {
        assert.equal(sanitizeViewName('../secret/admin'), 'secret/admin');
        assert.equal(sanitizeViewName('auth/../login'), 'auth/login');
    });
});
