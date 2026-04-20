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
import * as figureDao from "../daos/figure";
import * as manufacturerDao from "../daos/manufacturer";
import Figure from "../models/figure";
import Invite from "../models/invite";
import Manufacturer, { IManufacturer } from "../models/manufacturer";
import User, { IUser } from "../models/user";
import server from "../server";
import testUtils from "../test-utils";

const getAllManufacturersSpy = jest.spyOn(
  manufacturerDao,
  "getAllManufacturers"
);
const getManufacturerByIdSpy = jest.spyOn(
  manufacturerDao,
  "getManufacturerById"
);
const getManufacturersBySearchSpy = jest.spyOn(
  manufacturerDao,
  "getManufacturersBySearch"
);
const getFiguresBymanufacturerIdSpy = jest.spyOn(
  figureDao,
  "getFiguresBymanufacturerId"
);
const createManufacturerSpy = jest.spyOn(manufacturerDao, "createManufacturer");
const updateManufacturerSpy = jest.spyOn(manufacturerDao, "updateManufacturer");
const deleteManufacturerSpy = jest.spyOn(manufacturerDao, "deleteManufacturer");

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

const manufacturer0: Partial<IManufacturer> = {
  name: "Example Manufacturer 0"
};

const manufacturer1: Partial<IManufacturer> = {
  name: "Example Manufacturer 1"
};

