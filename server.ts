import express, { json } from "express";
import cors from "cors";

import routes from "./routes";
import fileUpload from "express-fileupload";

const server = express();
// enabling CORS for any unknown origin(https://xyz.example.com)
server.use(cors());
server.use(json());
server.use(fileUpload());

server.use(routes);

export default server;
