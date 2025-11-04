const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVICE_HOST,
  port: parseInt(process.env.EMAIL_SERVICE_PORT)||587,
  secure: false, // Use 'true' if port is 465 (SMTPS), 'false' if 587 (STARTTLS)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, 
  },
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