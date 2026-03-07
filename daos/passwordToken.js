const PasswordToken = require("../models/passwordToken");
const User = require("../models/user");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const sendEmail = require("../utils/email/sendEmail");

module.exports = {};

module.exports.makePasswordTokenForUserEmail = async (email) => {
  const bcryptSalt = Number(process.env.BCRYPT_SALT);
  const clientURL = process.env.CLIENT_URL;
  const user = await User.findOne({ email });

  if (!user) throw new Error("Email not registered");
  let token = await PasswordToken.findOne({ userId: user._id });
  if (token) await token.deleteOne();
  let resetToken = crypto.randomBytes(32).toString("hex");
  const hash = await bcrypt.hash(resetToken, Number(bcryptSalt));

  await new PasswordToken({
    userId: user._id,
    token: hash
  }).save();

  const link = `${clientURL}/passwordreset?token=${resetToken}&id=${user._id}`;
  sendEmail(
    user.email,
    "Password Reset Request",
    { name: user.username, link: link },
    "./template/requestResetPassword.handlebars",
    "./template/requestResetPassword.txt.handlebars"
  );

  return { message: `Password reset email sent to ${user.email}` };
};

// module.exports.findTokenByUserId = async (userId) => {
//   return await Token.findOne({ userId });
// };

// module.exports.getUserIdFromToken = async (tokenString) => {
//   const token = await Token.findOne({ token: tokenString }).lean();
//   return token ? token.userId : null;
// };

// module.exports.removeToken = async (tokenString) => {
//   return await Token.findOneAndDelete({ token: tokenString });
// };

module.exports.resetPassword = async (userId, token, password) => {
  const bcryptSalt = Number(process.env.BCRYPT_SALT);

  let passwordResetToken = await PasswordToken.findOne({ userId });
  if (!passwordResetToken) {
    throw new Error("Invalid or expired password reset token");
  }
  const isValid = await bcrypt.compare(token, passwordResetToken.token);
  if (!isValid) {
    throw new Error("Invalid or expired password reset token");
  }
  const hash = await bcrypt.hash(password, Number(bcryptSalt));
  await User.updateOne(
    { _id: userId },
    { $set: { password: hash } },
    { new: true }
  );
  const user = await User.findById({ _id: userId });
  sendEmail(
    user.email,
    "Password Reset Successfully",
    {
      name: user.username
    },
    "./template/resetPassword.handlebars",
    "./template/resetPassword.txt.handlebars"
  );
  await passwordResetToken.deleteOne();
  return { message: `Password reset was successful for ${user.email}` };
};
