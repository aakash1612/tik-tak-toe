const fetch = require("node-fetch");

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const response = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MAILERSEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: {
          email: process.env.EMAIL_FROM,
          name: "Tic Tac Toe Game"
        },
        to: [{ email: to }],
        subject: subject,
        html: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("📩 MailerSend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("✅ Email sent successfully via MailerSend:", data);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;
