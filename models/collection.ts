import mongoose, {
  InferSchemaType,
  model,
  PaginateModel,
  Schema
} from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const collectionSchema = new Schema(
  {
    name: { type: String, required: true },
    manufacturer: {
      type: Schema.Types.ObjectId,
      ref: "manufacturers"
    },
    figures: [
      {
        type: Schema.Types.ObjectId,
        ref: "figures"
      }
    ],
    images: [{ type: Schema.Types.ObjectId, ref: "images" }],
    thumbnail: { type: Schema.Types.ObjectId, ref: "images" },
    description: { type: String },
    website: { type: String },
    partNumber: { type: String }
  },
  { timestamps: true }
);

collectionSchema.index({ name: 1, partNumber: 1 });

collectionSchema.plugin(mongoosePaginate);

export type ICollection = InferSchemaType<typeof collectionSchema> & {
  _id?: mongoose.Types.ObjectId;
};

export default model<ICollection, PaginateModel<ICollection>>(
  "collections",
  collectionSchema
);
