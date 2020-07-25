const nodemailer = require('nodemailer');
const mustache = require('mustache');

class SimpleMVCSMTP {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            }
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