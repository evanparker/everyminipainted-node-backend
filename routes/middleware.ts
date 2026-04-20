import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { getUserIdFromToken } from "../daos/token";
import { findUserById } from "../daos/user";

// Extend Express Request type to include required fields
declare module "express-serve-static-core" {
  interface Request {
    userId?: string | mongoose.Types.ObjectId;
    tokenString?: string;
    files?: { file: Express.Multer.File & { data?: Buffer } };
  }
}

export async function isLoggedIn(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let tokenString = req.headers.authorization;
    if (typeof tokenString === "string") {
      tokenString = tokenString.slice(7); // "remove 'Bearer '"
      req.tokenString = tokenString;
    }
    const userId = await getUserIdFromToken(tokenString);
    if (userId) {
      req.userId = userId;
      next();
    } else {
      res.sendStatus(401);
    }
  } catch (e) {
    next(e);
  }
}

export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await findUserById(req.userId);
    if (user?.roles.includes("admin")) {
      next();
      return true;
    } else {
      res.sendStatus(403);
      return false;
    }
  } catch (e) {
    next(e);
  }
}

export async function skip(req: Request, res: Response, next: NextFunction) {
  try {
    next();
  } catch (e) {
    next(e);
  }
}
