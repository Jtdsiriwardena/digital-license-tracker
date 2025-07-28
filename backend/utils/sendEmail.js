import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export async function sendEmailReminder(to, license, daysLeft) {
  console.log(`Preparing to send email to ${to} about license expiring in ${daysLeft} days`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `License Expiry Reminder: ${license.product.name}`,
    text: `Hello,

This is a reminder that your license for the product "${license.product.name}" is expiring in ${daysLeft} day(s) on ${license.expiryDate.toDateString()}.

Please renew it to avoid any interruption.

Thank you,
License Tracker App
`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
