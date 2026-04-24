import server from "./server";
import mongoose from "mongoose";

const port: number = parseInt(process.env.PORT) || 3001;
const mongoURL: string =
  process.env.DB_URL || "mongodb://127.0.0.1/every-mini-painted-cloudinary";

mongoose.connect(mongoURL, {}).then(() => {
  server.listen(port, "::", () => {
    console.log(`Server is listening on http://localhost:${port}`);
  });
});
