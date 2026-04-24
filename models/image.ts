import mongoose, { InferSchemaType, Schema, model } from "mongoose";

const imageSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
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

export type IImage = InferSchemaType<typeof imageSchema> & {
  _id?: mongoose.Types.ObjectId;
};

export default model("images", imageSchema);
