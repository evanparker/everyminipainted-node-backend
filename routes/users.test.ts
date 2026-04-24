import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test
} from "@jest/globals";
import request from "supertest";
import * as MiniDao from "../daos/mini";
import * as UserDao from "../daos/user";
import Invite from "../models/invite";
import Mini from "../models/mini";
import User, { IUser } from "../models/user";
import server from "../server";
import testUtils from "../test-utils";

const createUserSpy = jest.spyOn(UserDao, "createUser");
const findUserByEmailSpy = jest.spyOn(UserDao, "findUserByEmail");
const findUserByUsernameSpy = jest.spyOn(UserDao, "findUserByUsername");
const findUserByIdSpy = jest.spyOn(UserDao, "findUserById");
const updateUserPasswordSpy = jest.spyOn(UserDao, "updateUserPassword");
const updateUserSpy = jest.spyOn(UserDao, "updateUser");
const addFavoriteSpy = jest.spyOn(UserDao, "addFavorite");
const removeFavoriteSpy = jest.spyOn(UserDao, "removeFavorite");
const getMinisByUserIdSpy = jest.spyOn(MiniDao, "getMinisByUserId");

const userNormal: Partial<IUser> = {
  email: "user-normal@mail.com",
  username: "user-normal",
  password: "999password"
};
const userAdmin: Partial<IUser> = {
  email: "user-admin@mail.com",
  username: "user-admin",
  password: "999password"
};

