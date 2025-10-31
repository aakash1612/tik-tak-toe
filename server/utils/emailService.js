// server/utils/emailService.js

let fetchFn;
try {
  fetchFn = fetch;
} catch (err) {
  fetchFn = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const body = {
      from: {
        email: process.env.EMAIL_FROM, // must be a verified sender email
        name: "Tic Tac Toe Game" // optional, shown as sender name
      },
      to: [
        {
          email: to,
          name: "User"
        }
      ],
      subject,
      html: htmlContent,
    };

    const response = await fetchFn("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MAILERSEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log("📩 MailerSend API raw response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Failed to send email");
    }

    console.log("✅ Email sent successfully via MailerSend!");
    return { success: true, id: data.message_id };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;
