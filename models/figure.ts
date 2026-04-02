import { InferSchemaType, PaginateModel, Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const figureSchema = new Schema({
  name: { type: String, required: true },
  manufacturer: {
    type: Schema.Types.ObjectId,
    ref: "manufacturers"
  },
  images: [{ type: Schema.Types.ObjectId, ref: "images" }],
  thumbnail: { type: Schema.Types.ObjectId, ref: "images" },
  description: { type: String },
  website: { type: String },
  partNumber: { type: String },
  artist: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

figureSchema.index({ name: 1, partNumber: 1 });

figureSchema.plugin(mongoosePaginate);

export type IFigure = InferSchemaType<typeof figureSchema>;

export default model<IFigure, PaginateModel<IFigure>>("figures", figureSchema);
