import { randomBytes } from "crypto";
import mongoose from "mongoose";
import Token from "../models/token";

export async function makeTokenForUserId(
  userId: mongoose.Types.ObjectId | string
) {
  const buffer = await randomBytes(48);
  const token = buffer.toString("hex");
  return await Token.create({ userId, token });
}

export async function getUserIdFromToken(tokenString?: string) {
  const token = await Token.findOne({ token: tokenString }).lean();
  return token ? token.userId : null;
}

export async function removeToken(
  tokenString?: string | mongoose.Types.ObjectId
) {
  return await Token.findOneAndDelete({ token: tokenString });
}
