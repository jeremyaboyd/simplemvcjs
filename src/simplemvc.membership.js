const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

class SimpleMVCUser {
    id;
    email;
    profile = {};
    constructor(id, email) {
        this.id = id;
        this.email = email;
    }
}

class SimpleMVCMembership {
    constructor() {
        this.userModel = new mongoose.model('simple_user', {
            email: String,
            password: String,
            created_on: { type: Date, default: Date.now },
            profile: { type: Map, of: String }
        });

        this.convertUser = function (model) {
            if (!model) return;
            const convertedUser = new SimpleMVCUser(model._id, model.email);
            for (const key of model.profile.keys()) {
                convertedUser.profile[key] = model.profile.get(key);
            }
            return convertedUser;
        };
    }

    async addUser(email, password, profile) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new this.userModel({
            email,
            profile,
            password: hashedPassword
        });

        return this.convertUser(await newUser.save());
    }

    async updateUserEmail(id, email) {
        const user = await this.userModel.findById(id);
        user.email = email;
        return this.convertUser(await user.save());
    }

    async updateUserPassword(id, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.userModel.findById(id);
        user.password = hashedPassword;
        return this.convertUser(await user.save());
    }

    async updateUserProfile(id, profileObject) {
        const user = await this.userModel.findById(id);
        for (const key of Object.keys(profileObject)) {
            user.profile.set(key, profileObject[key]);
        }
        return this.convertUser(await user.save());
    }

    async validateUser(email, password) {
        const user = await this.userModel.findOne({ email });
        if (await bcrypt.compare(password, user.password))
            return this.convertUser(user);
    }

    async getUser(id) {
        const user = await this.userModel.findById(id);
        return this.convertUser(user);
    }

    async deleteuser(id) {
        await this.userModel.findByIdAndDelete(id);
    }
}

module.exports = SimpleMVCMembership;