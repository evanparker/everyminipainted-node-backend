import mongoose, {
  InferSchemaType,
  PaginateModel,
  Schema,
  model
} from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const manufacturerSchema = new Schema({
  name: { type: String, index: true, required: true },
  images: [{ type: Schema.Types.ObjectId, ref: "images" }],
  thumbnail: { type: Schema.Types.ObjectId, ref: "images" },
  website: { type: String },
  description: { type: String },
  socials: [
    {
      service: { type: String },
      link: { type: String }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

export type IManufacturer = InferSchemaType<typeof manufacturerSchema> & {
  _id?: mongoose.Types.ObjectId;
};

manufacturerSchema.plugin(mongoosePaginate);

export default model<IManufacturer, PaginateModel<IManufacturer>>(
  "manufacturers",
  manufacturerSchema
);
