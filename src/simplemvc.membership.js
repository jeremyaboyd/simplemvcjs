const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const smtp = new (require('./simplemvc.smtp.js'))();

class SimpleMVCUser {
    id;
    email;
    profile = {};
    constructor(id, email) {
        this.id = id;
        this.email = email;
    }
}

const getUniqueID = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return bcrypt.hash(s4() + s4() + s4(), 10);
};

class SimpleMVCMembership {
    constructor() {
        this.userModel = new mongoose.model('simple_user', {
            email: String,
            password: String,
            createdOn: { type: Date, default: Date.now },
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
        if (await this.userModel.findOne({ email }))
            return;

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

    async getUserByEmail(email) {
        const user = await this.userModel.findOne({ email });
        return this.convertUser(user);
    }

    async deleteUser(id) {
        await this.userModel.findByIdAndDelete(id);
    }

    async sendActivationEmail(id, from, subject, template) {
        const user = this.getUser(id);
        const activationCode = getUniqueID();
        membership.updateUserProfile(id, { activationCode });
        await smtp.sendMail(from, user.email, subject, template, { ...user.profile, email: user.email });
    }

    async activateUser(email, activationCode) {
        const user = this.getUserByEmail(email);
        if(user && user.profile.activationCode === activationCode) {
            this.updateUserProfile(user.id, { activatedOn: Date.now() });
            return true;
        }
        return false;
    }
}

module.exports = SimpleMVCMembership;