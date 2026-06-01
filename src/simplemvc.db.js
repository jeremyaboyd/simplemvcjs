const { Sequelize, DataTypes } = require('sequelize');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

const DEFAULT_PORTS = {
    postgres: 5432,
    mysql: 3306,
    mariadb: 3306
};

let sequelize;
let User;
let sessionStore;

function buildSequelizeOptions(overrides = {}) {
    const dialect = overrides.dialect || process.env.DB_DIALECT || 'sqlite';

    if (dialect === 'sqlite') {
        return {
            dialect: 'sqlite',
            storage: overrides.storage ?? process.env.DB_STORAGE ?? ':memory:',
            logging: false
        };
    }

    return {
        dialect,
        host: overrides.host || process.env.DB_HOST || 'localhost',
        port: parseInt(overrides.port || process.env.DB_PORT, 10) || DEFAULT_PORTS[dialect] || 5432,
        database: overrides.database || process.env.DB_NAME || 'simplemvc',
        username: overrides.username ?? process.env.DB_USER ?? '',
        password: overrides.password ?? process.env.DB_PASSWORD ?? '',
        logging: false
    };
}

function initSequelize(overrides = {}) {
    if (sequelize)
        return sequelize;

    sequelize = new Sequelize(buildSequelizeOptions(overrides));
    return sequelize;
}

function getSequelize() {
    if (!sequelize)
        throw new Error('Database not initialized. Call initSequelize() or App.initDatabase() first.');
    return sequelize;
}

function defineModels(instance = sequelize) {
    if (User)
        return { User };

    User = instance.define('User', {
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        password: DataTypes.STRING,
        createdOn: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        profile: {
            type: DataTypes.JSON,
            defaultValue: {}
        }
    }, {
        tableName: 'simple_users',
        timestamps: false
    });

    return { User };
}

function getUserModel() {
    if (!User)
        defineModels();
    return User;
}

function createSessionStore(instance = sequelize) {
    if (!instance)
        throw new Error('Database not initialized. Call initSequelize() or App.initDatabase() first.');

    if (!sessionStore) {
        sessionStore = new SequelizeStore({
            db: instance,
            tableName: 'simple_sessions'
        });
    }

    return sessionStore;
}

async function syncModels(instance = sequelize) {
    if (!instance)
        throw new Error('Database not initialized. Call initSequelize() or App.initDatabase() first.');

    defineModels(instance);
    const store = createSessionStore(instance);
    await instance.sync();
    await store.sync();
}

function resetForTests() {
    sequelize = undefined;
    User = undefined;
    sessionStore = undefined;
}

module.exports = {
    initSequelize,
    getSequelize,
    defineModels,
    getUserModel,
    createSessionStore,
    syncModels,
    resetForTests
};
