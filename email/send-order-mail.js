import nodemailer from 'nodemailer';

const createTransporter = () =>
    nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

const containerStyle = 'max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#111827;';
const sectionStyle = 'padding:24px;';
const muted = 'color:#6b7280;font-size:14px;line-height:1.6;';
const heading = 'margin:0 0 8px;font-size:22px;line-height:1.3;color:#111827;';

const escapeHtml = (value = '') =>
    String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const formatAmount = (value = 0) => {
    const amount = Number(value) || 0;
    return amount.toFixed(2);
};

const buildLayout = ({ title, preheader, content }) => `
<div style="background:#f3f4f6;padding:24px;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <div style="${containerStyle}">
    <div style="padding:18px 24px;background:#111827;color:#ffffff;font-size:16px;font-weight:700;">Ecommerce</div>
    <div style="${sectionStyle}">
      <h1 style="${heading}">${escapeHtml(title)}</h1>
      ${content}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e5e7eb;${muted}">
      This is an automated email. Please do not reply.
    </div>
  </div>
</div>`;

const sendEmail = async ({ to, subject, html }) => {
    if (!to) return;

    const transporter = createTransporter();
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html,
    });
};

export const sendOrderConfirmationMail = async ({ to, orderNumber, items = [], total, shippingAddress, paymentMethod }) => {
    const rows = items
        .map((item) => {
            const name = escapeHtml(item.name || item.productName || item.productId || 'Item');
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.price) || 0;
            const lineTotal = Number(item.subtotal ?? (quantity * unitPrice));

            return `
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:14px;">${name}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:center;">${quantity}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;">$${formatAmount(unitPrice)}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;">$${formatAmount(lineTotal)}</td>
            </tr>`;
        })
        .join('');

    const addressText = [
        shippingAddress?.firstName,
        shippingAddress?.lastName,
        shippingAddress?.street,
        shippingAddress?.city,
        shippingAddress?.state,
        shippingAddress?.postalCode,
        shippingAddress?.country,
    ]
        .filter(Boolean)
        .join(', ');

    const content = `
      <p style="${muted}">Thank you for your order. Your order has been received and is being processed.</p>
      <p style="margin:0 0 16px;font-size:14px;"><strong>Order Number:</strong> ${escapeHtml(orderNumber || '')}</p>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:18px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px;">Item</th>
            <th style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">Qty</th>
            <th style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;">Unit</th>
            <th style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4" style="padding:12px;font-size:14px;color:#6b7280;">No items found.</td></tr>'}
        </tbody>
      </table>

      <p style="margin:0 0 8px;font-size:14px;"><strong>Total:</strong> $${formatAmount(total)}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Payment Method:</strong> ${escapeHtml((paymentMethod || '').toUpperCase())}</p>
      <p style="margin:0;font-size:14px;"><strong>Delivery Address:</strong> ${escapeHtml(addressText || 'N/A')}</p>
    `;

    const html = buildLayout({
        title: 'Order Confirmation',
        preheader: `Order ${orderNumber} confirmed`,
        content,
    });

    await sendEmail({
        to,
        subject: `Order Confirmation - ${orderNumber}`,
        html,
    });
};

export const sendOrderShippedMail = async ({ to, orderNumber, trackingNumber, carrier, sellerName }) => {
    const content = `
      <p style="${muted}">Good news. Your order is on the way.</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Order Number:</strong> ${escapeHtml(orderNumber || '')}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Seller:</strong> ${escapeHtml(sellerName || 'Marketplace Seller')}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Carrier:</strong> ${escapeHtml(carrier || 'N/A')}</p>
      <p style="margin:0;font-size:14px;"><strong>Tracking Number:</strong> ${escapeHtml(trackingNumber || 'N/A')}</p>
    `;

    const html = buildLayout({
        title: 'Your Order Has Shipped',
        preheader: `Order ${orderNumber} shipped`,
        content,
    });

    await sendEmail({
        to,
        subject: `Order Shipped - ${orderNumber}`,
        html,
    });
};

export const sendOrderDeliveredMail = async ({ to, orderNumber }) => {
    const content = `
      <p style="${muted}">Your order has been marked as delivered. We hope you enjoy your purchase.</p>
      <p style="margin:0;font-size:14px;"><strong>Order Number:</strong> ${escapeHtml(orderNumber || '')}</p>
    `;

    const html = buildLayout({
        title: 'Order Delivered',
        preheader: `Order ${orderNumber} delivered`,
        content,
    });

    await sendEmail({
        to,
        subject: `Order Delivered - ${orderNumber}`,
        html,
    });
};

export const sendOrderCancelledMail = async ({ to, orderNumber, reason }) => {
    const content = `
      <p style="${muted}">Your order has been cancelled.</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Order Number:</strong> ${escapeHtml(orderNumber || '')}</p>
      <p style="margin:0;font-size:14px;"><strong>Reason:</strong> ${escapeHtml(reason || 'Cancelled by admin')}</p>
    `;

    const html = buildLayout({
        title: 'Order Cancelled',
        preheader: `Order ${orderNumber} cancelled`,
        content,
    });

    await sendEmail({
        to,
        subject: `Order Cancelled - ${orderNumber}`,
        html,
    });
};
