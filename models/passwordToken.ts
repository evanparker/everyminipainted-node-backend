import { InferSchemaType, Schema, model } from "mongoose";

const passwordTokenSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true
  },
  token: { type: String, index: true, required: true, unique: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600
  }
});

export type IPasswordToken = InferSchemaType<typeof passwordTokenSchema>;

export default model("passwordTokens", passwordTokenSchema);
