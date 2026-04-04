import { Router } from "express";
import {
  createFigure,
  deleteFigure,
  getAllFigures,
  getFigureById,
  getFiguresBySearch,
  updateFigure
} from "../daos/figure";
import { getMinisByFigureId } from "../daos/mini";
import { config } from "../utils/config";
import { isAdmin, isLoggedIn, skip } from "./middleware";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const figures = await getAllFigures(req.query);
    res.json(figures);
  } catch (e) {
    next(e);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const figures = await getFiguresBySearch(req.query);
    res.json(figures);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const figure = await getFigureById(req.params.id);

    if (!figure) {
      res.status(404).json({ message: "Figure not found" });
      return;
    }

    res.json(figure);
  } catch (e) {
    next(e);
  }
});

router.get("/:id/minis", async (req, res, next) => {
  try {
    const result = await getMinisByFigureId(req.params.id, req.query);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post(
  "/",
  isLoggedIn,
  config.features.editFigureRequiresAdmin ? isAdmin : skip,
  async (req, res, next) => {
    try {
      const figure = await createFigure(req.body);
      res.json(figure);
    } catch (e) {
      next(e);
    }
  }
);

router.put(
  "/:id",
  isLoggedIn,
  config.features.editFigureRequiresAdmin ? isAdmin : skip,
  async (req, res, next) => {
    try {
      let id: string;
      if (Array.isArray(req.params.id)) {
        id = req.params.id[0];
      } else {
        id = req.params.id;
      }
      const updatedFigure = await updateFigure(id, req.body);
      res.json(updatedFigure);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  "/:id",
  isLoggedIn,
  config.features.editFigureRequiresAdmin ? isAdmin : skip,
  async (req, res, next) => {
    try {
      let id: string;
      if (Array.isArray(req.params.id)) {
        id = req.params.id[0];
      } else {
        id = req.params.id;
      }
      const deletedFigure = await deleteFigure(id);
      res.json(deletedFigure);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
