import Image from "../models/image";

export async function getAllImages() {
  // todo: pagination
  return await Image.find().lean();
}

export async function getImageById(id: string) {
  return await Image.findById(id).lean();
}

export async function getImagesByIds(ids: string[]) {
  return await Image.find({ _id: { $in: ids } }).lean();
}

// module.exports.getImagesByUserId = async (userId: string) => {
//   // todo: pagination
//   return await Image.find({ userId }).lean();
// };

export async function createImage(ImageObj: any) {
  return await Image.create(ImageObj);
}

export async function findAndUpdateImage(id: string, ImageObj: any) {
  return await Image.findOneAndUpdate({ _id: id }, ImageObj, {
    new: true
  });
}

export async function deleteImage(id: string) {
  return await Image.findOneAndDelete({ _id: id });
}
