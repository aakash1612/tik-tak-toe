const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // Use service instead of manual host/port
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
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
    
    let info = await transporter.sendMail(mailOptions).catch((error) => {
      console.error('❌ Transporter sendMail error:', error);
      throw error;
    });
    
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;