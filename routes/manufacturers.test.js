const request = require("supertest");

const server = require("../server");
const testUtils = require("../test-utils");

const User = require("../models/user").default;
const Image = require("../models/image").default;
const Manufacturer = require("../models/manufacturer").default;
const Invite = require("../models/invite").default;

// this breaks such that no values are loaded from the .env file...
// still figuring out how to get it to replace values in tests.
jest.mock("dotenv", () => ({
  config: jest.fn(() => ({
    parsed: {
      EDIT_FIGURE_REQUIRES_ADMIN: "true",
      EDIT_MANUFACTURER_REQUIRES_ADMIN: "true",
      CREATE_USER_REQUIRES_INVITE: "true"
    }
  }))
}));

const { config } = require("../utils/config");

describe("/manufacturers", () => {
  beforeAll(testUtils.connectDB);
  afterAll(testUtils.stopDB);

  afterEach(testUtils.clearDB);

  const userNormal = {
    email: "user-normal@mail.com",
    username: "user-normal",
    password: "999password"
  };

  const image0 = {
    cloudinaryPublicId: "t1lqquh8o8pdnnaouphl"
  };
  const image1 = {
    cloudinaryPublicId: "zufzijos4ca2p5dpuxsu"
  };
  let images;
  let user;
  let exampleManufacturer;

  beforeEach(async () => {
    user = await User.create(userNormal);
    images = (
      await Image.insertMany([
        { ...image0, userId: user._id },
        { ...image1, userId: user._id }
      ])
    ).map((i) => i.toJSON());
    exampleManufacturer = {
      images: [images[0]._id, images[1]._id],
      name: "Example"
    };
  });

  describe("Before Login", () => {
    describe("GET /", () => {
      let manufacturers = [];
      beforeEach(async () => {
        const manufacturer1 = Manufacturer.create({ name: "manufacturer 1" });
        manufacturers.push(manufacturer1);
        const manufacturer2 = Manufacturer.create({
          name: "manufacturer 2",
          images: [images[0]._id, images[1]._id]
        });
        manufacturers.push(manufacturer2);
      });

      it("should return 200 and all manufacturers", async () => {
        const res = await request(server).get("/manufacturers/").send();
        expect(res.statusCode).toEqual(200);
        res.body.docs.forEach((manufacturer, i) => {
          expect(manufacturer).toMatchObject(manufacturers[i]);
        });
      });
    });

    describe("GET /:id", () => {
      let manufacturers = [];
      beforeEach(async () => {
        const manufacturer1 = await Manufacturer.create({
          name: "manufacturer 1"
        });
        manufacturers.push(manufacturer1);
        const manufacturer2 = await Manufacturer.create({
          name: "manufacturer 2",
          images: [images[0]._id, images[1]._id]
        });
        manufacturers.push(manufacturer2);
      });

      it("should return 200 a specific manufacturer with images", async () => {
        const res1 = await request(server)
          .get("/manufacturers/" + manufacturers[0]._id)
          .send();
        expect(res1.statusCode).toEqual(200);
        expect(res1.body).toMatchObject({
          name: "manufacturer 1"
        });

        const res2 = await request(server)
          .get("/manufacturers/" + manufacturers[1]._id)
          .send();
        expect(res2.statusCode).toEqual(200);
        expect(res2.body).toMatchObject({
          name: "manufacturer 2",
          images: [image0, image1]
        });
      });
    });

    describe("POST /", () => {
      it("should send 401 without a token", async () => {
        const res = await request(server)
          .post("/manufacturers")
          .send(exampleManufacturer);
        expect(res.statusCode).toEqual(401);
      });
      it("should send 401 with a bad token", async () => {
        const res = await request(server)
          .post("/manufacturers")
          .set("Authorization", "Bearer BAD")
          .send(exampleManufacturer);
        expect(res.statusCode).toEqual(401);
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
    let token0;
    let adminToken;
    let userId0;
    let adminId;
    beforeEach(async () => {
      await Invite.create(invite0);
      await Invite.create(invite1);
      await request(server)
        .post("/auth/signup")
        .send({ ...user0, invite: invite0.code });
      const res0 = await request(server).post("/auth/login").send(user0);
      token0 = res0.body.token;
      userId0 = res0.body.userId;
      await request(server)
        .post("/auth/signup")
        .send({ ...user1, invite: invite1.code });
      await User.updateOne(
        { email: user1.email },
        { $push: { roles: "admin" } }
      );
      const res1 = await request(server).post("/auth/login").send(user1);
      adminToken = res1.body.token;
      adminId = res1.body.userId;
    });

    describe("POST /", () => {
      it("should send a 403 when not admin", async () => {
        const res = await request(server)
          .post("/manufacturers")
          .set("Authorization", "Bearer " + token0)
          .send(exampleManufacturer);
        expect(res.statusCode).toEqual(403);
      });

      it("should send a 400 when create fails", async () => {
        const res = await request(server)
          .post("/manufacturers")
          .set("Authorization", "Bearer " + adminToken)
          .send({});
        expect(res.statusCode).toEqual(400);
      });

      it("should send a 200 and create a manufacturer when admin", async () => {
        const res = await request(server)
          .post("/manufacturers")
          .set("Authorization", "Bearer " + adminToken)
          .send(exampleManufacturer);
        expect(res.statusCode).toEqual(200);
        const storeManufacturer = await testUtils.findOne(Manufacturer, {});
        expect(storeManufacturer).toMatchObject(exampleManufacturer);
      });
    });

    describe("PUT /:id", () => {
      let manufacturers = [];
      beforeEach(async () => {
        const manufacturer1 = await Manufacturer.create({
          name: "manufacturer 1"
        });
        manufacturers.push(manufacturer1);
        const manufacturer2 = await Manufacturer.create({
          name: "manufacturer 2",
          images: [images[0]._id, images[1]._id]
        });
        manufacturers.push(manufacturer2);
      });

      it("should send a 403 when not admin", async () => {
        let storedManufacturer = await testUtils.findOne(Manufacturer, {});
        const res = await request(server)
          .put("/manufacturers/" + storedManufacturer._id)
          .set("Authorization", "Bearer " + token0)
          .send(exampleManufacturer);
        expect(res.statusCode).toEqual(403);
      });

      it("should update a manufacturer when admin", async () => {
        let storedManufacturer = await testUtils.findOne(Manufacturer, {});
        const res = await request(server)
          .put("/manufacturers/" + storedManufacturer._id)
          .set("Authorization", "Bearer " + adminToken)
          .send(exampleManufacturer);
        expect(res.statusCode).toEqual(200);
        storedManufacturer = await testUtils.findOne(Manufacturer, {});
        expect(storedManufacturer).toMatchObject(exampleManufacturer);
      });
    });
  });
});
