import { Router } from "express";
import { getFiguresBymanufacturerId } from "../daos/figure";
import {
  createManufacturer,
  deleteManufacturer,
  getAllManufacturers,
  getManufacturerById,
  getManufacturersBySearch,
  updateManufacturer
} from "../daos/manufacturer";
import { config } from "../utils/config";
import { isAdmin, isLoggedIn, skip } from "./middleware";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const results = await getAllManufacturers(req.query);
    res.json(results);
  } catch (e) {
    next(e);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const results = await getManufacturersBySearch(req.query);
    res.json(results);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const manufacturer = await getManufacturerById(req.params.id);

    if (!manufacturer) {
      res.status(404).json({ message: "Manufacturer not found" });
      return;
    }

    res.json(manufacturer);
  } catch (e) {
    next(e);
  }
});

router.get("/:id/figures", async (req, res, next) => {
  try {
    const results = await getFiguresBymanufacturerId(req.params.id, req.query);
    res.json(results);
  } catch (e) {
    next(e);
  }
});

router.post(
  "/",
  isLoggedIn,
  config.features.editManufacturerRequiresAdmin ? isAdmin : skip,
  async (req, res, next) => {
    try {
      const manufacturer = await createManufacturer(req.body);
      res.json(manufacturer);
    } catch (e) {
      next(e);
    }
  }
);

router.put(
  "/:id",
  isLoggedIn,
  config.features.editManufacturerRequiresAdmin ? isAdmin : skip,
  async (req, res, next) => {
    try {
      let id: string;
      if (Array.isArray(req.params.id)) {
        id = req.params.id[0];
      } else {
        id = req.params.id;
      }
      const manufacturer = await getManufacturerById(id);
      if (!manufacturer) {
        res.status(404).json({ message: "Manufacturer not found" });
        return;
      }
      const response = await updateManufacturer(id, req.body);
      res.json(response);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  "/:id",
  isLoggedIn,
  config.features.editManufacturerRequiresAdmin ? isAdmin : skip,
  async (req, res, next) => {
    try {
      let id: string;
      if (Array.isArray(req.params.id)) {
        id = req.params.id[0];
      } else {
        id = req.params.id;
      }
      const manufacturer = await getManufacturerById(id);
      if (!manufacturer) {
        res.status(404).json({ message: "Manufacturer not found" });
        return;
      }
      const deletedManufacturer = await deleteManufacturer(id);
      res.json(deletedManufacturer);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
