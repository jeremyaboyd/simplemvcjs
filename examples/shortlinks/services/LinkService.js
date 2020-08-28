const mongoose = require('mongoose');

const LinkModel = new mongoose.model('store', {
    _id: String,
    userId: mongoose.Types.ObjectId,
    url: String,
    date: { type: Date, default: Date.now },
    clicks: [{
        date: { type: Date, default: Date.now }
    }]
});

function slugify(input = '') {
    return input.replace(/[^\sa-zA-Z0-9]/gm, '').replace(/\W+/gm, '-');
}

class LinkService {
    getLinks({ sort = { createdOn: -1 }, skip = 0, limit = 10 } = {}) {
        const query = LinkModel.find();
        if (sort)
            query.sort(sort)

        if (skip)
            query.skip(skip);

        if (limit)
            query.limit(limit);
        return query;
    }

    async getLink(id) {
        return await LinkModel.findById(id);
    }

    async clickLink(id) {
        const link = this.getLink(id);
        link.clicks.push({});
    }

    async addLink({ userId, link, url } = {}) {
        const id = slugify(link);
        if (await LinkModel.findById(id))
            return false;

        const newLink = new LinkModel({
            _id: id,
            url: url,
            userId: userId
        });

        await newLink.save();
    }
}

module.exports = LinkService;