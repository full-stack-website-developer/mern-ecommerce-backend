import nodemailer from 'nodemailer';

export const sendOtpMail = async(email, otp) => {
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset OTP',
        html: `<p>Your OTP for password is : <b>${otp}</b>. It is valid for 10 minutes.</P>`,
    };

    await transporter.sendMail(mailOptions);
}