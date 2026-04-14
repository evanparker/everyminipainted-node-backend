import { Router } from "express";
import {
  createCollection,
  deleteCollection,
  getAllCollections,
  getCollectionById,
  getCollectionsBySearch,
  getCollectionsIncludingFigure,
  updateCollection
} from "../daos/collection";
import { config } from "../utils/config";
import { isAdmin, isLoggedIn, skip } from "./middleware";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const collections = await getAllCollections(req.query);
    res.json(collections);
  } catch (e) {
    next(e);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const collections = await getCollectionsBySearch(req.query);
    res.json(collections);
  } catch (e) {
    next(e);
  }
});

router.get("/figure/:figureId", async (req, res, next) => {
  try {
    const collection = await getCollectionsIncludingFigure(
      req.params.figureId,
      req.query
    );
    res.json(collection);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const collection = await getCollectionById(req.params.id);

    if (!collection) {
      res.status(404).json({ message: "Collection not found" });
      return;
    }

    res.json(collection);
  } catch (e) {
    if ((e as Error).message.includes("Cast to ObjectId failed")) {
      res.status(404).json({ message: "Collection not found" });
      return;
    }
    next(e);
  }
});

router.post(
  "/",
  isLoggedIn,
  config.features.editCollectionRequiresAdmin ? isAdmin : skip,
  async (req, res, next) => {
    try {
      const collection = await createCollection(req.body);
      res.json(collection);
    } catch (e) {
      next(e);
    }
  }
);

router.put(
  "/:id",
  isLoggedIn,
  config.features.editCollectionRequiresAdmin ? isAdmin : skip,
  async (req, res, next) => {
    try {
      let id: string;
      if (Array.isArray(req.params.id)) {
        id = req.params.id[0];
      } else {
        id = req.params.id;
      }
      const updatedCollection = await updateCollection(id, req.body);
      res.json(updatedCollection);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  "/:id",
  isLoggedIn,
  config.features.editCollectionRequiresAdmin ? isAdmin : skip,
  async (req, res, next) => {
    try {
      let id: string;
      if (Array.isArray(req.params.id)) {
        id = req.params.id[0];
      } else {
        id = req.params.id;
      }
      const deletedCollection = await deleteCollection(id);
      res.json(deletedCollection);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
