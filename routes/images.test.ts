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
import * as imageDao from "../daos/image";
import Image, { IImage } from "../models/image";
import invite from "../models/invite";
import User, { IUser } from "../models/user";
import server from "../server";
import testUtils from "../test-utils";

jest.mock("../utils/files/uploadFile", () => {
  return { UploadFile: jest.fn<() => Promise<{}>>().mockResolvedValue({}) };
});

const getAllImagesSpy = jest.spyOn(imageDao, "getAllImages");
const createImageSpy = jest.spyOn(imageDao, "createImage");
const findAndUpdateImageSpy = jest.spyOn(imageDao, "findAndUpdateImage");
const deleteImageSpy = jest.spyOn(imageDao, "deleteImage");

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

const image0: Partial<IImage> = {
  type: "s3image",
  s3Bucket: "example-bucket",
  s3Key: "example-key"
};
const image1: Partial<IImage> = {
  type: "s3image",
  s3Bucket: "example-bucket",
  s3Key: "example-key-1"
};

describe("routes/images", () => {
  beforeAll(testUtils.connectDB);
  afterAll(testUtils.stopDB);
  afterEach(async () => {
    await testUtils.clearDB();
    jest.clearAllMocks();
  });

  let exampleUser: Partial<IUser> | null;
  let exampleAdminUser: Partial<IUser> | null;
  let exampleUserToken: string;
  let exampleAdminUserToken: string;

  beforeEach(async () => {
    await invite.create({ code: "code0" });
    await invite.create({ code: "code1" });
    await request(server).post("/auth/signup").send({
      email: userNormal.email,
      username: userNormal.username,
      password: userNormal.password,
      invite: "code0"
    });
    await request(server).post("/auth/signup").send({
      email: userAdmin.email,
      username: userAdmin.username,
      password: userAdmin.password,
      invite: "code1"
    });

    await request(server).post("/auth/login").send({
      email: userNormal.email,
      password: userNormal.password
    });
    exampleUser = await User.findOne({ email: userNormal.email }).lean();

    await request(server).post("/auth/login").send({
      email: userAdmin.email,
      password: userAdmin.password
    });
    exampleAdminUser = await User.findOne({ email: userAdmin.email }).lean();
    await User.updateOne(
      { _id: exampleAdminUser?._id },
      { roles: ["user", "admin"] }
    );
    const tokenRes0 = await request(server)
      .post("/auth/login")
      .send(userNormal);
    exampleUserToken = tokenRes0.body.token;

    const tokenRes1 = await request(server).post("/auth/login").send(userAdmin);
    exampleAdminUserToken = tokenRes1.body.token;
  });

  describe("GET /", () => {
    test("returns all images", async () => {
      const res0 = await request(server).get("/images").expect(200);
      expect(res0.body.length).toBe(0);
      expect(getAllImagesSpy).toHaveBeenCalledTimes(1);

      await Image.create({
        ...image0,
        userId: exampleUser?._id
      });
      await Image.create({
        ...image1,
        userId: exampleAdminUser?._id
      });

      const res1 = await request(server).get("/images").expect(200);
      expect(res1.body.length).toBe(2);
      expect(getAllImagesSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("POST /", () => {
    test("creates an image and returns image data", async () => {
      const res0 = await request(server)
        .post("/images")
        .attach("file", ".jest/duckImage.jpeg")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .expect(200);

      expect(res0.body._id).toBeDefined();
      expect(res0.body.type).toBe("s3Image");
      expect(res0.body.s3Bucket).toBe("every-mini-painted");
      expect(res0.body.s3Key).toBeDefined();
      expect(res0.body.userId).toBe(exampleUser?._id?.toString());
      expect(createImageSpy).toHaveBeenCalledTimes(1);
    });

    test("without file returns error", async () => {
      await request(server)
        .post("/images")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .expect(400);
    });

    test("without auth returns error", async () => {
      await request(server)
        .post("/images")
        .attach("file", ".jest/duckImage.jpeg")
        .expect(401);
    });
  });

  describe("PUT /:id", () => {
    test("updates image and returns updated image", async () => {
      const image = await Image.create({
        ...image0,
        userId: exampleUser?._id
      });

      const res0 = await request(server)
        .put(`/images/${image._id.toString()}`)
        .send({ s3Key: "updated-key", caption: "updated caption" })
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .expect(200);

      expect(res0.body._id).toBe(image._id.toString());
      expect(res0.body.s3Key).toBe("updated-key");
      expect(res0.body.caption).toBe("updated caption");
      expect(findAndUpdateImageSpy).toHaveBeenCalledTimes(1);
    });

    test("updating non-owner image returns error", async () => {
      const image = await Image.create({
        ...image0,
        userId: exampleAdminUser?._id
      });

      await request(server)
        .put(`/images/${image._id.toString()}`)
        .send({ s3Key: "updated-key" })
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .expect(403);
    });

    test("without auth returns error", async () => {
      const image = await Image.create({
        ...image0,
        userId: exampleUser?._id
      });

      await request(server)
        .put(`/images/${image._id.toString()}`)
        .send({ s3Key: "updated-key" })
        .expect(401);
    });

    test("updating non-existent image returns error", async () => {
      await request(server)
        .put("/images/64bfcaa0c9e77c23a1fbb123")
        .send({ s3Key: "updated-key" })
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .expect(404);
    });

    test("admin can update non-owner image", async () => {
      const image = await Image.create({
        ...image0,
        userId: exampleUser?._id
      });

      const res0 = await request(server)
        .put(`/images/${image._id.toString()}`)
        .send({ s3Key: "updated-key" })
        .set("Authorization", `Bearer ${exampleAdminUserToken}`)
        .expect(200);

      expect(res0.body.s3Key).toBe("updated-key");
    });
  });

  describe("DELETE /:id", () => {
    test("deletes image and returns deleted image", async () => {
      const image = await Image.create({
        ...image0,
        userId: exampleUser?._id
      });

      const res0 = await request(server)
        .delete(`/images/${image._id.toString()}`)
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .expect(200);

      expect(res0.body._id).toBe(image._id.toString());
      expect(deleteImageSpy).toHaveBeenCalledTimes(1);
    });

    test("deleting non-owner image returns error", async () => {
      const image = await Image.create({
        ...image0,
        userId: exampleAdminUser?._id
      });

      await request(server)
        .delete(`/images/${image._id.toString()}`)
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .expect(403);
    });

    test("without auth returns error", async () => {
      const image = await Image.create({
        ...image0,
        userId: exampleUser?._id
      });

      await request(server)
        .delete(`/images/${image._id.toString()}`)
        .expect(401);
    });

    test("deleting non-existent image returns error", async () => {
      await request(server)
        .delete("/images/64bfcaa0c9e77c23a1fbb123")
        .set("Authorization", `Bearer ${exampleUserToken}`)
        .expect(404);
    });

    test("admin can delete non-owner image", async () => {
      const image = await Image.create({
        ...image0,
        userId: exampleUser?._id
      });

      const res0 = await request(server)
        .delete(`/images/${image._id.toString()}`)
        .set("Authorization", `Bearer ${exampleAdminUserToken}`)
        .expect(200);

      expect(res0.body._id).toBe(image._id.toString());
      expect(deleteImageSpy).toHaveBeenCalledTimes(1);
    });
  });
});
