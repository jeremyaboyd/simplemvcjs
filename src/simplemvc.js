require('dotenv').config();

const SimpleMVCApp = require('./simplemvc.app');
const SimpleMVCController = require('./simplemvc.controller.js');
const SimpleMVCMembership = require('./simplemvc.membership.js');
const SimpleMVCSMTP = require('./simplemvc.smtp.js');

module.exports.App = SimpleMVCApp;
module.exports.Controller = SimpleMVCController;
module.exports.Membership = SimpleMVCMembership;
module.exports.SimpleMVCSMTP = SimpleMVCSMTP;