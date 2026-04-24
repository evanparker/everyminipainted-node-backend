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
import mongoose from "mongoose";
import request from "supertest";
import * as imageDao from "../daos/image";
import * as miniDao from "../daos/mini";
import Invite from "../models/invite";
import Mini from "../models/mini";
import User, { IUser } from "../models/user";
import server from "../server";
import testUtils from "../test-utils";

const getAllMinisSpy = jest.spyOn(miniDao, "getAllMinis");
const getMiniByIdSpy = jest.spyOn(miniDao, "getMiniById");
const getMinisBySearchSpy = jest.spyOn(miniDao, "getMinisBySearch");
const createMiniSpy = jest.spyOn(miniDao, "createMini");
const updateMiniSpy = jest.spyOn(miniDao, "updateMini");
const deleteMiniSpy = jest.spyOn(miniDao, "deleteMini");
const getImagesByIdsSpy = jest.spyOn(imageDao, "getImagesByIds");

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

describe("routes/minis", () => {
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

  describe("GET /", () => {
    test("should get all minis", async () => {
      await Mini.create({ name: "Mini 1", userId: exampleUser?._id });
      await Mini.create({ name: "Mini 2", userId: exampleUser?._id });

      const res = await request(server).get("/minis");
      expect(res.status).toBe(200);
      expect(res.body.docs.length).toBe(2);
      expect(getAllMinisSpy).toHaveBeenCalledTimes(1);
    });

    test("should return empty array if no minis", async () => {
      const res = await request(server).get("/minis");
      expect(res.status).toBe(200);
      expect(res.body.docs.length).toBe(0);
      expect(getAllMinisSpy).toHaveBeenCalledTimes(1);
    });

    test("should error if database error occurs", async () => {
      getAllMinisSpy.mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(server).get("/minis");
      expect(res.status).toBe(500);
      expect(getAllMinisSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /:id", () => {
    test("should get mini by id", async () => {
      const mini = await Mini.create({
        name: "Mini 1",
        userId: exampleUser?._id
      });
      const res = await request(server).get(`/minis/${mini._id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Mini 1");
      expect(getMiniByIdSpy).toHaveBeenCalledTimes(1);
    });

    test("should return 404 if mini not found", async () => {
      const res = await request(server).get(
        `/minis/${new mongoose.Types.ObjectId()}`
      );
      expect(res.status).toBe(404);
      expect(getMiniByIdSpy).toHaveBeenCalledTimes(1);
    });

    test("should error if database error occurs", async () => {
      getMiniByIdSpy.mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(server).get(
        `/minis/${new mongoose.Types.ObjectId()}`
      );
      expect(res.status).toBe(500);
      expect(getMiniByIdSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /search", () => {
    test("should get minis matching search query", async () => {
      await Mini.create({ name: "Red Mini", userId: exampleUser?._id });
      await Mini.create({ name: "Blue Mini", userId: exampleUser?._id });
      await Mini.create({ name: "Green Mini", userId: exampleUser?._id });

      const res = await request(server).get("/minis/search?search=Red");
      expect(res.status).toBe(200);
      expect(res.body.docs.length).toBe(1);
      expect(res.body.docs[0].name).toBe("Red Mini");
      expect(getMinisBySearchSpy).toHaveBeenCalledTimes(1);
    });

    test("should return empty array if no matches", async () => {
      const res = await request(server).get("/minis/search?search=Nonexistent");
      expect(res.status).toBe(200);
      expect(res.body.docs.length).toBe(0);
      expect(getMinisBySearchSpy).toHaveBeenCalledTimes(1);
    });

    test("should error if database error occurs", async () => {
      getMinisBySearchSpy.mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(server).get("/minis/search?search=Red");
      expect(res.status).toBe(500);
      expect(getMinisBySearchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /", () => {
    test("should create mini with valid data", async () => {
      const miniData = {
        name: "New Mini",
        userId: exampleUser?._id,
        images: []
      };
      const res = await request(server)
        .post("/minis")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send(miniData);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("New Mini");
      expect(createMiniSpy).toHaveBeenCalledTimes(1);
    });

    test("should return error if linked images not found", async () => {
      const miniData = {
        name: "New Mini",
        images: [new mongoose.Types.ObjectId().toString()]
      };
      const res = await request(server)
        .post("/minis")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send(miniData);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Linked images not found" });
      expect(createMiniSpy).toHaveBeenCalledTimes(0);
    });

    test("should return 500 error if database error occurs when finding images", async () => {
      getImagesByIdsSpy.mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const miniData = {
        name: "New Mini",
        images: []
      };
      const res = await request(server)
        .post("/minis")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send(miniData);
      expect(res.status).toBe(500);
      expect(getImagesByIdsSpy).toHaveBeenCalledTimes(1);
      expect(createMiniSpy).toHaveBeenCalledTimes(0);
    });

    test("should return 500 error if database error occurs when creating mini", async () => {
      createMiniSpy.mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const miniData = {
        name: "New Mini",
        images: []
      };
      const res = await request(server)
        .post("/minis")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send(miniData);
      expect(res.status).toBe(500);
      expect(createMiniSpy).toHaveBeenCalledTimes(1);
    });

    test("should return 401 error if not authenticated", async () => {
      const miniData = {
        name: "New Mini",
        images: []
      };
      const res = await request(server).post("/minis").send(miniData);
      expect(res.status).toBe(401);
      expect(createMiniSpy).toHaveBeenCalledTimes(0);
    });

    test("should return error if required fields missing", async () => {
      const res = await request(server)
        .post("/minis")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({});
      expect(res.status).toBe(500);
      expect(createMiniSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe("PUT /:id", () => {
    test("should update mini with valid data", async () => {
      const mini = await Mini.create({
        name: "Mini 1",
        userId: exampleUser?._id
      });
      const res = await request(server)
        .put(`/minis/${mini._id}`)
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({ name: "Updated Mini" });
      expect(res.status).toBe(200);
      expect(updateMiniSpy).toHaveBeenCalledTimes(1);
      const updatedMini = await Mini.findById(mini._id).lean();
      expect(updatedMini?.name).toBe("Updated Mini");
    });

    test("should return 401 if user is not owner or admin", async () => {
      const mini = await Mini.create({
        name: "Mini 1",
        userId: exampleAdminUser?._id
      });
      const res = await request(server)
        .put(`/minis/${mini._id}`)
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({ name: "Updated Mini" });
      expect(res.status).toBe(401);
      expect(updateMiniSpy).toHaveBeenCalledTimes(0);
    });

    test("should return 404 if mini not found", async () => {
      const res = await request(server)
        .put(`/minis/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({ name: "Updated Mini" });
      expect(res.status).toBe(404);
      expect(updateMiniSpy).toHaveBeenCalledTimes(0);
    });

    test("should return 500 if database error occurs", async () => {
      const mini = await Mini.create({
        name: "Mini 1",
        userId: exampleUser?._id
      });
      updateMiniSpy.mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(server)
        .put(`/minis/${mini._id}`)
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({ name: "Updated Mini" });
      expect(res.status).toBe(500);
      expect(updateMiniSpy).toHaveBeenCalledTimes(1);
    });

    test("should return 401 if not authenticated", async () => {
      const mini = await Mini.create({
        name: "Mini 1",
        userId: exampleUser?._id
      });
      const res = await request(server)
        .put(`/minis/${mini._id}`)
        .send({ name: "Updated Mini" });
      expect(res.status).toBe(401);
      expect(updateMiniSpy).toHaveBeenCalledTimes(0);
    });

    test("admin should update mini even if not owner", async () => {
      const mini = await Mini.create({
        name: "Mini 1",
        userId: exampleUser?._id
      });
      const res = await request(server)
        .put(`/minis/${mini._id}`)
        .set("Authorization", `Bearer ${exampleAdminToken}`)
        .send({ name: "Updated Mini" });
      expect(res.status).toBe(200);
      expect(updateMiniSpy).toHaveBeenCalledTimes(1);
      const updatedMini = await Mini.findById(mini._id).lean();
      expect(updatedMini?.name).toBe("Updated Mini");
    });
  });

  describe("DELETE /:id", () => {
    test("should delete mini if user is owner", async () => {
      const mini = await Mini.create({
        name: "Mini 1",
        userId: exampleUser?._id
      });
      const res = await request(server)
        .delete(`/minis/${mini._id}`)
        .set("Authorization", `Bearer ${exampleUserToken}`);
      expect(res.status).toBe(200);
      expect(deleteMiniSpy).toHaveBeenCalledTimes(1);
      const deletedMini = await Mini.findById(mini._id).lean();
      expect(deletedMini).toBeNull();
    });

    test("should return 401 if user is not owner or admin", async () => {
      const mini = await Mini.create({
        name: "Mini 1",
        userId: exampleAdminUser?._id
      });
      const res = await request(server)
        .delete(`/minis/${mini._id}`)
        .set("Authorization", `Bearer ${exampleUserToken}`);
      expect(res.status).toBe(401);
      expect(deleteMiniSpy).toHaveBeenCalledTimes(0);
    });

    test("should return 404 if mini not found", async () => {
      const res = await request(server)
        .delete(`/minis/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${exampleUserToken}`);
      expect(res.status).toBe(404);
      expect(deleteMiniSpy).toHaveBeenCalledTimes(0);
    });

    test("should return 500 if database error occurs", async () => {
      const mini = await Mini.create({
        name: "Mini 1",
        userId: exampleUser?._id
      });
      deleteMiniSpy.mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(server)
        .delete(`/minis/${mini._id}`)
        .set("Authorization", `Bearer ${exampleUserToken}`);
      expect(res.status).toBe(500);
      expect(deleteMiniSpy).toHaveBeenCalledTimes(1);
    });

    test("admin should delete mini even if not owner", async () => {
      const mini = await Mini.create({
        name: "Mini 1",
        userId: exampleUser?._id
      });
      const res = await request(server)
        .delete(`/minis/${mini._id}`)
        .set("Authorization", `Bearer ${exampleAdminToken}`);
      expect(res.status).toBe(200);
      expect(deleteMiniSpy).toHaveBeenCalledTimes(1);
      const deletedMini = await Mini.findById(mini._id).lean();
      expect(deletedMini).toBeNull();
    });

    test("should return 401 if not authenticated", async () => {
      const mini = await Mini.create({
        name: "Mini 1",
        userId: exampleUser?._id
      });
      const res = await request(server).delete(`/minis/${mini._id}`);
      expect(res.status).toBe(401);
      expect(deleteMiniSpy).toHaveBeenCalledTimes(0);
    });
  });
});
