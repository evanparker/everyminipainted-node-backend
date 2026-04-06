import mongoose, { InferSchemaType, Schema, model } from "mongoose";
import reservedNames from "../utils/reservedNames";

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    index: true,
    unique: true,
    immutable: true,
    trim: true,
    validate: [
      {
        validator: (val: string): boolean => {
          if (!val) return false;
          return !reservedNames.includes(val);
        },
        message: "Username already in use"
      },
      {
        validator: (val: string): boolean => {
          if (!val) return false;
          return val.length >= 3 && val.length <= 30;
        },
        message: "Username must be between 3 and 30 characters"
      },
      {
        validator: (val: string): boolean => {
          if (!val) return false;
          return /^[a-z0-9-_]+$/.test(val);
        },
        message:
          "Username must consist of only lowercase characters, numbers, dashes, and underscores"
      }
    ]
  },
  email: {
    type: String,
    required: true,
    index: true,
    unique: true,
    immutable: true,
    validate: [
      {
        validator: (val: string): boolean => {
          return /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(val);
        },
        message: "Must be a valid email address"
      }
    ],
    trim: true
  },
  password: { type: String, required: true },
  roles: { type: [String], required: true },
  avatar: { type: Schema.Types.ObjectId, ref: "images" },
  website: { type: String },
  description: { type: String },
  socials: [
    {
      service: { type: String },
      link: { type: String }
    }
  ],
  favorites: {
    type: Map,
    of: Schema.Types.ObjectId,
    ref: "minis",
    default: {}
  },
  violations: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

export type IUser = InferSchemaType<typeof userSchema> & {
  _id?: mongoose.Types.ObjectId;
};

export default model("users", userSchema);

// userSchema.pre("save", async function (next) {
//   const bcryptSalt = Number(process.env.BCRYPT_SALT);
//   if (!this.isModified("password")) {
//     return next();
//   }
//   const hash = await bcrypt.hash(this.password, Number(bcryptSalt));
//   this.password = hash;
//   next();
// });

// Example of a Map referencing multiple collections:
// https://github.com/Automattic/mongoose/issues/10584
// favorites: {
//   type: Map,
//   of: {
//     modelId: String,
//     data: [
//       {
//         _id: mongoose.Schema.Types.ObjectId,
//         ref: (doc) => doc.parent().modelId
//       }
//     ]
//   }
// },
