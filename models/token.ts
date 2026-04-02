import { InferSchemaType, Schema, model } from "mongoose";

const tokenSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true
  },
  token: { type: String, index: true, required: true, unique: true },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

export type IToken = InferSchemaType<typeof tokenSchema>;

export default model("tokens", tokenSchema);
