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
import * as collectionDAO from "../daos/collection";
import collection, { ICollection } from "../models/collection";
import figure, { IFigure } from "../models/figure";
import image, { IImage } from "../models/image";
import invite from "../models/invite";
import manufacturer, { IManufacturer } from "../models/manufacturer";
import user, { IUser } from "../models/user";
import server from "../server";
import testUtils from "../test-utils";

const getAllCollectionsSpy = jest.spyOn(collectionDAO, "getAllCollections");
const getCollectionByIdSpy = jest.spyOn(collectionDAO, "getCollectionById");
const getCollectionsBySearchSpy = jest.spyOn(
  collectionDAO,
  "getCollectionsBySearch"
);
const getCollectionsIncludingFigureSpy = jest.spyOn(
  collectionDAO,
  "getCollectionsIncludingFigure"
);
const createCollectionSpy = jest.spyOn(collectionDAO, "createCollection");
const updateCollectionSpy = jest.spyOn(collectionDAO, "updateCollection");
const deleteCollectionSpy = jest.spyOn(collectionDAO, "deleteCollection");

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

describe("routes/collections", () => {
  beforeAll(testUtils.connectDB);
  afterAll(testUtils.stopDB);
  afterEach(async () => {
    await testUtils.clearDB();
    getCollectionByIdSpy.mockClear();
    getAllCollectionsSpy.mockClear();
    getCollectionsBySearchSpy.mockClear();
    getCollectionsIncludingFigureSpy.mockClear();
    createCollectionSpy.mockClear();
    updateCollectionSpy.mockClear();
    deleteCollectionSpy.mockClear();
  });

  let images: Partial<IImage>[];
  let exampleUser: Partial<IUser> | null;
  let exampleAdminUser: Partial<IUser> | null;
  let exampleUserToken: string;
  let exampleAdminUserToken: string;
  let exampleFigure: Partial<IFigure>;
  let exampleManufacturer: Partial<IManufacturer>;
  let exampleCollection1: Partial<ICollection>;
  let exampleCollection2: Partial<ICollection>;

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
    exampleUser = await user.findOne({ email: userNormal.email }).lean();

    await request(server).post("/auth/login").send({
      email: userAdmin.email,
      password: userAdmin.password
    });
    exampleAdminUser = await user.findOne({ email: userAdmin.email }).lean();
    await user.updateOne(
      { _id: exampleAdminUser?._id },
      { roles: ["user", "admin"] }
    );

    const tokenRes0 = await request(server)
      .post("/auth/login")
      .send(userNormal);
    exampleUserToken = tokenRes0.body.token;

    const tokenRes1 = await request(server).post("/auth/login").send(userAdmin);
    exampleAdminUserToken = tokenRes1.body.token;

    images = (
      await image.insertMany([
        { ...image0, userId: exampleUser?._id },
        { ...image1, userId: exampleUser?._id }
      ])
    ).map((i) => i.toJSON());
    if (images.length < 2) {
      throw new Error("Failed to create example images");
    }

    exampleManufacturer = await manufacturer.create({
      images: [images[0]._id, images[1]._id],
      name: "Example Manufacturer"
    });
    if (!exampleManufacturer._id) {
      throw new Error("Failed to create example manufacturer");
    }

    exampleFigure = await figure.create({
      images: images.map((i) => i._id || new mongoose.Types.ObjectId()),
      name: "Example Figure",
      manufacturer: exampleManufacturer._id
    });

    exampleCollection1 = await collection.create({
      name: "Example Collection",
      figures: [exampleFigure._id],
      manufacturer: exampleManufacturer._id,
      images: images.map((i) => i._id || new mongoose.Types.ObjectId()),
      thumbnail: images[0]._id,
      description: "Example description",
      website: "https://example.com",
      partNumber: "EX123"
    });

    exampleCollection2 = await collection.create({
      name: "Example Collection foo",
      manufacturer: exampleManufacturer._id,
      images: images.map((i) => i._id || new mongoose.Types.ObjectId()),
      thumbnail: images[0]._id,
      description: "Example description foo",
      website: "https://example.com",
      partNumber: "FOO23"
    });
  });

  test("GET / returns all collections and forwards query", async () => {
    const res = await request(server)
      .get("/collections/?page=0&limit=5")
      .expect(200);

    expect(res.body.docs.length).toBe(2);
    expect(getAllCollectionsSpy).toHaveBeenCalledTimes(1);
    expect(getAllCollectionsSpy.mock.calls[0][0]).toEqual({
      page: "0",
      limit: "5"
    });
  });

  test("GET /search forwards query to getCollectionsBySearch", async () => {
    const res = await request(server)
      .get("/collections/search?search=foo")
      .expect(200);
    expect(res.body.docs[0]).toMatchObject({
      name: exampleCollection2.name,
      partNumber: exampleCollection2.partNumber
    });
    expect(res.body.docs.length).toBe(1);
    expect(getCollectionsBySearchSpy).toHaveBeenCalledWith({
      search: "foo"
    });
  });

  test("GET /figure/:figureId calls getCollectionsIncludingFigure with id and query", async () => {
    const res = await request(server)
      .get("/collections/figure/" + exampleFigure._id)
      .expect(200);
    expect(res.body.docs[0]).toMatchObject({
      name: exampleCollection1.name,
      partNumber: exampleCollection1.partNumber
    });
    expect(getCollectionsIncludingFigureSpy).toHaveBeenCalledTimes(1);
  });

  test("GET /:id returns 404 when not found", async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const res = await request(server)
      .get("/collections/" + id)
      .expect(404);
    expect(res.body).toEqual({ message: "Collection not found" });
    expect(getCollectionByIdSpy).toHaveBeenCalledTimes(1);
    expect(getCollectionByIdSpy).toHaveBeenCalledWith(id);

    const res2 = await request(server)
      .get("/collections/" + "invalid-id")
      .expect(404);
    expect(res2.body).toEqual({ message: "Collection not found" });
    expect(getCollectionByIdSpy).toHaveBeenCalledTimes(2);
    expect(getCollectionByIdSpy).toHaveBeenCalledWith("invalid-id");
  });

  test("GET /:id returns collection when found", async () => {
    const id = exampleCollection1._id?.toString() || "";
    const res = await request(server)
      .get("/collections/" + id)
      .expect(200);

    expect(res.body).toMatchObject({
      _id: id,
      name: "Example Collection"
    });
    expect(getCollectionByIdSpy).toHaveBeenCalledTimes(1);
    expect(getCollectionByIdSpy).toHaveBeenCalledWith(id);
  });

  test("POST / as admin creates a new collection", async () => {
    const payload = { name: "New" };
    const res = await request(server)
      .post("/collections/")
      .set("Authorization", "Bearer " + exampleAdminUserToken)
      .send(payload)
      .expect(200);
    expect(res.body).toMatchObject({ name: "New" });
    expect(createCollectionSpy).toHaveBeenCalledWith(payload);
  });

  test("POST / as non-admin does not create a new collection and sends back a 403", async () => {
    const payload = { name: "New" };
    const res = await request(server)
      .post("/collections/")
      .set("Authorization", `Bearer ${exampleUserToken}`)
      .send(payload)
      .expect(403);
    expect(createCollectionSpy).not.toHaveBeenCalled();
  });

  test("PUT /:id as admin updates a collection", async () => {
    const id = exampleCollection1._id?.toString() || "";
    const payload = { name: "Updated" };
    await request(server)
      .put("/collections/" + id)
      .set("Authorization", "Bearer " + exampleAdminUserToken)
      .send(payload)
      .expect(200);
    const storedCollection1 = await testUtils.findOne(collection, { _id: id });
    expect(storedCollection1).toMatchObject({ name: "Updated" });
    expect(updateCollectionSpy).toHaveBeenCalledWith(id, payload);
  });

  test("PUT /:id as non-admin does not update a collection and returns 403", async () => {
    const id = exampleCollection1._id?.toString() || "";
    const payload = { name: "Updated" };
    await request(server)
      .put("/collections/" + id)
      .set("Authorization", "Bearer " + exampleUserToken)
      .send(payload)
      .expect(403);
    const storedCollection1 = await testUtils.findOne(collection, { _id: id });
    expect(storedCollection1).toMatchObject({ name: "Example Collection" });
    expect(updateCollectionSpy).not.toHaveBeenCalled();
  });

  test("DELETE /:id as admin deletes a collection and returns result", async () => {
    const id = exampleCollection1._id?.toString() || "";
    await request(server)
      .delete("/collections/" + id)
      .set("Authorization", "Bearer " + exampleAdminUserToken)
      .expect(200);
    const storedCollection1 = await testUtils.findOne(collection, { _id: id });
    expect(storedCollection1).toBeNull();
    expect(deleteCollectionSpy).toHaveBeenCalledWith(id);
  });
});
