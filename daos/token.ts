import { randomBytes } from "crypto";
import Token from "../models/token";

export async function makeTokenForUserId(userId: string) {
  const buffer = await randomBytes(48);
  const token = buffer.toString("hex");
  return await Token.create({ userId, token });
}

export async function getUserIdFromToken(tokenString: string) {
  const token = await Token.findOne({ token: tokenString }).lean();
  return token ? token.userId : null;
}

export async function removeToken(tokenString: string) {
  return await Token.findOneAndDelete({ token: tokenString });
}
