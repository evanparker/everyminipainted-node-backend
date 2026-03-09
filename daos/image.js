const Image = require("../models/image");

module.exports = {};

module.exports.getAllImages = async () => {
  // todo: pagination
  return await Image.find().lean();
};

module.exports.getImageById = async (id) => {
  return await Image.findById(id).lean();
};

module.exports.getImagesByIds = async (ids) => {
  return await Image.find({ _id: { $in: ids } }).lean();
};

// module.exports.getImagesByUserId = async (userId) => {
//   // todo: pagination
//   return await Image.find({ userId }).lean();
// };

module.exports.createImage = async (ImageObj) => {
  return await Image.create(ImageObj);
};

module.exports.findAndUpdateImage = async (id, ImageObj) => {
  return await Image.findOneAndUpdate({ _id: id }, ImageObj, {
    new: true
  });
};

module.exports.deleteImage = async (id) => {
  return await Image.findOneAndDelete({ _id: id });
};
