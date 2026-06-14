import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  try {
    const data = await resend.emails.send({
      from: "noreply@vigilia.world",
      to: "TU_CORREO@gmail.com",
      subject: "Prueba Resend",
      html: "<h1>Resend funciona</h1>",
    });

    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

main();
