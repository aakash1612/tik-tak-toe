// server/utils/emailService.js
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const body = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: htmlContent,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    console.log("📩 Resend API raw response:", data); // 👈 Add this line

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
