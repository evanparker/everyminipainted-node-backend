import { Router } from "express";
import mongoose from "mongoose";
import {
  createImage,
  deleteImage,
  findAndUpdateImage,
  getAllImages,
  getImageById
} from "../daos/image";
import { findUserById } from "../daos/user";
import { config } from "../utils/config";
import { UploadFile } from "../utils/files/uploadFile";
import { isLoggedIn } from "./middleware";
const router = Router();

router.post("/", isLoggedIn, async (req, res, next) => {
  try {
    if (req.files?.file) {
      const file = req.files.file;
      const newFilename = `image_${Date.now().toString()}.${file.mimetype.split("/")[1]}`;
      const result = await UploadFile({
        bucketName: config.aws.bucket || "",
        key: newFilename,
        data: file.data
      });

      if (result) {
        const imageObj = {
          s3Key: newFilename,
          s3Bucket: config.aws.bucket,
          type: "s3Image",
          userId: new mongoose.Types.ObjectId(req.userId)
        };
        const image = await createImage(imageObj);
        res.json(image);
      } else {
        throw new Error("error uploading to s3");
      }
    } else {
      throw new Error("file required");
    }
  } catch (e) {
    next(e);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const images = await getAllImages();
    res.json(images);
  } catch (e) {
    next(e);
  }
});

router.put("/:id", isLoggedIn, async (req, res, next) => {
  try {
    let id: string;
    if (Array.isArray(req.params.id)) {
      id = req.params.id[0];
    } else {
      id = req.params.id;
    }
    const image = await getImageById(id);

    if (!image?._id) {
      res.sendStatus(404);
      return;
    }

    const user = await findUserById(req.userId);

    if (
      (!user || !user.roles.includes("admin")) &&
      image.userId._id.toString() !== req.userId?.toString()
    ) {
      res.sendStatus(401);
      return;
    }

    const updatedImage = await findAndUpdateImage(image._id, req.body);
    res.json(updatedImage);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", isLoggedIn, async (req, res, next) => {
  try {
    let id: string;
    if (Array.isArray(req.params.id)) {
      id = req.params.id[0];
    } else {
      id = req.params.id;
    }
    const image = await getImageById(id);

    if (!image?._id) {
      res.sendStatus(404);
      return;
    }

    const user = await findUserById(req.userId);

    if (
      (!user || !user.roles.includes("admin")) &&
      image.userId._id.toString() !== req.userId?.toString()
    ) {
      res.sendStatus(401);
      return;
    }

    const updatedImage = await deleteImage(image._id);
    res.json(updatedImage);
  } catch (e) {
    next(e);
  }
});

export default router;
