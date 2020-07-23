const nodemailer = require('nodemailer');

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
}