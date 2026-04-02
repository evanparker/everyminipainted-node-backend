const request = require("supertest");

const server = require("../server");
const testUtils = require("../test-utils");

const User = require("../models/user").default;
const Image = require("../models/image").default;
const Manufacturer = require("../models/manufacturer").default;
const Figure = require("../models/figure").default;
const Invite = require("../models/invite").default;
const Mini = require("../models/mini").default;

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

describe("/figures", () => {
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
  let exampleFigure;
  let exampleManufacturer;

  beforeEach(async () => {
    user = await User.create(userNormal);
    images = (
      await Image.insertMany([
        { ...image0, userId: user._id },
        { ...image1, userId: user._id }
      ])
    ).map((i) => i.toJSON());

    exampleManufacturer = await Manufacturer.create({
      images: [images[0]._id, images[1]._id],
      name: "Example Manufacturer"
    });
    exampleFigure = {
      images: [images[0]._id, images[1]._id],
      name: "Example",
      manufacturer: exampleManufacturer._id
    };
  });

  describe("Before Login", () => {
    describe("GET /", () => {
      let figures = [];
      beforeEach(async () => {
        const figure1 = Figure.create({ name: "figure 1" });
        figures.push(figure1);
        const figure2 = Figure.create({
          name: "figure 2",
          manufacturer: exampleManufacturer._id,
          images: [images[0]._id, images[1]._id]
        });
        figures.push(figure2);
      });

      it("should return 200 and all figures", async () => {
        const res = await request(server).get("/figures/").send();
        expect(res.statusCode).toEqual(200);
        res.body.docs.forEach((figure, i) => {
          expect(figure).toMatchObject(figures[i]);
        });
      });
    });

    describe("GET /:id", () => {
      let figures = [];
      beforeEach(async () => {
        const figure1 = await Figure.create({
          name: "figure 1",
          images: [images[0]._id, images[1]._id]
        });
        figures.push(figure1);
        const figure2 = await Figure.create({
          name: "figure 2",
          manufacturer: exampleManufacturer._id,
          images: [images[0]._id, images[1]._id]
        });
        figures.push(figure2);
        const figure3 = await Figure.create({
          name: "figure 3",
          manufacturer: exampleManufacturer._id
        });
        figures.push(figure3);
      });

      it("should return 200 for a specific figure with images and manufacturer object", async () => {
        const res1 = await request(server)
          .get("/figures/" + figures[0]._id)
          .send();
        expect(res1.statusCode).toEqual(200);
        expect(res1.body).toMatchObject({
          name: "figure 1",
          images: [image0, image1]
        });

        const res2 = await request(server)
          .get("/figures/" + figures[1]._id)
          .send();
        expect(res2.statusCode).toEqual(200);
        expect(res2.body).toMatchObject({
          name: "figure 2",
          manufacturer: {
            _id: exampleManufacturer._id.toString(),
            images: [images[0]._id.toString(), images[1]._id.toString()],
            name: "Example Manufacturer"
          },
          images: [image0, image1]
        });

        const res3 = await request(server)
          .get("/figures/" + figures[2]._id)
          .send();
        expect(res3.statusCode).toEqual(200);
        expect(res3.body).toMatchObject({
          name: "figure 3",
          manufacturer: {
            _id: exampleManufacturer._id.toString(),
            images: [images[0]._id.toString(), images[1]._id.toString()],
            name: "Example Manufacturer"
          }
        });
      });
    });

    describe("GET /:id/minis", () => {
      let minis = [];
      let figure;
      beforeEach(async () => {
        figure = await Figure.create(exampleFigure);
        minis[0] = await Mini.create({
          name: "Example Mini 1",
          userId: user._id,
          figure: figure._id,
          images: [images[1]._id, images[0]._id]
        });
        minis[1] = await Mini.create({
          name: "Example Mini 2",
          userId: user._id,
          figure: figure._id,
          images: [images[0]._id, images[1]._id]
        });
        minis.reverse();
      });

      it("should return 200 for valid figure id", async () => {
        const res1 = await request(server)
          .get(`/figures/${figure._id}/minis`)
          .send();
        expect(res1.statusCode).toEqual(200);
        res1.body.docs.forEach((mini, i) => {
          expect(mini).toMatchObject({
            _id: minis[i]._id.toString(),
            name: minis[i].name,
            figure: minis[i].figure.toString()
          });
        });
      });
    });

    describe("GET /search?query=query", () => {
      let figures = [];
      beforeEach(async () => {
        const figure1 = await Figure.create({
          name: "Sarah Blitzer, IMEF Sniper",
          images: [images[0]._id, images[1]._id]
        });
        figures.push(figure1);
        const figure2 = await Figure.create({
          name: "Stub, Gnome Accountant",
          manufacturer: exampleManufacturer._id,
          images: [images[0]._id, images[1]._id]
        });
        figures.push(figure2);
        const figure3 = await Figure.create({
          name: "Fumbus, Iconic Alchemist",
          manufacturer: exampleManufacturer._id
        });
        figures.push(figure3);
      });

      it("should return 200 for a valid search", async () => {
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
          .post("/figures")
          .set("Authorization", "Bearer " + token0)
          .send(exampleFigure);
        expect(res.statusCode).toEqual(403);
      });

      it("should send a 400 when create fails", async () => {
        const res = await request(server)
          .post("/figures")
          .set("Authorization", "Bearer " + adminToken)
          .send({});
        expect(res.statusCode).toEqual(400);
      });

      it("should send a 200 and create a figure when admin", async () => {
        const res = await request(server)
          .post("/figures")
          .set("Authorization", "Bearer " + adminToken)
          .send(exampleFigure);
        expect(res.statusCode).toEqual(200);
        const storeFigure = await testUtils.findOne(Figure, {});
        expect(storeFigure).toMatchObject(exampleFigure);
      });
    });

    describe("PUT /:id", () => {
      beforeEach(async () => {
        await Figure.create({
          name: "figure 1"
        });
      });

      it("should send a 403 when not admin", async () => {
        const storedFigure = await testUtils.findOne(Figure, {});
        const res = await request(server)
          .put("/figures/" + storedFigure._id)
          .set("Authorization", "Bearer " + token0)
          .send(exampleFigure);
        expect(res.statusCode).toEqual(403);
      });

      it("should send a 200 and update when admin", async () => {
        const storedFigure = await testUtils.findOne(Figure, {});
        const res = await request(server)
          .put("/figures/" + storedFigure._id)
          .set("Authorization", "Bearer " + adminToken)
          .send(exampleFigure);
        expect(res.statusCode).toEqual(200);
        const storedFigure1 = await testUtils.findOne(Figure, {});
        expect(storedFigure1).toMatchObject(exampleFigure);
      });
    });
  });
});
