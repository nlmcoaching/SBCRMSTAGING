// Resend email send + delivery status.
const express = require("express");
const { Resend } = require("resend");
const { requireFrontendSecret, requireEditSession } = require("../lib/authUsers");

const router = express.Router();
const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

router.post("/send-email", requireFrontendSecret, requireEditSession, async (req, res) => {
  if (!resendClient) {
    return res.status(503).json({ error: "Email service not configured (RESEND_API_KEY missing)." });
  }

  const { to, recipientName, subject, body } = req.body;

  // Input validation
  if (!to || !subject || !body) {
    return res.status(400).json({ error: "Missing required fields: to, subject, body." });
  }
  // Stricter email regex: requires domain with proper TLD, rejects localhost/IP targets
  if (typeof to !== "string" || !/^[^\s@]{1,64}@[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(to)) {
    return res.status(400).json({ error: "Invalid recipient email address." });
  }
  if (typeof subject !== "string" || subject.length > 200) {
    return res.status(400).json({ error: "Invalid subject." });
  }
  // Strip CRLF from subject to prevent email header injection
  const safeSubject = subject.replace(/[\r\n]/g, " ").trim();
  if (typeof body !== "string" || body.length > 50000) {
    return res.status(400).json({ error: "Message body too long." });
  }
  // Validate optional recipientName
  if (recipientName !== undefined && (typeof recipientName !== "string" || recipientName.length > 200)) {
    return res.status(400).json({ error: "Invalid recipientName." });
  }

  const FROM    = process.env.RESEND_FROM    || "jeff@simplybreathe.ai";
  const REPLY   = process.env.RESEND_REPLY_TO || FROM;

  // HTML-escape helper — prevents injection of tags/scripts into the email HTML
  const esc = (s) => String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  // Convert plain text body to safe HTML (escape all user content, preserve line breaks)
  const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body { font-family: Georgia, serif; font-size: 16px; line-height: 1.7; color: #1a1a2e; max-width: 600px; margin: 40px auto; padding: 0 24px; }
p { margin: 0 0 1em; }
</style></head><body>
${body.split(/\n\n+/).map(para =>
  `<p>${esc(para).replace(/\n/g, "<br>")}</p>`
).join("")}
</body></html>`;

  try {
    const { data, error } = await resendClient.emails.send({
      from:     `Simply Breathe <${FROM}>`,
      to:       [to],
      replyTo:  REPLY,
      subject:  safeSubject,
      html:     htmlBody,
      text:     body,
    });

    if (error) {
      console.error("[send-email] Resend API error:", error);
      return res.status(502).json({ error: error.message || "Email service error." });
    }

    console.log(`[send-email] Sent — id: ${data.id}`);
    res.json({ success: true, id: data.id });
  } catch (err) {
    console.error("[send-email] Unexpected error:", err.message);
    res.status(500).json({ error: "Failed to send email. Please try again." });
  }
});

router.get("/email-status/:id", requireFrontendSecret, async (req, res) => {
  if (!resendClient) return res.status(503).json({ error: "Email service not configured." });

  const { id } = req.params;
  if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    return res.status(400).json({ error: "Invalid email ID." });
  }

  res.set("Cache-Control", "no-store");
  try {
    const email = await resendClient.emails.get(id);
    if (email.error) return res.status(502).json({ error: email.error.message });
    res.json({
      id:        email.data?.id,
      status:    email.data?.last_event || "unknown",
      createdAt: email.data?.created_at,
      to:        email.data?.to,
      subject:   email.data?.subject,
    });
  } catch (err) {
    console.error("[email-status] Error:", err.message);
    res.status(500).json({ error: "Could not fetch email status." });
  }
});

module.exports = router;
