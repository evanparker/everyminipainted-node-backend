import { config as dotenvConfig } from "dotenv";
import { toBool } from "./toBool";
dotenvConfig();

export const config = {
  aws: {
    bucket: process.env["AWS_S3_BUCKET"],
    region: process.env["AWS_REGION"],
    accessKey: process.env["AWS_ACCESS_KEY_ID"],
    secretKey: process.env["AWS_SECRET_ACCESS_KEY"]
  },
  features: {
    editFigureRequiresAdmin:
      process.env["EDIT_FIGURE_REQUIRES_ADMIN"] !== undefined
        ? toBool(process.env["EDIT_FIGURE_REQUIRES_ADMIN"])
        : true,
    editCollectionRequiresAdmin:
      process.env["EDIT_COLLECTION_REQUIRES_ADMIN"] !== undefined
        ? toBool(process.env["EDIT_COLLECTION_REQUIRES_ADMIN"])
        : true,
    editManufacturerRequiresAdmin:
      process.env["EDIT_MANUFACTURER_REQUIRES_ADMIN"] !== undefined
        ? toBool(process.env["EDIT_MANUFACTURER_REQUIRES_ADMIN"])
        : true,
    createUserRequiresInvite:
      process.env["CREATE_USER_REQUIRES_INVITE"] !== undefined
        ? toBool(process.env["CREATE_USER_REQUIRES_INVITE"])
        : true
  }
};
