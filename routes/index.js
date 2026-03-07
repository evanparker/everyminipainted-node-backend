const { Router } = require("express");
const router = Router();

router.use("/auth", require("./auth"));
router.use("/images", require("./images"));
router.use("/invites", require("./invites"));
router.use("/minis", require("./minis"));
router.use("/users/", require("./users"));
router.use("/manufacturers/", require("./manufacturers"));
router.use("/figures/", require("./figures"));
router.use("/collections/", require("./collections"));
router.use("/moderation-reports/", require("./moderationReports"));

router.use(function (err, req, res, next) {
  if (err.message.includes("Cast to ObjectId failed for value")) {
    res.status(404);
    res.json({ message: err.message });
    return;
  }
  if (
    err.message.includes("duplicate key error collection") ||
    err.message.includes("must be unique")
  ) {
    res.status(409);
    res.json({ message: err.message });
    return;
  }
  if (err.message.includes("validation failed")) {
    res.status(400);
    res.json({ message: err.message });
    return;
  }

  console.error(err);
  res.status(500);
  res.json({ message: err.message });
});

module.exports = router;
