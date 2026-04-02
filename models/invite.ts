import { InferSchemaType, Schema, model } from "mongoose";

const inviteSchema = new Schema({
  code: { type: String, index: true, required: true, unique: true },
  expires: { type: Date },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

export type IInvite = InferSchemaType<typeof inviteSchema>;

export default model<IInvite>("invite", inviteSchema);
