import cors from "cors";
import express, { json } from "express";

import fileUpload from "express-fileupload";
import routes from "./routes";

const server = express();
// enabling CORS for any unknown origin(https://xyz.example.com)
server.use(cors());
server.use(json());
server.use(fileUpload());

server.use(routes);

export default server;
