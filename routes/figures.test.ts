import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import figure, { IFigure } from "../models/figure";
import image, { IImage } from "../models/image";
import invite from "../models/invite";
import manufacturer, { IManufacturer } from "../models/manufacturer";
import mini, { IMini } from "../models/mini";
import user, { IUser } from "../models/user";
import server from "../server";
import testUtils from "../test-utils";
describe("/figures", () => {
  beforeAll(testUtils.connectDB);
  afterAll(testUtils.stopDB);

  afterEach(testUtils.clearDB);

  const userNormal: Partial<IUser> = {
    email: "user-normal@mail.com",
    username: "user-normal",
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

  let images: Partial<IImage>[];
  let exampleUser: Partial<IUser>;
  let exampleFigure: Partial<IFigure>;
  let exampleManufacturer: Partial<IManufacturer>;

  beforeEach(async () => {
    exampleUser = await user.create(userNormal);
    images = (
      await image.insertMany([
        { ...image0, userId: exampleUser._id },
        { ...image1, userId: exampleUser._id }
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

    exampleFigure = {
      images: images.map((i) => i._id || new mongoose.Types.ObjectId()),
      name: "Example",
      manufacturer: exampleManufacturer._id
    };
  });

  describe("Before Login", () => {
    let figures: IFigure[] = [];
    beforeEach(async () => {
      figures = [];
      const figure1 = await figure.create({ name: "figure 1" });
      figures.push(figure1);
      const figure2 = await figure.create({
        name: "figure 2",
        manufacturer: exampleManufacturer._id,
        images: [images[0]._id, images[1]._id]
      });
      figures.push(figure2);
    });
    describe("GET /", () => {
      test("should return 200 and all figures", async () => {
        const res = await request(server).get("/figures/").send();
        expect(res.statusCode).toEqual(200);
        expect(res.body.docs.length).toEqual(2);
      });
    });

    describe("GET /:id", () => {
      test("should return 200 for a specific figure", async () => {
        const res1 = await request(server)
          .get("/figures/" + figures[1]._id)
          .send();
        expect(res1.statusCode).toEqual(200);
        expect(res1.body).toMatchObject({
          name: "figure 2",
          images: [image0, image1]
        });
      });
      test("should return 404 for a non-existent figure", async () => {
        const res1 = await request(server)
          .get("/figures/" + new mongoose.Types.ObjectId())
          .send();
        expect(res1.statusCode).toEqual(404);
      });
    });

    describe("GET /:id/minis", () => {
      let minis: IMini[] = [];
      let fig: IFigure;
      beforeEach(async () => {
        fig = await figure.create(exampleFigure);
        minis[0] = await mini.create({
          name: "Example Mini 1",
          userId: exampleUser._id,
          figure: fig._id,
          images: [images[1]._id, images[0]._id]
        });
        minis[1] = await mini.create({
          name: "Example Mini 2",
          userId: exampleUser._id,
          figure: fig._id,
          images: [images[0]._id, images[1]._id]
        });
        minis.reverse();
      });
      test("should return 200 for valid figure id", async () => {
        const res1 = await request(server)
          .get(`/figures/${fig._id}/minis`)
          .send();
        expect(res1.statusCode).toEqual(200);
        res1.body.docs.forEach((m: IMini, i: number) => {
          expect(m).toMatchObject({
            _id: minis[i]._id?.toString(),
            name: minis[i].name,
            figure: minis[i].figure?.toString()
          });
        });
      });
    });

    describe("GET /search?query=query", () => {
      let figures = [];
      beforeEach(async () => {
        const figure1 = await figure.create({
          name: "Sarah Blitzer, IMEF Sniper",
          images: [images[0]._id, images[1]._id]
        });
        figures.push(figure1);
        const figure2 = await figure.create({
          name: "Stub, Gnome Accountant",
          manufacturer: exampleManufacturer._id,
          images: [images[0]._id, images[1]._id]
        });
        figures.push(figure2);
        const figure3 = await figure.create({
          name: "Fumbus, Iconic Alchemist",
          manufacturer: exampleManufacturer._id
        });
        figures.push(figure3);
      });

      test("should return 200 for a valid search", async () => {
        const res1 = await request(server)
          .get(`/figures/search?search=IMEF`)
          .send();
        expect(res1.statusCode).toEqual(200);
        expect(res1.body.docs[0]).toMatchObject({
          name: "Sarah Blitzer, IMEF Sniper"
        });

        const res2 = await request(server)
          .get(`/figures/search?search=gnome`)
          .send();
        expect(res2.statusCode).toEqual(200);
        expect(res2.body.docs[0]).toMatchObject({
          name: "Stub, Gnome Accountant"
        });
      });
    });
  });

  describe("After Login", () => {
    const invite0 = {
      code: "code0"
    };
    const invite1 = {
      code: "code1"
    };
    const user0 = {
      email: "user0@mail.com",
      username: "user0",
      password: "123password"
    };
    const user1 = {
      email: "user1@mail.com",
      username: "user1",
      password: "456password"
    };
    let token0: string;
    let adminToken: string;
    let userId0: mongoose.Types.ObjectId;
    let adminId: mongoose.Types.ObjectId;
    beforeEach(async () => {
      await invite.create(invite0);
      await invite.create(invite1);
      await request(server)
        .post("/auth/signup")
        .send({ ...user0, invite: invite0.code });
      const res0 = await request(server).post("/auth/login").send(user0);
      token0 = res0.body.token;
      userId0 = res0.body.userId;

      await request(server)
        .post("/auth/signup")
        .send({ ...user1, invite: invite1.code });
      await user.updateOne(
        { email: user1.email },
        { $push: { roles: "admin" } }
      );
      const res1 = await request(server).post("/auth/login").send(user1);
      adminToken = res1.body.token;
      adminId = res1.body.userId;
    });

    describe("POST /", () => {
      test("should send a 403 when not admin", async () => {
        const res = await request(server)
          .post("/figures")
          .set("Authorization", "Bearer " + token0)
          .send(exampleFigure);
        expect(res.statusCode).toEqual(403);
      });

      test("should send a 400 when create fails", async () => {
        const res = await request(server)
          .post("/figures")
          .set("Authorization", "Bearer " + adminToken)
          .send({});
        expect(res.statusCode).toEqual(400);
      });

      test("should send a 200 and create a figure when admin", async () => {
        const res = await request(server)
          .post("/figures")
          .set("Authorization", "Bearer " + adminToken)
          .send(exampleFigure);
        expect(res.statusCode).toEqual(200);
        const storeFigure = await testUtils.findOne(figure, {});
        expect(storeFigure).toMatchObject(exampleFigure);
      });
    });

    describe("PUT /:id", () => {
      beforeEach(async () => {
        await figure.create({
          name: "figure 1"
        });
      });

      test("should send a 403 when not admin", async () => {
        const storedFigure = await testUtils.findOne(figure, {});
        const res = await request(server)
          .put("/figures/" + storedFigure._id)
          .set("Authorization", "Bearer " + token0)
          .send(exampleFigure);
        expect(res.statusCode).toEqual(403);
      });

      test("should send a 200 and update when admin", async () => {
        const storedFigure = await testUtils.findOne(figure, {});
        const res = await request(server)
          .put("/figures/" + storedFigure._id)
          .set("Authorization", "Bearer " + adminToken)
          .send(exampleFigure);
        expect(res.statusCode).toEqual(200);
        const storedFigure1 = await testUtils.findOne(figure, {});
        expect(storedFigure1).toMatchObject(exampleFigure);
      });

      describe("DELETE /:id", () => {
        let figId: mongoose.Types.ObjectId;
        beforeEach(async () => {
          const fig = await figure.create({
            name: "figure 1",
            description: "description"
          });
          figId = fig._id;
        });

        test("should send a 403 when not admin", async () => {
          const storedFigure = await testUtils.findOne(figure, {});
          const res = await request(server)
            .delete("/figures/" + storedFigure._id)
            .set("Authorization", "Bearer " + token0)
            .send();
          expect(res.statusCode).toEqual(403);
        });

        test("should send a 200 and delete when admin", async () => {
          const storedFigure = await testUtils.findOne(figure, {
            _id: figId
          });
          const res = await request(server)
            .delete("/figures/" + storedFigure._id)
            .set("Authorization", "Bearer " + adminToken)
            .send();
          expect(res.statusCode).toEqual(200);
          const storedFigure1 = await testUtils.findOne(figure, {
            _id: figId
          });
          expect(storedFigure1).toBeNull();
        });
      });
    });
  });
});
