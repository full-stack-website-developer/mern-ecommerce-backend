import nodemailer from 'nodemailer';

const createTransporter = () =>
    nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

/**
 * Notify recipient that they have a new chat message.
 */
export const sendNewMessageEmail = async ({ recipientEmail, recipientName, senderName, messagePreview, conversationLink }) => {
    const transporter = createTransporter();

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; }
        .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px; }
        .body { padding: 36px 40px; }
        .greeting { font-size: 16px; color: #1f2937; margin-bottom: 20px; }
        .message-box { background: #f9fafb; border-left: 4px solid #6366f1; border-radius: 8px; padding: 16px 20px; margin: 20px 0; font-style: italic; color: #374151; font-size: 15px; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-top: 24px; }
        .footer { background: #f9fafb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>💬 New Message</h1>
          <p>You have a new message on ShopHub</p>
        </div>
        <div class="body">
          <p class="greeting">Hi <strong>${recipientName}</strong>,</p>
          <p style="color:#4b5563;">You have received a new message from <strong>${senderName}</strong>:</p>
          <div class="message-box">"${messagePreview}"</div>
          <p style="color:#6b7280;font-size:14px;">Log in to your account to read the full message and reply.</p>
          <a href="${conversationLink}" class="cta-btn">View Conversation →</a>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ShopHub. All rights reserved.</p>
          <p>You're receiving this because you have an account on ShopHub.</p>
        </div>
      </div>
    </body>
    </html>`;

    await transporter.sendMail({
        from: `"ShopHub" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `New message from ${senderName} - ShopHub`,
        html,
    });
};

/**
 * Notify user that their conversation was started / first reply received.
 */
export const sendConversationStartedEmail = async ({ recipientEmail, recipientName, senderName, subject, conversationLink }) => {
    const transporter = createTransporter();

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 40px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; }
        .body { padding: 36px 40px; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-top: 24px; }
        .footer { background: #f9fafb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header"><h1>🚀 Conversation Started</h1></div>
        <div class="body">
          <p>Hi <strong>${recipientName}</strong>,</p>
          <p><strong>${senderName}</strong> has started a conversation with you${subject ? ` about: <strong>${subject}</strong>` : ''}.</p>
          <p>Click below to view and respond.</p>
          <a href="${conversationLink}" class="cta-btn">Open Conversation →</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} ShopHub</p></div>
      </div>
    </body>
    </html>`;

    await transporter.sendMail({
        from: `"ShopHub" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `${senderName} sent you a message - ShopHub`,
        html,
    });
};