const { Router } = require("express");
const router = Router();
const FigureDAO = require("../daos/figure");
const CollectionDAO = require("../daos/collection");
const { isLoggedIn, isAdmin, skip } = require("./middleware");
const { config } = require("../utils/config");

router.get("/", async (req, res, next) => {
  try {
    const collections = await CollectionDAO.getAllCollections(req.query);
    res.json(collections);
  } catch (e) {
    next(e);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const collections = await CollectionDAO.getCollectionsBySearch(req.query);
    res.json(collections);
  } catch (e) {
    next(e);
  }
});

router.get("/figure/:figureId", async (req, res, next) => {
  try {
    const collection = await CollectionDAO.getCollectionsIncludingFigure(
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
    const collection = await CollectionDAO.getCollectionById(req.params.id);

    if (!collection) {
      res.status(404).json({ message: "Collection not found" });
      return;
    }

    res.json(collection);
  } catch (e) {
    next(e);
  }
});

router.post(
  "/",
  isLoggedIn,
  config.features.editCollectionRequiresAdmin ? isAdmin : skip,
  async (req, res, next) => {
    try {
      const collection = await CollectionDAO.createCollection(req.body);
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
      const updatedCollection = await CollectionDAO.updateCollection(
        req.params.id,
        req.body
      );
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
      const deletedCollection = await CollectionDAO.deleteCollection(
        req.params.id
      );
      res.json(deletedCollection);
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
