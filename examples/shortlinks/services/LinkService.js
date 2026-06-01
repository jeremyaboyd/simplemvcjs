const { DataTypes } = require('sequelize');
const SimpleMVC = require('../../../src/simplemvc.js');
const { getUserModel } = require('../../../src/simplemvc.db.js');

let Store;
let StoreClick;
let modelsSynced = false;

function ensureModels() {
    if (Store)
        return { Store, StoreClick };

    const sequelize = SimpleMVC.getSequelize();
    const User = getUserModel();

    Store = sequelize.define('Store', {
        id: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        url: DataTypes.STRING,
        date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'stores',
        timestamps: false
    });

    StoreClick = sequelize.define('StoreClick', {
        date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'store_clicks',
        timestamps: false
    });

    Store.hasMany(StoreClick, { foreignKey: 'storeId', onDelete: 'CASCADE' });
    StoreClick.belongsTo(Store, { foreignKey: 'storeId' });
    Store.belongsTo(User, { foreignKey: 'userId' });

    return { Store, StoreClick };
}

async function ensureSynced() {
    if (modelsSynced)
        return;
    const { Store: StoreModel, StoreClick: StoreClickModel } = ensureModels();
    await StoreModel.sync();
    await StoreClickModel.sync();
    modelsSynced = true;
}

function slugify(input = '') {
    return input.replace(/[^\sa-zA-Z0-9]/gm, '').replace(/\W+/gm, '-');
}

class LinkService {
    async getLinks({ sort = { date: -1 }, skip = 0, limit = 10 } = {}) {
        await ensureSynced();
        const { Store: StoreModel, StoreClick: StoreClickModel } = ensureModels();
        const order = sort?.date === -1 ? [['date', 'DESC']] : [['date', 'ASC']];
        return StoreModel.findAll({
            order,
            offset: skip,
            limit,
            include: [{ model: StoreClickModel, required: false }]
        });
    }

    async getLink(id) {
        await ensureSynced();
        const { Store: StoreModel } = ensureModels();
        return StoreModel.findByPk(id);
    }

    async clickLink(id) {
        await ensureSynced();
        const { StoreClick: StoreClickModel } = ensureModels();
        const link = await this.getLink(id);
        if (!link) return;
        await StoreClickModel.create({ storeId: id });
    }

    async addLink({ userId, link, url } = {}) {
        await ensureSynced();
        const { Store: StoreModel } = ensureModels();
        const id = slugify(link);
        if (await StoreModel.findByPk(id))
            return false;

        await StoreModel.create({
            id,
            url,
            userId
        });
        return true;
    }
}

module.exports = LinkService;
