import mongoose from "mongoose";
import Image, { IImage } from "../models/image";

export async function getAllImages() {
  // todo: pagination
  return await Image.find().lean();
}

export async function getImageById(id: string | mongoose.Types.ObjectId) {
  return await Image.findById(id).lean();
}

export async function getImagesByIds(
  ids: string[] | mongoose.Types.ObjectId[]
) {
  return await Image.find({ _id: { $in: ids } }).lean();
}

// module.exports.getImagesByUserId = async (userId: string) => {
//   // todo: pagination
//   return await Image.find({ userId }).lean();
// };

export async function createImage(ImageObj: Partial<IImage>) {
  return await Image.create(ImageObj);
}

export async function findAndUpdateImage(
  id: string | mongoose.Types.ObjectId,
  ImageObj: Partial<IImage>
) {
  return await Image.findOneAndUpdate({ _id: id }, ImageObj, {
    new: true
  });
}

export async function deleteImage(id: string | mongoose.Types.ObjectId) {
  return await Image.findOneAndDelete({ _id: id });
}

export default {
  getAllImages,
  getImageById,
  getImagesByIds,
  createImage,
  findAndUpdateImage,
  deleteImage
};
