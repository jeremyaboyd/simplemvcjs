const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { getUserModel } = require('./simplemvc.db.js');
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
    return { ...profile };
}

class SimpleMVCMembership {
    get userModel() {
        return getUserModel();
    }

    constructor() {
        this.convertUser = function (model) {
            if (!model) return;
            const convertedUser = new SimpleMVCUser(model.id, model.email);
            convertedUser.profile = profileToPlainObject(model.profile);
            return convertedUser;
        };
    }

    async addUser(email, password, profile) {
        if (await this.userModel.findOne({ where: { email } }))
            return;

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await this.userModel.create({
            email,
            profile: profile || {},
            password: hashedPassword
        });

        return this.convertUser(newUser);
    }

    async updateUserEmail(id, email) {
        const user = await this.userModel.findByPk(id);
        if (!user) return;
        user.email = email;
        return this.convertUser(await user.save());
    }

    async updateUserPassword(id, password) {
        const user = await this.userModel.findByPk(id);
        if (!user) return;
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        return this.convertUser(await user.save());
    }

    async updateUserProfile(id, profileObject) {
        const user = await this.userModel.findByPk(id);
        if (!user) return;
        user.profile = {
            ...profileToPlainObject(user.profile),
            ...Object.fromEntries(
                Object.entries(profileObject).map(([key, value]) => [key, String(value)])
            )
        };
        user.changed('profile', true);
        return this.convertUser(await user.save());
    }

    async validateUser(email, password) {
        const user = await this.userModel.findOne({ where: { email } });
        if (!user) return;
        if (await bcrypt.compare(password, user.password))
            return this.convertUser(user);
    }

    async getUser(id) {
        const user = await this.userModel.findByPk(id);
        return this.convertUser(user);
    }

    async getUserByEmail(email) {
        const user = await this.userModel.findOne({ where: { email } });
        return this.convertUser(user);
    }

    async deleteUser(id) {
        await this.userModel.destroy({ where: { id } });
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
        const user = await this.userModel.findOne({ where: { email } });
        const profile = profileToPlainObject(user?.profile);
        if (!user || profile.activationCode !== activationCode)
            return false;

        user.profile = { ...profile, activatedOn: String(Date.now()) };
        user.changed('profile', true);
        await user.save();
        return true;
    }
}

module.exports = SimpleMVCMembership;
module.exports.profileToPlainObject = profileToPlainObject;
