const nodemailer = require('nodemailer');
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
//   pool: true,
//   maxConnections: 1,
//   rateLimit: 1,
//   connectionTimeout: 20000,
//   socketTimeout: 20000,
//   family: 4, // force IPv4
//   tls: { rejectUnauthorized: false },
// });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  debug: true,
});


const sendEmail = async (to, subject, htmlContent) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: subject,
      html: htmlContent,
    };

    let info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } 
  catch (error) {
  console.error('❌ Error sending email:', error);
  console.error('Full error object:', JSON.stringify(error, null, 2));
  return { success: false, error: error.message };
}
};

module.exports = sendEmail;