describe("routes/manufacturers", () => {
  beforeAll(testUtils.connectDB);
  afterAll(testUtils.stopDB);
  afterEach(async () => {
    await testUtils.clearDB();
    jest.clearAllMocks();
  });

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
    await User.findOne({ email: userNormal.email }).lean();

    await Invite.create({ code: "setup2" });
    await request(server).post("/auth/signup").send({
      email: userAdmin.email,
      username: userAdmin.username,
      password: userAdmin.password,
      invite: "setup2"
    });
    const exampleAdminUser = await User.findOne({
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

    await jest.clearAllMocks(); // Clear mocks after setup to avoid counting calls made during setup
  });

  describe("GET /", () => {
    test("returns all manufacturers", async () => {
      await Manufacturer.create(manufacturer0);
      await Manufacturer.create(manufacturer1);

      const res = await request(server).get("/manufacturers");
      expect(res.status).toBe(200);
      expect(res.body.docs.length).toBe(2);
      expect(getAllManufacturersSpy).toHaveBeenCalledTimes(1);
    });
    test("returns empty array if no manufacturers", async () => {
      await Manufacturer.deleteMany({});
      const res = await request(server)
        .get("/manufacturers")
        .set("Authorization", `Bearer ${exampleUserToken}`);
      expect(res.status).toBe(200);
      expect(res.body.docs.length).toBe(0);
      expect(getAllManufacturersSpy).toHaveBeenCalledTimes(1);
    });
    test("returns error if db error occurs", async () => {
      getAllManufacturersSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server).get("/manufacturers");
      expect(res.status).toBe(500);
      expect(getAllManufacturersSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /:id", () => {
    test("returns manufacturer with given id", async () => {
      const created = await Manufacturer.create(manufacturer0);
      const res = await request(server).get(`/manufacturers/${created._id}`);
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(created._id.toString());
      expect(getManufacturerByIdSpy).toHaveBeenCalledTimes(1);
    });
    test("returns 404 if manufacturer not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(server).get(`/manufacturers/${nonExistentId}`);
      expect(res.status).toBe(404);
      expect(getManufacturerByIdSpy).toHaveBeenCalledTimes(1);
    });
    test("returns error if db error occurs", async () => {
      getManufacturerByIdSpy.mockRejectedValueOnce(new Error("db error"));
      const created = await Manufacturer.create(manufacturer0);
      const res = await request(server).get(`/manufacturers/${created._id}`);
      expect(res.status).toBe(500);
      expect(getManufacturerByIdSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /search", () => {
    test("returns manufacturers matching search query", async () => {
      await Manufacturer.create(manufacturer0);
      await Manufacturer.create(manufacturer1);

      const res = await request(server).get(
        "/manufacturers/search?search=Example"
      );
      expect(res.status).toBe(200);
      expect(res.body.docs.length).toBe(2);
      expect(getManufacturersBySearchSpy).toHaveBeenCalledTimes(1);
      expect(getManufacturersBySearchSpy).toHaveBeenCalledWith({
        search: "Example"
      });
    });
    test("returns empty array if no matches", async () => {
      const res = await request(server).get(
        "/manufacturers/search?search=notfound"
      );
      expect(res.status).toBe(200);
      expect(res.body.docs.length).toBe(0);
      expect(getManufacturersBySearchSpy).toHaveBeenCalledTimes(1);
      expect(getManufacturersBySearchSpy).toHaveBeenCalledWith({
        search: "notfound"
      });
    });
    test("returns error if db error occurs", async () => {
      getManufacturersBySearchSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server).get(
        "/manufacturers/search?search=Example"
      );
      expect(res.status).toBe(500);
      expect(getManufacturersBySearchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /:id/figures", () => {
    test("returns figures for manufacturer with given id", async () => {
      const created = await Manufacturer.create(manufacturer0);
      await Figure.create({
        name: "Figure 0",
        manufacturer: created._id
      });
      await Figure.create({
        name: "Figure 1",
        manufacturer: created._id
      });
      await Figure.create({
        name: "Figure 2"
      });

      const res = await request(server).get(
        `/manufacturers/${created._id}/figures`
      );
      expect(res.status).toBe(200);
      expect(res.body.docs.length).toBe(2);
      expect(getFiguresBymanufacturerIdSpy).toHaveBeenCalledTimes(1);
    });
    test("returns error if db error occurs", async () => {
      getFiguresBymanufacturerIdSpy.mockRejectedValueOnce(
        new Error("db error")
      );
      const created = await Manufacturer.create(manufacturer0);
      const res = await request(server).get(
        `/manufacturers/${created._id}/figures`
      );
      expect(res.status).toBe(500);
      expect(getFiguresBymanufacturerIdSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /", () => {
    test("creates a new manufacturer", async () => {
      const res = await request(server)
        .post("/manufacturers")
        .set("Authorization", `Bearer ${exampleAdminToken}`)
        .send(manufacturer0);
      expect(res.status).toBe(200);
      expect(res.body._id).toBeDefined();
      expect(res.body.name).toBe(manufacturer0.name);
      expect(createManufacturerSpy).toHaveBeenCalledTimes(1);
    });
    test("returns error if db error occurs", async () => {
      createManufacturerSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server)
        .post("/manufacturers")
        .set("Authorization", `Bearer ${exampleAdminToken}`)
        .send(manufacturer0);
      expect(res.status).toBe(500);
      expect(createManufacturerSpy).toHaveBeenCalledTimes(1);
    });
    test("returns 403 if user is not admin", async () => {
      const res = await request(server)
        .post("/manufacturers")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send(manufacturer0);
      expect(res.status).toBe(403);
      expect(createManufacturerSpy).not.toHaveBeenCalled();
    });
    test("returns 401 if not authenticated", async () => {
      const res = await request(server)
        .post("/manufacturers")
        .send(manufacturer0);
      expect(res.status).toBe(401);
      expect(createManufacturerSpy).not.toHaveBeenCalled();
    });
  });

  describe("PUT /:id", () => {
    test("updates manufacturer with given id", async () => {
      const created = await Manufacturer.create(manufacturer0);
      const res = await request(server)
        .put(`/manufacturers/${created._id}`)
        .set("Authorization", `Bearer ${exampleAdminToken}`)
        .send({ name: "Updated Name" });
      expect(res.status).toBe(200);
      const found = await Manufacturer.findById(created._id).lean();
      expect(found).toBeTruthy();
      expect(found?.name).toBe("Updated Name");
      expect(updateManufacturerSpy).toHaveBeenCalledTimes(1);
    });
    test("returns 404 if manufacturer not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(server)
        .put(`/manufacturers/${nonExistentId}`)
        .set("Authorization", `Bearer ${exampleAdminToken}`)
        .send({ name: "Updated Name" });
      expect(res.status).toBe(404);
      expect(updateManufacturerSpy).toHaveBeenCalledTimes(0);
    });
    test("returns error if db error occurs", async () => {
      updateManufacturerSpy.mockRejectedValueOnce(new Error("db error"));
      const created = await Manufacturer.create(manufacturer0);
      const res = await request(server)
        .put(`/manufacturers/${created._id}`)
        .set("Authorization", `Bearer ${exampleAdminToken}`)
        .send({ name: "Updated Name" });
      expect(res.status).toBe(500);
    });
    test("returns 403 if user is not admin", async () => {
      const created = await Manufacturer.create(manufacturer0);
      const res = await request(server)
        .put(`/manufacturers/${created._id}`)
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({ name: "Updated Name" });
      expect(res.status).toBe(403);
      expect(updateManufacturerSpy).not.toHaveBeenCalled();
    });
    test("returns 401 if not authenticated", async () => {
      const created = await Manufacturer.create(manufacturer0);
      const res = await request(server)
        .put(`/manufacturers/${created._id}`)
        .send({ name: "Updated Name" });
      expect(res.status).toBe(401);
      expect(updateManufacturerSpy).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /:id", () => {
    test("deletes manufacturer with given id", async () => {
      const created = await Manufacturer.create(manufacturer0);
      const res = await request(server)
        .delete(`/manufacturers/${created._id}`)
        .set("Authorization", `Bearer ${exampleAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(created._id.toString());
      expect(deleteManufacturerSpy).toHaveBeenCalledTimes(1);
      const found = await Manufacturer.findById(created._id).lean();
      expect(found).toBeNull();
    });
    test("returns 404 if manufacturer not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(server)
        .delete(`/manufacturers/${nonExistentId}`)
        .set("Authorization", `Bearer ${exampleAdminToken}`);
      expect(res.status).toBe(404);
      expect(deleteManufacturerSpy).not.toHaveBeenCalled();
    });
    test("returns error if db error occurs", async () => {
      deleteManufacturerSpy.mockRejectedValueOnce(new Error("db error"));
      const created = await Manufacturer.create(manufacturer0);
      const res = await request(server)
        .delete(`/manufacturers/${created._id}`)
        .set("Authorization", `Bearer ${exampleAdminToken}`);
      expect(res.status).toBe(500);
    });
    test("returns 403 if user is not admin", async () => {
      const created = await Manufacturer.create(manufacturer0);
      const res = await request(server)
        .delete(`/manufacturers/${created._id}`)
        .set("Authorization", `Bearer ${exampleUserToken}`);
      expect(res.status).toBe(403);
      expect(deleteManufacturerSpy).not.toHaveBeenCalled();
    });
    test("returns 401 if not authenticated", async () => {
      const created = await Manufacturer.create(manufacturer0);
      const res = await request(server).delete(`/manufacturers/${created._id}`);
      expect(res.status).toBe(401);
      expect(deleteManufacturerSpy).not.toHaveBeenCalled();
    });
  });
});