describe("routes/users", () => {
  beforeAll(testUtils.connectDB);
  afterAll(testUtils.stopDB);
  afterEach(async () => {
    await testUtils.clearDB();
    jest.clearAllMocks();
  });

  let exampleUser: Partial<IUser> | null;
  let exampleAdminUser: Partial<IUser> | null;
  let exampleUserToken: string;
  let exampleAdminToken: string;

  beforeEach(async () => {
    await Invite.create({ code: "setup1" });
    await request(server).post("/auth/signup").send({
      email: userNormal.email,
      username: userNormal.username,
      password: userNormal.password,
      invite: "setup1"
    });
    exampleUser = await User.findOne({ email: userNormal.email }).lean();

    await Invite.create({ code: "setup2" });
    await request(server).post("/auth/signup").send({
      email: userAdmin.email,
      username: userAdmin.username,
      password: userAdmin.password,
      invite: "setup2"
    });
    exampleAdminUser = await User.findOne({
      email: userAdmin.email
    }).lean();
    await User.updateOne(
      { _id: exampleAdminUser?._id },
      { roles: ["user", "admin"] }
    );

    const resUser = await request(server).post("/auth/login").send({
      email: userNormal.email,
      password: userNormal.password
    });
    exampleUserToken = resUser.body.token;

    const resAdmin = await request(server).post("/auth/login").send({
      email: userAdmin.email,
      password: userAdmin.password
    });
    exampleAdminToken = resAdmin.body.token;
  });

  describe("GET /me", () => {
    test("returns current user", async () => {
      const res = await request(server)
        .get("/users/me")
        .set("Authorization", `Bearer ${exampleUserToken}`);
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(exampleUser?._id?.toString());
      expect(res.body.email).toBe(exampleUser?.email);
      expect(res.body.username).toBe(exampleUser?.username);
      expect(res.body.password).toBeUndefined();
      expect(findUserByIdSpy).toHaveBeenCalledTimes(1);
    });

    test("returns 401 if not logged in", async () => {
      const res = await request(server).get("/users/me");
      expect(res.status).toBe(401);
    });

    test("returns 500 if db error occurs", async () => {
      findUserByIdSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server)
        .get("/users/me")
        .set("Authorization", `Bearer ${exampleUserToken}`);
      expect(res.status).toBe(500);
      expect(findUserByIdSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /:username", () => {
    test("returns user with given username", async () => {
      const res = await request(server).get(`/users/${exampleUser?.username}`);
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(exampleUser?._id?.toString());
      expect(res.body.email).toBe(exampleUser?.email);
      expect(res.body.username).toBe(exampleUser?.username);
      expect(res.body.password).toBeUndefined();
      expect(findUserByUsernameSpy).toHaveBeenCalledTimes(1);
    });

    test("returns 404 if user not found", async () => {
      const res = await request(server).get("/users/nonexistentuser");
      expect(res.status).toBe(404);
    });

    test("returns 500 if db error occurs", async () => {
      findUserByUsernameSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server).get(`/users/${exampleUser?.username}`);
      expect(res.status).toBe(500);
      expect(findUserByUsernameSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("PUT /me/setfavorite/", () => {
    test("adds favorite if value is true", async () => {
      const mini = await Mini.create({
        name: "Test Mini",
        userId: exampleUser?._id,
        images: []
      });
      const res = await request(server)
        .put("/users/me/setfavorite/")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({ id: mini._id, value: true });
      expect(res.status).toBe(200);
      expect(addFavoriteSpy).toHaveBeenCalledTimes(1);
      const updatedUser = await User.findById(exampleUser?._id).lean();
      expect(updatedUser?.favorites[mini._id.toString()]).toBeDefined();
    });

    test("removes favorite if value is false", async () => {
      const mini = await Mini.create({
        name: "Test Mini",
        userId: exampleUser?._id,
        images: []
      });
      await User.findByIdAndUpdate(exampleUser?._id, {
        favorites: { [mini._id.toString()]: mini._id.toString() }
      });
      const res = await request(server)
        .put("/users/me/setfavorite/")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({ id: mini._id, value: false });
      expect(res.status).toBe(200);
      const updatedUser = await User.findById(exampleUser?._id).lean();
      expect(updatedUser?.favorites[mini._id.toString()]).toBeUndefined();
      expect(removeFavoriteSpy).toHaveBeenCalledTimes(1);
    });

    test("returns 401 if not logged in", async () => {
      const res = await request(server)
        .put("/users/me/setfavorite/")
        .send({ id: "someid", value: true });
      expect(res.status).toBe(401);
    });

    test("returns 500 if db error occurs", async () => {
      addFavoriteSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server)
        .put("/users/me/setfavorite/")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({ id: "someid", value: true });
      expect(res.status).toBe(500);
      expect(addFavoriteSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /:username/minis", () => {
    test("returns minis for given username", async () => {
      const mini = await Mini.create({
        name: "Test Mini",
        userId: exampleUser?._id,
        images: []
      });
      const res = await request(server).get(
        `/users/${exampleUser?.username}/minis`
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.docs)).toBe(true);
      expect(res.body.docs.length).toBe(1);
      expect(res.body.docs[0]._id).toBe(mini._id.toString());
      expect(getMinisByUserIdSpy).toHaveBeenCalledTimes(1);
    });

    test("returns 404 if user not found", async () => {
      const res = await request(server).get("/users/nonexistentuser/minis");
      expect(res.status).toBe(404);
    });

    test("returns 500 if db error occurs", async () => {
      getMinisByUserIdSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server).get(
        `/users/${exampleUser?.username}/minis`
      );
      expect(res.status).toBe(500);
      expect(getMinisByUserIdSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("PUT /:id", () => {
    test("updates user ", async () => {
      const res = await request(server)
        .put(`/users/${exampleUser?._id}`)
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({ description: "updated description" });
      expect(res.status).toBe(200);
      const updatedUser = await User.findById(exampleUser?._id).lean();
      expect(updatedUser?.description).toBe("updated description");
    });

    test("returns 404 if user not found", async () => {
      const res = await request(server)
        .put("/users/64bfcaa0c9e77c23a1fbb123")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({ description: "updated description" });
      expect(res.status).toBe(404);
    });

    test("returns 401 if not owner or admin", async () => {
      const res = await request(server)
        .put(`/users/${exampleAdminUser?._id}`)
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({ description: "updated description" });
      expect(res.status).toBe(401);
    });

    test("admin can update other user", async () => {
      const res = await request(server)
        .put(`/users/${exampleUser?._id}`)
        .set("Authorization", `Bearer ${exampleAdminToken}`)
        .send({ description: "updated description" });
      expect(res.status).toBe(200);
      const updatedUser = await User.findById(exampleUser?._id).lean();
      expect(updatedUser?.description).toBe("updated description");
    });
  });
});
