const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"Tic-Tac-Toe" <no-reply@tictactoe.dev>',
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("❌ Email send failed:", error);
    return { success: false, error };
  }
};

module.exports = sendEmail;
