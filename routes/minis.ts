import { Router } from "express";
import { getImagesByIds } from "../daos/image";
import {
  createMini,
  deleteMini,
  getAllMinis,
  getMiniById,
  getMinisBySearch,
  updateMini
} from "../daos/mini";
import { findUserById } from "../daos/user";
import { isLoggedIn } from "./middleware";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const result = await getAllMinis(req.query);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const results = await getMinisBySearch(req.query);
    res.json(results);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const mini = await getMiniById(req.params.id);

    if (!mini) {
      res.status(404).json({ message: "Mini not found" });
      return;
    }

    res.json(mini);
  } catch (e) {
    next(e);
  }
});

router.post("/", isLoggedIn, async (req, res, next) => {
  try {
    const imageIds = req.body.images;
    const images = await getImagesByIds(imageIds);
    if (images.length !== imageIds.length) {
      res.status(400).json({ message: "Linked images not found" });
      return;
    }

    const mini = await createMini({
      ...req.body,
      userId: req.userId
    });
    res.json(mini);
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

    const mini = await getMiniById(id);
    const user = await findUserById(req.userId);
    if (
      (!user || !user.roles.includes("admin")) &&
      mini?.userId._id.toString() !== req.userId?.toString()
    ) {
      res.sendStatus(401);
      return;
    }
    const updatedMini = await updateMini(id, req.body);
    res.json(updatedMini);
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
    const mini = await getMiniById(id);
    const user = await findUserById(req.userId);
    if (
      (!user || !user.roles.includes("admin")) &&
      mini?.userId._id.toString() !== req.userId?.toString()
    ) {
      res.sendStatus(401);
      return;
    }

    const deletedMini = await deleteMini(id);
    res.json(deletedMini);
  } catch (e) {
    next(e);
  }
});
export default router;
