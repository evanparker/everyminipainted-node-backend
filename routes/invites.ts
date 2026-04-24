import { Router } from "express";
import {
  createInvite,
  deleteInvite,
  getAllInvites,
  getInviteByCode
} from "../daos/invite";
import { isAdmin, isLoggedIn } from "./middleware";
const router = Router();

router.post("/", isLoggedIn, isAdmin, async (req, res, next) => {
  try {
    const inviteObj = req.body;
    const invite = await createInvite(inviteObj);
    res.json(invite);
  } catch (e) {
    next(e);
  }
});

router.get("/", isLoggedIn, isAdmin, async (req, res, next) => {
  try {
    const invites = await getAllInvites();
    res.json(invites);
  } catch (e) {
    next(e);
  }
});

router.get("/:code", isLoggedIn, isAdmin, async (req, res, next) => {
  try {
    let code: string;
    if (Array.isArray(req.params.code)) {
      code = req.params.code[0];
    } else {
      code = req.params.code;
    }
    const invite = await getInviteByCode(code);
    if (!invite) {
      res.status(404).json({ message: "Invite code not found" });
      return;
    }
    res.json(invite);
  } catch (e) {
    next(e);
  }
});

router.delete("/:code", isLoggedIn, isAdmin, async (req, res, next) => {
  try {
    let code: string;
    if (Array.isArray(req.params.code)) {
      code = req.params.code[0];
    } else {
      code = req.params.code;
    }
    const invite = await deleteInvite(code);
    if (!invite) {
      res.status(404).json({ message: "Invite code not found" });
      return;
    }
    res.json(invite);
  } catch (e) {
    next(e);
  }
});

export default router;
