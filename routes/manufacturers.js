const { Router } = require("express");
const router = Router();
const FigureDAO = require("../daos/figure");
const ManufacturerDAO = require("../daos/manufacturer");
const { isLoggedIn, isAdmin, skip } = require("./middleware");
const { config } = require("../utils/config");

router.get("/", async (req, res, next) => {
  try {
    const results = await ManufacturerDAO.getAllManufacturers(req.query);
    res.json(results);
  } catch (e) {
    next(e);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const results = await ManufacturerDAO.getManufacturersBySearch(req.query);
    res.json(results);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const manufacturer = await ManufacturerDAO.getManufacturerById(
      req.params.id
    );

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
    const results = await FigureDAO.getFiguresBymanufacturerId(
      req.params.id,
      req.query
    );
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
      const manufacturer = await ManufacturerDAO.createManufacturer(req.body);
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
      const updatedManufacturer = await ManufacturerDAO.updateManufacturer(
        req.params.id,
        req.body
      );
      res.json(updatedManufacturer);
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
      const deletedManufacturer = await ManufacturerDAO.deleteManufacturer(
        req.params.id
      );
      res.json(deletedManufacturer);
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
