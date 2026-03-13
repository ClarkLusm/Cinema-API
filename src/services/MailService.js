const transporter = require("../utils/Mailer");

const sendMailService = async ({ to, subject, html }) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  };
  return await transporter.sendMail(mailOptions);
};

const mailTemplate = (content, buttonUrl, buttonText) => {
  return `<!DOCTYPE html>
  <html>
  <body style="text-align: center; font-family: 'Verdana', serif; color: #000;">
   <h2>${content}</h2>

      <a 
        href="${buttonUrl}" 
        style="
          display:inline-block;
          margin-top:20px;
          padding:12px 24px;
          background:#4f46e5;
          color:#fff;
          text-decoration:none;
          border-radius:6px;
          font-weight:bold;
        "
      >
        ${buttonText}
      </a>

      <p style="margin-top:30px;font-size:13px;color:#666;">
        Link sẽ hết hạn sau 30 phút.
      </p>
    </body>
</html>`;
};

module.exports = { sendMailService, mailTemplate };
