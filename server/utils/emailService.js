// server/utils/emailService.js

const fetch = require("node-fetch"); // For making API requests

const sendEmail = async (to, subject, htmlContent) => {
  try {
    // Build the email payload
    const body = {
      from: process.env.EMAIL_FROM, // The verified sender email in Resend
      to,
      subject,
      html: htmlContent,
    };

    // Send email using Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to send email");
    }

    console.log("✅ Email sent successfully via Resend:", data);
    return { success: true, id: data.id };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;
