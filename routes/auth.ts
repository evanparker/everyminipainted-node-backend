import { compare, hash } from "bcrypt";
import { Router } from "express";
import { deleteInvite, getInviteByCode } from "../daos/invite";
import {
  makePasswordTokenForUserEmail,
  resetPassword
} from "../daos/passwordToken";
import { makeTokenForUserId, removeToken } from "../daos/token";
import { createUser, findUserByEmail, updateUserPassword } from "../daos/user";
import { config } from "../utils/config";
import { isLoggedIn } from "./middleware";
const router = Router();

const bcryptSalt = Number(process.env.BCRYPT_SALT);

router.post("/signup", async (req, res, next) => {
  try {
    let { password, email, username, invite } = req.body;

    if (config.features.createUserRequiresInvite) {
      const inviteObj = await getInviteByCode(invite);
      if (!inviteObj) {
        res.status(400).send({ message: "Missing or invalid invite code" });
        return;
      }
    }
    if (password && email && username) {
      const hashedPassword = await hash(password, bcryptSalt);
      const user = await createUser({
        password: hashedPassword,
        email,
        username,
        roles: ["user"]
      });
      await deleteInvite(invite);
      res.json(user);
    } else {
      res.sendStatus(400);
    }
  } catch (e) {
    if ((e as Error).message.includes("duplicate key error collection")) {
      if ((e as Error).message.includes("key: { username:")) {
        res.status(409).send({ message: "Username already in use" });
        return;
      } else if ((e as Error).message.includes("key: { email:")) {
        res.status(409).send({ message: "Email already in use" });
        return;
      } else {
        res.status(409).send({ message: "Duplicate key error" });
        return;
      }
    }
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    let { password, email } = req.body;
    if (!password) {
      res.status(400).json({ message: "Missing password" });
      return;
    }
    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }
    const passwordMatch = await compare(password, user.password);
    if (passwordMatch) {
      const token = await makeTokenForUserId(user._id);
      res.json(token);
    } else {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }
  } catch (e) {
    next(e);
  }
});

router.put("/password", isLoggedIn, async (req, res, next) => {
  try {
    let { password } = req.body;
    let userId = req.userId;
    if (!password) {
      res.status(400);
      res.json();
      return;
    }
    const hashedPassword = await hash(password, bcryptSalt);
    const updatedUser = await updateUserPassword(userId, hashedPassword);
    res.json(updatedUser);
  } catch (e) {
    next(e);
  }
});

router.post("/resetpassword", async (req, res, next) => {
  try {
    const resetPasswordService = await resetPassword(
      req.body.userId,
      req.body.token,
      req.body.password
    );
    return res.json(resetPasswordService);
  } catch (e) {
    if (
      (e as Error).message.includes("Invalid or expired password reset token")
    ) {
      res.status(404).send({ message: (e as Error).message });
      return;
    }
    next(e);
  }
});

router.post("/forgotpassword", async (req, res, next) => {
  try {
    const requestPasswordResetService = await makePasswordTokenForUserEmail(
      req.body.email
    );
    return res.json(requestPasswordResetService);
  } catch (e) {
    if ((e as Error).message.includes("Email not registered")) {
      res.status(404).send({ message: (e as Error).message });
      return;
    }
    next(e);
  }
});

router.post("/logout", isLoggedIn, async (req, res, next) => {
  try {
    const token = await removeToken(req.tokenString);
    if (token) {
      res.json(token);
    } else {
      res.sendStatus(404);
    }
  } catch (e) {
    next(e);
  }
});

export default router;
