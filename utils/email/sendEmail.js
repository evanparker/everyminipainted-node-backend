const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const postmark = require("postmark");

const sendEmail = async (
  email,
  subject,
  payload,
  htmlTemplate,
  txtTemplate
) => {
  try {
    const client = new postmark.ServerClient(
      process.env.EMAIL_POSTMARK_SERVER_CLIENT
    );

    const bodies = {};
    if (htmlTemplate) {
      const source = fs.readFileSync(
        path.join(__dirname, htmlTemplate),
        "utf8"
      );
      const compiledTemplate = handlebars.compile(source);
      bodies.HtmlBody = compiledTemplate(payload);
    }
    if (txtTemplate) {
      const source = fs.readFileSync(path.join(__dirname, txtTemplate), "utf8");
      const compiledTemplate = handlebars.compile(source);
      bodies.TextBody = compiledTemplate(payload);
    }
    if (bodies.HtmlBody || bodies.TextBody) {
      client.sendEmail({
        From: process.env.FROM_EMAIL,
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

module.exports = sendEmail;
