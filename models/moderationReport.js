const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const moderationReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true
  },
  mini: {
    type: mongoose.Schema.Types.ObjectId,
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

module.exports = mongoose.model("moderationReports", moderationReportSchema);
