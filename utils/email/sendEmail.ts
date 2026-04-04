import { readFileSync } from "fs";
import { compile } from "handlebars";
import { join } from "path";
import { ServerClient } from "postmark";

const sendEmail = async (
  email: string,
  subject: string,
  payload: unknown,
  htmlTemplate?: string,
  txtTemplate?: string
) => {
  try {
    const client = new ServerClient(
      process.env.EMAIL_POSTMARK_SERVER_CLIENT || ""
    );

    const bodies: { HtmlBody?: string; TextBody?: string } = {};
    if (htmlTemplate) {
      const source = readFileSync(join(__dirname, htmlTemplate), "utf8");
      const compiledTemplate = compile(source);
      bodies.HtmlBody = compiledTemplate(payload);
    }
    if (txtTemplate) {
      const source = readFileSync(join(__dirname, txtTemplate), "utf8");
      const compiledTemplate = compile(source);
      bodies.TextBody = compiledTemplate(payload);
    }
    if (bodies.HtmlBody || bodies.TextBody) {
      client.sendEmail({
        From: process.env.FROM_EMAIL || "",
        To: email,
        Subject: subject,
        ...bodies,
        MessageStream: "password-reset"
      });
    }
  } catch (error) {
    return error;
  }
};

export default sendEmail;
