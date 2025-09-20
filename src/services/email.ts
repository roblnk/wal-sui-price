
import nodemailer from 'nodemailer';

// To use a transactional email service, sign up for a provider (e.g., Brevo, Mailgun, SendGrid)
// and get your SMTP credentials. Then, add them to your .env file.
const emailHost = process.env.EMAIL_HOST;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const emailPort = process.env.EMAIL_PORT;
const emailFrom = process.env.EMAIL_FROM;

let transporter: nodemailer.Transporter | null = null;

if (emailHost && emailUser && emailPass) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: 'vunguyentrungkhang2@gmail.com',
          pass: 'kkpqbsfpkzfujufs'
        },
    });
} else {
    console.warn('Email provider is not configured. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in your environment variables. Emails will not be sent.');
}

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail(options: EmailOptions) {
    if (!transporter) {
        const errorMessage = 'Email provider is not configured. Cannot send email.';
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    try {
        const info = await transporter.sendMail({
            from: "roblnk",
            ...options
        });
        console.log("Email sent successfully:", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        if (error instanceof Error) {
            throw new Error(`Error sending email: ${error.message}`);
        }
        throw new Error('An unknown error occurred while sending the email.');
    }
}
