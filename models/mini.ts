import mongoose, {
  InferSchemaType,
  PaginateModel,
  Query,
  Schema,
  model
} from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

interface QueryWithOptions extends Query<any, any> {
  options?: {
    getDeleted?: boolean;
  };
}

const miniSchema = new Schema({
  name: { type: String },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true
  },
  images: [{ type: Schema.Types.ObjectId, ref: "images" }],
  thumbnail: { type: Schema.Types.ObjectId, ref: "images" },
  figure: { type: Schema.Types.ObjectId, ref: "figures" },
  description: { type: String },
  favorites: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  blur: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
});

miniSchema.index({ name: 1 });

miniSchema.plugin(mongoosePaginate);

miniSchema.pre<QueryWithOptions>("find", function () {
  if (!this.options?.getDeleted) {
    this.where({ isDeleted: false });
  }
});

miniSchema.pre<QueryWithOptions>("findOne", function () {
  if (!this.options?.getDeleted) {
    this.where({ isDeleted: false });
  }
});

export type IMini = InferSchemaType<typeof miniSchema> & {
  _id?: mongoose.Types.ObjectId;
};

export default model<IMini, PaginateModel<IMini>>("minis", miniSchema);
