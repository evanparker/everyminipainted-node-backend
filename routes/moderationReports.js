const { Router } = require("express");
const router = Router();
const MiniDAO = require("../daos/mini");
const ModerationReportDAO = require("../daos/moderationReport");
const UserDAO = require("../daos/user");
const { isLoggedIn, isAdmin } = require("./middleware");

router.get("/", async (req, res, next) => {
  try {
    const reports = await ModerationReportDAO.getAllModerationReports(
      req.query
    );
    res.json(reports);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const report = await ModerationReportDAO.getModerationReport(req.params.id);
    res.json(report);
  } catch (e) {
    next(e);
  }
});

router.post("/", isLoggedIn, async (req, res, next) => {
  try {
    const report = await ModerationReportDAO.createModerationReport(
      req.userId,
      req.body
    );
    res.json(report);
  } catch (e) {
    next(e);
  }
});

router.put("/:id", isLoggedIn, isAdmin, async (req, res, next) => {
  try {
    const report = await ModerationReportDAO.updateModerationReport(
      req.params.id,
      req.body
    );
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

module.exports = router;
