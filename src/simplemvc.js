require('dotenv').config();

const SimpleMVCApp = require('./simplemvc.app');
const SimpleMVCController = require('./simplemvc.controller.js');
const SimpleMVCMembership = require('./simplemvc.membership.js');
const SimpleMVCSMTP = require('./simplemvc.smtp.js');
const SimpleMVCStripe = require('./simplemvc.stripe.js');
const { getSequelize } = require('./simplemvc.db.js');

module.exports.App = SimpleMVCApp;
module.exports.Controller = SimpleMVCController;
module.exports.Membership = SimpleMVCMembership;
module.exports.SMTP = SimpleMVCSMTP;
module.exports.Stripe = SimpleMVCStripe;
module.exports.getSequelize = getSequelize;
