import { NextFunction, Request, Response, Router } from "express";
const router = Router();

router.use("/auth", require("./auth").default);
router.use("/images", require("./images").default);
router.use("/invites", require("./invites").default);
router.use("/minis", require("./minis").default);
router.use("/users/", require("./users").default);
router.use("/manufacturers/", require("./manufacturers").default);
router.use("/figures/", require("./figures").default);
router.use("/collections/", require("./collections").default);
router.use("/moderation-reports/", require("./moderationReports").default);

router.use(function (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
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

export default router;
