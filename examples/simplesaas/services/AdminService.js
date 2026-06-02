class AdminService {
    constructor(membership) {
        this.membership = membership;
    }

    listUsers() {
        return this.membership.listUsers();
    }

    deleteUser(id) {
        return this.membership.deleteUser(id);
    }

    setPlan(id, plan) {
        return this.membership.updateUserProfile(id, { plan });
    }
}

module.exports = AdminService;
