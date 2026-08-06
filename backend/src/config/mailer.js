const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
    if (process.env.NODE_ENV === 'development') {
        console.log('📧 [DEV] Email simulado:');
        console.log('   Para:', to);
        console.log('   Asunto:', subject);
        // Extrae el código del HTML para verlo fácil en consola
        const match = html.match(/\d{6}/);
        if (match) console.log('   Código:', match[0]);
        return;
    }

    await resend.emails.send({
        from: process.env.RESEND_FROM,
        to,
        subject,
        html
    });
};

module.exports = { sendEmail };
