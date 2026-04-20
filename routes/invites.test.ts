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
import * as inviteDao from "../daos/invite";
import Invite from "../models/invite";
import User from "../models/user";
import server from "../server";

import { IUser } from "../models/user";
import testUtils from "../test-utils";

const getAllInvitesSpy = jest.spyOn(inviteDao, "getAllInvites");
const getInviteByCodeSpy = jest.spyOn(inviteDao, "getInviteByCode");
const createInviteSpy = jest.spyOn(inviteDao, "createInvite");
const deleteInviteSpy = jest.spyOn(inviteDao, "deleteInvite");

const invite0 = {
  code: "code0"
};
const invite1 = {
  code: "code1"
};

const userAdmin: Partial<IUser> = {
  email: "user-admin@mail.com",
  username: "user-admin",
  password: "999password"
};

let adminUser: Partial<IUser> | null;
let adminToken: string;

describe("routes/invites", () => {
  beforeAll(testUtils.connectDB);
  afterAll(testUtils.stopDB);
  afterEach(async () => {
    await testUtils.clearDB();
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    await Invite.create({ code: "setup1" });
    await request(server).post("/auth/signup").send({
      email: userAdmin.email,
      username: userAdmin.username,
      password: userAdmin.password,
      invite: "setup1"
    });
    adminUser = await User.findOne({ email: userAdmin.email }).lean();
    await User.updateOne({ _id: adminUser?._id }, { roles: ["user", "admin"] });

    const res = await request(server).post("/auth/login").send({
      email: userAdmin.email,
      password: userAdmin.password
    });
    adminToken = res.body.token;

    await jest.clearAllMocks(); // Clear mocks after setup to avoid counting calls made during setup
  });

  describe("GET /", () => {
    test("returns all invites", async () => {
      await Invite.create(invite0);
      await Invite.create(invite1);

      const res = await request(server)
        .get("/invites")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(getAllInvitesSpy).toHaveBeenCalledTimes(1);
    });

    test("returns empty array if no invites", async () => {
      await Invite.deleteMany({});
      const res = await request(server)
        .get("/invites")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0);
      expect(getAllInvitesSpy).toHaveBeenCalledTimes(1);
    });

    test("returns error if db error occurs", async () => {
      getAllInvitesSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server)
        .get("/invites")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(500);
      expect(getAllInvitesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /:code", () => {
    test("returns invite with given code", async () => {
      await Invite.create(invite0);

      const res = await request(server)
        .get("/invites/code0")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(invite0.code);
      expect(getInviteByCodeSpy).toHaveBeenCalledTimes(1);
    });

    test("returns 404 if invite code not found", async () => {
      const res = await request(server)
        .get("/invites/nonexistentcode")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(getInviteByCodeSpy).toHaveBeenCalledTimes(1);
    });

    test("returns error if db error occurs", async () => {
      getInviteByCodeSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server)
        .get("/invites/code0")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(500);
      expect(getInviteByCodeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /", () => {
    test("creates invite and returns invite data", async () => {
      const res = await request(server)
        .post("/invites")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invite0);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(invite0.code);
      expect(createInviteSpy).toHaveBeenCalledTimes(1);
    });

    test("returns error if invite code already exists", async () => {
      await Invite.create(invite0);
      const res = await request(server)
        .post("/invites")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invite0);
      expect(res.status).toBe(409);
      expect(createInviteSpy).toHaveBeenCalledTimes(1);
    });

    test("returns error if not admin", async () => {
      await Invite.create({ code: "setup2" });

      const userNormal = {
        email: "normal.user@example.com",
        username: "normaluser",
        password: "password",
        invite: "setup2"
      };
      await request(server).post("/auth/signup").send(userNormal);
      const res = await request(server).post("/auth/login").send({
        email: userNormal.email,
        password: userNormal.password
      });
      const userToken = res.body.token;
      const res2 = await request(server)
        .post("/invites")
        .set("Authorization", `Bearer ${userToken}`)
        .send(invite0);
      expect(res2.status).toBe(403);
    });

    test("returns error if db error occurs", async () => {
      createInviteSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server)
        .post("/invites")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invite0);
      expect(res.status).toBe(500);
      expect(createInviteSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("DELETE /:code", () => {
    test("deletes invite with given code and returns deleted invite data", async () => {
      await Invite.create(invite0);
      const res = await request(server)
        .delete("/invites/code0")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(invite0.code);
      expect(deleteInviteSpy).toHaveBeenCalledTimes(1);
    });

    test("returns 404 if invite code not found", async () => {
      const res = await request(server)
        .delete("/invites/nonexistentcode")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(deleteInviteSpy).toHaveBeenCalledTimes(1);
    });

    test("returns error if db error occurs", async () => {
      deleteInviteSpy.mockRejectedValueOnce(new Error("db error"));
      const res = await request(server)
        .delete("/invites/code0")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(500);
      expect(deleteInviteSpy).toHaveBeenCalledTimes(1);
    });
  });
});
