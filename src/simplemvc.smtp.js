const nodemailer = require('nodemailer');
const mustache = require('mustache');

class SimpleMVCSMTP {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: Boolean(process.env.SMTP_SECURE), // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER, // generated ethereal user
                pass: process.env.SMTP_PASS, // generated ethereal password
            },
        });
    }

    sendMail(from, to, subject, template, data) {
        const body = mustache.render(template, data);
        return this.transporter.sendMail({
            from,
            to,
            subject,
            html: body
        });
    }
}

module.exports = SimpleMVCSMTP;