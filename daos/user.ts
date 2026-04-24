import mongoose from "mongoose";
import Mini from "../models/mini";
import User, { IUser } from "../models/user";

export async function createUser(userData: Partial<IUser>) {
  return await User.create(userData);
}

export async function findUserByEmail(email: string) {
  return await User.findOne({ email }).lean().populate({ path: "avatar" });
}

export async function findUserByUsername(username: string) {
  return await User.findOne({ username }).lean().populate({ path: "avatar" });
}

export async function findUserById(_id?: string | mongoose.Types.ObjectId) {
  return await User.findById(_id).lean().populate({ path: "avatar" });
}

export async function updateUserPassword(
  userId: string | mongoose.Types.ObjectId | undefined,
  password: string
) {
  return await User.findOneAndUpdate(
    { _id: userId },
    { password },
    { new: true }
  );
}

export async function updateUser(
  userId: string | mongoose.Types.ObjectId | undefined,
  userObj: Partial<IUser>
) {
  delete userObj.password;
  return await User.findOneAndUpdate({ _id: userId }, userObj, { new: true });
}

export async function addFavorite(
  userId: string | mongoose.Types.ObjectId | undefined,
  _id: string
) {
  const user = await User.findOne({ _id: userId });
  if (!user) {
    throw new Error("User not found");
  }
  user.favorites.set(_id, new mongoose.Types.ObjectId(_id));
  await Mini.findByIdAndUpdate(_id, { $inc: { favorites: 1 } });
  return await user.save();
}
export async function removeFavorite(
  userId: string | mongoose.Types.ObjectId | undefined,
  _id: string
) {
  const user = await User.findOne({ _id: userId });
  if (!user) {
    throw new Error("User not found");
  }
  if (!user.favorites.has(_id)) {
    throw new Error("Mini not in favorites");
  }
  user.favorites.delete(_id);
  await Mini.findByIdAndUpdate(_id, { $inc: { favorites: -1 } });
  return await user.save();
}
