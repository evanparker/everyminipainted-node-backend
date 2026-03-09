const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true
  },
  type: { type: String, default: "urlImage" }, // urlImage, s3Image, or cloudinaryImage
  cloudinaryPublicId: { type: String },
  url: { type: String },
  s3Bucket: { type: String },
  s3Key: { type: String },
  caption: { type: String },
  altText: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model("images", imageSchema);
