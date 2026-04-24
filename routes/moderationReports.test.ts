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
import * as moderationReportDao from "../daos/moderationReport";
import Invite from "../models/invite";
import Mini from "../models/mini";
import ModerationReport from "../models/moderationReport";
import User, { IUser } from "../models/user";
import server from "../server";
import testUtils from "../test-utils";

const getAllModerationReportsSpy = jest.spyOn(
  moderationReportDao,
  "getAllModerationReports"
);
const getModerationReportSpy = jest.spyOn(
  moderationReportDao,
  "getModerationReport"
);
const createModerationReportSpy = jest.spyOn(
  moderationReportDao,
  "createModerationReport"
);
const updateModerationReportSpy = jest.spyOn(
  moderationReportDao,
  "updateModerationReport"
);

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

describe("routes/moderation-reports", () => {
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
    test("returns all moderation reports", async () => {
      const res = await request(server).get("/moderation-reports");
      expect(res.body.docs.length).toBe(0);
      expect(res.status).toBe(200);
      expect(getAllModerationReportsSpy).toHaveBeenCalledTimes(1);

      const mini = await Mini.create({
        name: "Test Mini",
        userId: exampleUser?._id,
        images: []
      });

      await ModerationReport.create({
        userId: exampleUser?._id,
        mini: mini._id,
        reason: "notAMini"
      });
      await ModerationReport.create({
        userId: exampleUser?._id,
        mini: mini._id,
        reason: "other"
      });

      const res2 = await request(server).get("/moderation-reports");
      expect(res2.body.docs.length).toBe(2);
      expect(res2.status).toBe(200);
      expect(getAllModerationReportsSpy).toHaveBeenCalledTimes(2);
    });

    test("returns error if db error occurs", async () => {
      getAllModerationReportsSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server).get("/moderation-reports");
      expect(res.status).toBe(500);
      expect(getAllModerationReportsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /:id", () => {
    test("returns moderation report with given id", async () => {
      const mini = await Mini.create({
        name: "Test Mini",
        userId: exampleUser?._id,
        images: []
      });

      const report = await ModerationReport.create({
        userId: exampleUser?._id,
        mini: mini._id,
        reason: "notAMini"
      });

      const res = await request(server).get(
        `/moderation-reports/${report._id}`
      );
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(report._id.toString());
      expect(getModerationReportSpy).toHaveBeenCalledTimes(1);
    });

    test("returns 404 if moderation report not found", async () => {
      const res = await request(server).get(
        `/moderation-reports/${new mongoose.Types.ObjectId().toString()}`
      );
      expect(res.status).toBe(404);
      expect(getModerationReportSpy).toHaveBeenCalledTimes(1);
    });

    test("returns error if db error occurs", async () => {
      getModerationReportSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server).get(
        `/moderation-reports/${new mongoose.Types.ObjectId().toString()}`
      );
      expect(res.status).toBe(500);
      expect(getModerationReportSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /", () => {
    test("creates a moderation report and returns report data", async () => {
      const mini = await Mini.create({
        name: "Test Mini",
        userId: exampleUser?._id,
        images: []
      });

      const res = await request(server)
        .post("/moderation-reports")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({
          mini: mini._id,
          reason: "notAMini"
        });
      expect(res.status).toBe(200);
      expect(res.body._id).toBeDefined();
      expect(res.body.userId).toBe(exampleUser?._id?.toString());
      expect(res.body.mini).toBe(mini._id.toString());
      expect(res.body.status).toBe("open");
      expect(res.body.reason).toBe("notAMini");
      expect(createModerationReportSpy).toHaveBeenCalledTimes(1);
    });

    test("without auth returns error", async () => {
      await request(server)
        .post("/moderation-reports")
        .send({
          mini: new mongoose.Types.ObjectId().toString(),
          reason: "notAMini"
        })
        .expect(401);
    });

    test("returns error if db error occurs", async () => {
      createModerationReportSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server)
        .post("/moderation-reports")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({
          mini: new mongoose.Types.ObjectId().toString(),
          reason: "notAMini"
        });
      expect(res.status).toBe(500);
      expect(createModerationReportSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("PUT /:id", () => {
    test("updates moderation report and returns updated report", async () => {
      const mini = await Mini.create({
        name: "Test Mini",
        userId: exampleUser?._id,
        images: []
      });

      const report = await ModerationReport.create({
        userId: exampleUser?._id,
        mini: mini._id,
        reason: "notAMini"
      });

      const res = await request(server)
        .put(`/moderation-reports/${report._id}`)
        .set("Authorization", `Bearer ${exampleAdminToken}`)
        .send({ status: "accepted" });
      expect(res.status).toBe(200);

      const updatedReport = await ModerationReport.findById(report._id).lean();
      expect(updatedReport?.status).toBe("accepted");

      expect(updateModerationReportSpy).toHaveBeenCalledTimes(1);
    });

    test("non-admin user returns error", async () => {
      const mini = await Mini.create({
        name: "Test Mini",
        userId: exampleUser?._id,
        images: []
      });

      const report = await ModerationReport.create({
        userId: exampleUser?._id,
        mini: mini._id,
        reason: "notAMini"
      });

      await request(server)
        .put(`/moderation-reports/${report._id}`)
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .send({ status: "accepted" })
        .expect(403);
    });

    test("without auth returns error", async () => {
      const mini = await Mini.create({
        name: "Test Mini",
        userId: exampleUser?._id,
        images: []
      });

      const report = await ModerationReport.create({
        userId: exampleUser?._id,
        mini: mini._id,
        reason: "notAMini"
      });

      await request(server)
        .put(`/moderation-reports/${report._id}`)
        .send({ status: "accepted" })
        .expect(401);
    });

    test("returns error if db error occurs", async () => {
      const mini = await Mini.create({
        name: "Test Mini",
        userId: exampleUser?._id,
        images: []
      });

      const report = await ModerationReport.create({
        userId: exampleUser?._id,
        mini: mini._id,
        reason: "notAMini"
      });

      updateModerationReportSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server)
        .put(`/moderation-reports/${report._id}`)
        .set("Authorization", `Bearer ${exampleAdminToken}`)
        .send({ status: "accepted" });
      expect(res.status).toBe(500);
      expect(updateModerationReportSpy).toHaveBeenCalledTimes(1);
    });
  });
});
