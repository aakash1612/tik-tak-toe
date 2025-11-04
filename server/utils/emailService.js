// emailService.js
const { Resend } = require('resend');

if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY is not set. Emails will fail until you add it to env.');
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * sendEmail(to, subject, htmlContent)
 * - to: string (single recipient or array)
 * - subject: string
 * - htmlContent: string (HTML)
 *
 * Returns: { success: true, id } on success or { success: false, error } on failure
 */
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const response = await resend.emails.send({
      from: 'onboarding@resend.dev', // sandbox sender, no domain required
      to,
      subject,
      html: htmlContent,
    });

    // response typically contains an id and metadata
    console.log('✅ Resend email queued/sent:', response);
    return { success: true, id: response.id || null, raw: response };
  } catch (err) {
    console.error('❌ Resend send error:', err);
    // Some errors are objects — try to return useful message
    const message = err?.message || JSON.stringify(err);
    return { success: false, error: message, raw: err };
  }
};

module.exports = sendEmail;
