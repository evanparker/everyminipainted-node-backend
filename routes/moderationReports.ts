import { Router } from "express";
import {
  createModerationReport,
  getAllModerationReports,
  getModerationReport,
  updateModerationReport
} from "../daos/moderationReport";
import { isAdmin, isLoggedIn } from "./middleware";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const reports = await getAllModerationReports(req.query);
    res.json(reports);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const report = await getModerationReport(req.params.id);
    res.json(report);
  } catch (e) {
    next(e);
  }
});

router.post("/", isLoggedIn, async (req, res, next) => {
  try {
    const report = await createModerationReport(req.userId, req.body);
    res.json(report);
  } catch (e) {
    next(e);
  }
});

router.put("/:id", isLoggedIn, isAdmin, async (req, res, next) => {
  try {
    let id: string;
    if (Array.isArray(req.params.id)) {
      id = req.params.id[0];
    } else {
      id = req.params.id;
    }
    const report = await updateModerationReport(id, req.body);
    res.json(report);
  } catch (e) {
    next(e);
  }
});

// router.delete("/:id", isLoggedIn, isAdmin, async (req, res, next) => {
//   try {
//     res.json();
//   } catch (e) {
//     next(e);
//   }
// });

export default router;
