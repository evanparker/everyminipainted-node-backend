const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const collectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  manufacturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "manufacturers"
  },
  figures: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "figures"
    }
  ],
  images: [{ type: mongoose.Schema.Types.ObjectId, ref: "images" }],
  thumbnail: { type: mongoose.Schema.Types.ObjectId, ref: "images" },
  description: { type: String },
  website: { type: String },
  partNumber: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

collectionSchema.index({ name: 1, partNumber: 1 });

collectionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("collections", collectionSchema);
