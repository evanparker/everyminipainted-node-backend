const request = require("supertest");

const server = require("../server");
const testUtils = require("../test-utils");

const User = require("../models/user").default;
const Image = require("../models/image").default;
const Mini = require("../models/mini").default;
const Invite = require("../models/invite").default;

describe("/users", () => {
  beforeAll(testUtils.connectDB);
  afterAll(testUtils.stopDB);

  afterEach(testUtils.clearDB);

  const userNormal = {
    email: "user-normal@mail.com",
    username: "user-normal",
    password: "999password",
    roles: ["user"]
  };
  const userOther = {
    email: "user-other@mail.com",
    username: "user-other",
    password: "777password",
    roles: ["user"]
  };

  const image0 = {
    cloudinaryPublicId: "t1lqquh8o8pdnnaouphl"
  };
  const image1 = {
    cloudinaryPublicId: "zufzijos4ca2p5dpuxsu"
  };
  let images;
  let user, user1;
  let minis = [];

  beforeEach(async () => {
    user = await User.create(userNormal);
    user1 = await User.create(userOther);
    images = (
      await Image.insertMany([
        { ...image0, userId: user._id },
        { ...image1, userId: user._id }
      ])
    ).map((i) => i.toJSON());
    const miniTemplate = {
      userId: user._id,
      images: [images[0]._id, images[1]._id]
    };
    for (let i = 0; i < 3; i++) {
      const mini = await Mini.create(miniTemplate);
      minis.push(mini);
    }
    await Mini.create({ ...miniTemplate, userId: user1._id });
  });

  describe("before login", () => {
    describe("GET /:username/minis", () => {
      it("should send 200 and all a user's minis", async () => {
        const res = await request(server)
          .get("/users/" + user.username + "/minis")
          .send();
        expect(res.statusCode).toEqual(200);
        expect(res.body.docs.length).toBe(3);
      });
      it("should send 404 for a bad id", async () => {
        const res = await request(server)
          .get("/users/" + "nouser" + "/minis")
          .send();
        expect(res.statusCode).toEqual(404);
      });
    });
    describe("GET /:username", () => {
      it("should send 404 if no user is found", async () => {
        const res = await request(server).get("/users/nouser").send();
        expect(res.statusCode).toEqual(404);
      });
      it("should send 200 if user is found", async () => {
        const res = await request(server)
          .get("/users/" + user.username)
          .send();
        expect(res.statusCode).toEqual(200);
        expect(res.body).toMatchObject({
          email: userNormal.email,
          username: userNormal.username,
          roles: ["user"]
        });
      });
      it("should not include a password field", async () => {
        const res = await request(server)
          .get("/users/" + user.username)
          .send();
        expect(res.statusCode).toEqual(200);
        expect(res.body.password).toBe(undefined);
      });
    });
    describe("PUT /:id", () => {
      it("should send 401 without a token", async () => {
        const res = await request(server)
          .put("/users/" + user._id)
          .send();
        expect(res.statusCode).toEqual(401);
      });
    });
  });

  describe("after login", () => {
    const invite0 = {
      code: "code0"
    };
    const invite1 = {
      code: "code1"
    };
    const userA = {
      email: "user-a@mail.com",
      username: "user-a",
      password: "123password"
    };
    const userB = {
      email: "user-b@mail.com",
      username: "user-b",
      password: "456password"
    };
    let tokenA;
    let tokenB;
    let userIdA;
    let userIdB;
    beforeEach(async () => {
      await Invite.create(invite0);
      await Invite.create(invite1);
      const signupRes = await request(server)
        .post("/auth/signup")
        .send({ ...userA, invite: invite0.code });
      const res0 = await request(server).post("/auth/login").send(userA);
      tokenA = res0.body.token;
      userIdA = signupRes.body._id;
      const signupResB = await request(server)
        .post("/auth/signup")
        .send({ ...userB, invite: invite1.code });
      await User.updateOne(
        { email: userB.email },
        { $push: { roles: "admin" } }
      );
      const res1 = await request(server).post("/auth/login").send(userB);
      tokenB = res1.body.token;
      userIdB = signupResB.body._id;
    });

    describe("GET /me", () => {
      it("should send a 401 if token isn't valid", async () => {
        const res = await request(server).get("/users/me").send();
        expect(res.statusCode).toEqual(401);
      });
      it("should send a 200 with valid token", async () => {
        const res = await request(server)
          .get("/users/me")
          .set("Authorization", "Bearer " + tokenA)
          .send();
        expect(res.statusCode).toEqual(200);
        expect(res.body.username).toEqual(userA.username);
        expect(res.body.password).toBeUndefined();
      });
    });

    describe("PUT /:id", () => {
      it("should send 404 if no user is found", async () => {
        const res = await request(server)
          .put("/users/6760251aa5945e92fb1f3629")
          .set("Authorization", "Bearer " + tokenA)
          .send({ description: "new-name" });
        expect(res.statusCode).toEqual(404);
        const res1 = await request(server)
          .put("/users/invalid_id")
          .set("Authorization", "Bearer " + tokenA)
          .send({ description: "new-name" });
        expect(res1.statusCode).toEqual(404);
      });
      it("should send 401 if editing user does not match and isn't an admin", async () => {
        const res = await request(server)
          .put(`/users/${userIdB}`)
          .set("Authorization", "Bearer " + tokenA)
          .send({ description: "new-name" });
        expect(res.statusCode).toEqual(401);
      });
      it("should send 200 on successful edit", async () => {
        // As self
        const res = await request(server)
          .put(`/users/${userIdA}`)
          .set("Authorization", "Bearer " + tokenA)
          .send({ description: "new-name" });
        expect(res.statusCode).toEqual(200);
        const updatedUserA = await User.findOne({ email: userA.email }).lean();
        expect(updatedUserA.description).toEqual("new-name");

        // As admin
        const res1 = await request(server)
          .put(`/users/${userIdA}`)
          .set("Authorization", "Bearer " + tokenB)
          .send({ description: "new-name2" });
        expect(res1.statusCode).toEqual(200);
        const updatedUserA2 = await User.findOne({ email: userA.email }).lean();
        expect(updatedUserA2.description).toEqual("new-name2");
      });
      it("should not be able to edit password", async () => {
        const res = await request(server)
          .put(`/users/${userIdA}`)
          .set("Authorization", "Bearer " + tokenA)
          .send({ description: "new-name", password: "newPassword" });
        expect(res.statusCode).toEqual(200);
        const updatedUserA = await User.findOne({ email: userA.email }).lean();
        expect(updatedUserA.password).not.toEqual("newPassword");
      });
      it("should not be able to edit roles without admin", async () => {
        const res = await request(server)
          .put(`/users/${userIdA}`)
          .set("Authorization", "Bearer " + tokenA)
          .send({ roles: ["user", "admin"] });
        expect(res.statusCode).toEqual(200);
        const updatedUserA = await User.findOne({ email: userA.email }).lean();
        expect(updatedUserA.roles).not.toContain("admin");
      });
      it("should be able to edit roles with admin", async () => {
        const res = await request(server)
          .put(`/users/${userIdA}`)
          .set("Authorization", "Bearer " + tokenB)
          .send({ roles: ["user", "admin"] });
        expect(res.statusCode).toEqual(200);
        const updatedUserA = await User.findOne({ email: userA.email }).lean();
        expect(updatedUserA.roles).toContain("admin");
      });
      it("should not include a password field in the response", async () => {
        const res = await request(server)
          .put(`/users/${userIdA}`)
          .set("Authorization", "Bearer " + tokenA)
          .send({ description: "new-name" });
        expect(res.statusCode).toEqual(200);
        expect(res.body.password).toBeUndefined();
      });
    });
  });
});
