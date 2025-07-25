
import nodemailer from 'nodemailer';

// To use a transactional email service, sign up for a provider (e.g., Brevo, Mailgun, SendGrid)
// and get your SMTP credentials. Then, add them to your .env file.
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: (process.env.EMAIL_PORT || '587') === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
});

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail(options: EmailOptions) {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email provider is not configured. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in your .env file.');
    }

    try {
        const info = await transporter.sendMail({
            from: `"Turbo Tracker" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            ...options
        });
        return info;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error sending email: ${error.message}`);
        }
        throw new Error('An unknown error occurred while sending the email.');
    }
}
