import { InferSchemaType, model, PaginateModel, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const moderationReportSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true
  },
  mini: {
    type: Schema.Types.ObjectId,
    ref: "minis",
    required: true
  },
  description: { type: String },
  reason: {
    type: String,
    enum: [
      "NSFW",
      "notAMini",
      "hateSpeech",
      "harassment",
      "spam",
      "privacyViolation",
      "intellectualPropertyViolation",
      "other"
    ]
  },
  status: {
    type: String,
    enum: ["open", "accepted", "rejected"],
    default: "open"
  },
  resolution: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

moderationReportSchema.plugin(mongoosePaginate);

export type IModerationReport = InferSchemaType<typeof moderationReportSchema>;

export default model<IModerationReport, PaginateModel<IModerationReport>>(
  "moderationReports",
  moderationReportSchema
);
