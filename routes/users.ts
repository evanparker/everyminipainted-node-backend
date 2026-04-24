import { Router } from "express";
import { getMinisByUserId } from "../daos/mini";
import {
  addFavorite,
  findUserById,
  findUserByUsername,
  removeFavorite,
  updateUser
} from "../daos/user";
import { isLoggedIn } from "./middleware";
const router = Router();

router.get("/:username/minis", async (req, res, next) => {
  try {
    const user = await findUserByUsername(req.params.username);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const result = await getMinisByUserId(user._id, req.query);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get("/me", isLoggedIn, async (req, res, next) => {
  try {
    let user = await findUserById(req.userId);
    delete (user as { password?: string }).password;
    res.json(user);
  } catch (e) {
    next(e);
  }
});

router.put("/me/setfavorite/", isLoggedIn, async (req, res, next) => {
  try {
    let user;
    if (req.body.value) {
      user = await addFavorite(req.userId, req.body.id);
    } else {
      user = await removeFavorite(req.userId, req.body.id);
    }
    delete (user as { password?: string }).password;
    res.json(user);
  } catch (e) {
    next(e);
  }
});

router.get("/:username", async (req, res, next) => {
  try {
    let user = await findUserByUsername(req.params.username);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    delete (user as { password?: string }).password;
    res.json(user);
  } catch (e) {
    next(e);
  }
});

router.put("/:id", isLoggedIn, async (req, res, next) => {
  try {
    const user = await findUserById(req.userId);

    let id: string;
    if (Array.isArray(req.params.id)) {
      id = req.params.id[0];
    } else {
      id = req.params.id;
    }

    const userToEdit = await findUserById(id);
    if (!userToEdit) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (
      !user?.roles.includes("admin") &&
      userToEdit._id.toString() !== req.userId?.toString()
    ) {
      res.status(401).json({ message: "Authentication error" });
      return;
    }
    if (!user?.roles.includes("admin")) {
      delete req.body.roles;
    }
    const updatedUser = await updateUser(userToEdit._id, req.body);
    const updatedUserObj = updatedUser?.toObject();
    delete (updatedUserObj as { password?: string }).password;
    res.json(updatedUserObj);
  } catch (e) {
    next(e);
  }
});

export default router;
