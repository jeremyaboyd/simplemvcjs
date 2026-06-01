const crypto = require('crypto');
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

const generateActivationCode = () => crypto.randomBytes(32).toString('hex');

function profileToPlainObject(profile) {
    if (!profile)
        return {};

    if (profile instanceof Map || (typeof profile.get === 'function' && typeof profile.keys === 'function')) {
        const plain = {};
        for (const key of profile.keys())
            plain[key] = profile.get(key);
        return plain;
    }

    return { ...profile };
}

class SimpleMVCMembership {
    constructor() {
        this.userModel = mongoose.model('simple_user', {
            email: { type: String, required: true, unique: true, index: true },
            password: String,
            createdOn: { type: Date, default: Date.now },
            profile: { type: Map, of: String }
        });

        this.convertUser = function (model) {
            if (!model) return;
            const convertedUser = new SimpleMVCUser(model._id, model.email);
            convertedUser.profile = profileToPlainObject(model.profile);
            return convertedUser;
        };
    }

    async addUser(email, password, profile) {
        if (await this.userModel.findOne({ email }))
            return;

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new this.userModel({
            email,
            profile: profile || {},
            password: hashedPassword
        });

        return this.convertUser(await newUser.save());
    }

    async updateUserEmail(id, email) {
        const user = await this.userModel.findById(id);
        if (!user) return;
        user.email = email;
        return this.convertUser(await user.save());
    }

    async updateUserPassword(id, password) {
        const user = await this.userModel.findById(id);
        if (!user) return;
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        return this.convertUser(await user.save());
    }

    async updateUserProfile(id, profileObject) {
        const user = await this.userModel.findById(id);
        if (!user) return;
        for (const key of Object.keys(profileObject)) {
            user.profile.set(key, String(profileObject[key]));
        }
        return this.convertUser(await user.save());
    }

    async validateUser(email, password) {
        const user = await this.userModel.findOne({ email });
        if (!user) return;
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
        const user = await this.getUser(id);
        if (!user) return false;

        const activationCode = generateActivationCode();
        const updatedUser = await this.updateUserProfile(id, { activationCode });
        if (!updatedUser) return false;

        const mailData = {
            ...profileToPlainObject(updatedUser.profile),
            email: updatedUser.email,
            activationCode
        };
        await smtp.sendMail(from, updatedUser.email, subject, template, mailData);
        return true;
    }

    async activateUser(email, activationCode) {
        const user = await this.userModel.findOne({ email });
        if (!user || user.profile.get('activationCode') !== activationCode)
            return false;

        user.profile.set('activatedOn', String(Date.now()));
        await user.save();
        return true;
    }
}

module.exports = SimpleMVCMembership;
module.exports.profileToPlainObject = profileToPlainObject;
