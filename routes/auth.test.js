const request = require("supertest");

const server = require("../server");
const testUtils = require("../test-utils");

const User = require("../models/user").default;
const Invite = require("../models/invite").default;
const PasswordToken = require("../models/passwordToken").default;
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const sendEmail = require("../utils/email/sendEmail").default;
jest.mock("../utils/email/sendEmail");

const bcryptSalt = Number(process.env.BCRYPT_SALT);

describe("/auth", () => {
  beforeAll(testUtils.connectDB);
  afterAll(testUtils.stopDB);

  afterEach(testUtils.clearDB);

  const invite = {
    code: "inviteCode"
  };
  const invite1 = {
    code: "inviteCode2"
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

  describe("before signup", () => {
    describe("POST /", () => {
      it("should return 401", async () => {
        const res = await request(server).post("/auth/login").send(user0);
        expect(res.statusCode).toEqual(401);
      });
    });

    describe("PUT /password", () => {
      it("should return 401", async () => {
        const res = await request(server).put("/auth/password").send(user0);
        expect(res.statusCode).toEqual(401);
      });
    });

    describe("POST /forgotpassword", () => {
      it("should return a 404", async () => {
        const res = await request(server)
          .post("/auth/forgotpassword")
          .send(user0);
        expect(res.statusCode).toEqual(404);
      });
    });

    describe("POST /logout", () => {
      it("should return 401", async () => {
        const res = await request(server).post("/auth/logout").send();
        expect(res.statusCode).toEqual(401);
      });
    });
  });

  describe("signup", () => {
    describe("POST /signup", () => {
      beforeEach(async () => {
        await Invite.create(invite);
        await Invite.create(invite1);
      });
      it("should return 400 without a password", async () => {
        const res = await request(server).post("/auth/signup").send({
          invite: invite.code,
          email: user0.email
        });
        expect(res.statusCode).toEqual(400);
      });
      it("should return 400 with empty password", async () => {
        const res = await request(server).post("/auth/signup").send({
          invite: invite.code,
          email: user1.email,
          password: ""
        });
        expect(res.statusCode).toEqual(400);
      });
      it("should return 400 without invite code", async () => {
        const res = await request(server).post("/auth/signup").send({
          email: user1.email,
          password: user1.password
        });
        expect(res.statusCode).toEqual(400);
      });
      it("should return 400 with wrong invite code", async () => {
        const res = await request(server).post("/auth/signup").send({
          invite: "invalid",
          email: user1.email,
          password: user1.password
        });
        expect(res.statusCode).toEqual(400);
      });
      it("should return 200 with a password", async () => {
        const res = await request(server)
          .post("/auth/signup")
          .send({ ...user1, invite: invite1.code });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toMatchObject({
          email: "user1@mail.com",
          username: "user1"
        });
      });
      it("should return 409 Conflict with a repeat signup", async () => {
        let res = await request(server)
          .post("/auth/signup")
          .send({ ...user0, invite: invite.code });
        expect(res.statusCode).toEqual(200);
        res = await request(server)
          .post("/auth/signup")
          .send({ ...user0, invite: invite1.code });
        expect(res.statusCode).toEqual(409);
      });
      it("should not store raw password", async () => {
        await request(server)
          .post("/auth/signup")
          .send({ ...user0, invite: invite.code });
        const users = await User.find().lean();
        users.forEach((user) => {
          expect(Object.values(user)).not.toContain(user0.password);
        });
      });
      // Todo: test roles
    });
  });
  describe.each([user0, user1])("User %# after signup", (user) => {
    let userObject;
    beforeEach(async () => {
      await Invite.create(invite);
      await request(server)
        .post("/auth/signup")
        .send({ ...user0, invite: invite.code });
      await Invite.create(invite1);
      await request(server)
        .post("/auth/signup")
        .send({ ...user1, invite: invite1.code });
      userObject = await User.findOne({ email: user.email });
    });

    describe("POST /", () => {
      it("should return 400 when password isn't provided", async () => {
        const res = await request(server).post("/auth/login").send({
          email: user.email
        });
        expect(res.statusCode).toEqual(400);
      });
      it("should return 401 when password doesn't match", async () => {
        const res = await request(server).post("/auth/login").send({
          email: user.email,
          password: "123"
        });
        expect(res.statusCode).toEqual(401);
      });
      it("should return 200 and a token when password matches", async () => {
        const res = await request(server).post("/auth/login").send(user);
        expect(res.statusCode).toEqual(200);
        expect(typeof res.body.token).toEqual("string");
      });
      it("should not store token on user", async () => {
        const res = await request(server).post("/auth/login").send(user);
        const token = res.body.token;
        const users = await User.find().lean();
        users.forEach((user) => {
          expect(Object.values(user)).not.toContain(token);
        });
      });
    });

    describe("POST /forgotpassword", () => {
      it("should return a 200 for a valid email", async () => {
        const res = await request(server)
          .post("/auth/forgotpassword")
          .send({ email: user.email });
        expect(res.statusCode).toEqual(200);
        expect(sendEmail).toHaveBeenCalled();
      });
    });

    describe("POST /resetpassword", () => {
      let resetToken = crypto.randomBytes(32).toString("hex");
      let hash;
      let passwordToken0;
      beforeEach(async () => {
        hash = await bcrypt.hash(resetToken, Number(bcryptSalt));
        passwordToken0 = await PasswordToken.create({
          token: hash,
          userId: userObject._id.toString()
        });
      });
      it("should return a 404 for missing userId or token", async () => {
        const res = await request(server).post("/auth/resetpassword").send({
          userId: userObject._id.toString(),
          token: "aaaa",
          password: "newpassword"
        });
        expect(res.statusCode).toEqual(404);
        const res1 = await request(server).post("/auth/resetpassword").send({
          userId: "aaaa",
          token: resetToken,
          password: "newpassword"
        });
        expect(res1.statusCode).toEqual(404);
      });
      it("should return a 200 for valid userId or token", async () => {
        const res = await request(server).post("/auth/resetpassword").send({
          userId: userObject._id.toString(),
          token: resetToken,
          password: "newpassword"
        });
        expect(res.statusCode).toEqual(200);
        expect(sendEmail).toHaveBeenCalled();
        const resultingUser = await User.findOne({ email: userObject.email });
        const isValid = await bcrypt.compare(
          "newpassword",
          resultingUser.password
        );
        expect(isValid).toBe(true);
      });
    });
  });

  describe("After both users login", () => {
    let token0;
    let token1;
    beforeEach(async () => {
      await Invite.create(invite);
      await request(server)
        .post("/auth/signup")
        .send({ ...user0, invite: invite.code });
      const res0 = await request(server).post("/auth/login").send(user0);
      token0 = res0.body.token;
      await Invite.create(invite1);
      await request(server)
        .post("/auth/signup")
        .send({ ...user1, invite: invite1.code });
      const res1 = await request(server).post("/auth/login").send(user1);
      token1 = res1.body.token;
    });

    describe("POST /password", () => {
      it("should reject bogus token", async () => {
        const res = await request(server)
          .put("/auth/password")
          .set("Authorization", "Bearer BAD")
          .send({ password: "123" });
        expect(res.statusCode).toEqual(401);
      });
      it("should reject empty password", async () => {
        const res = await request(server)
          .put("/auth/password")
          .set("Authorization", "Bearer " + token0)
          .send({ password: "" });
        expect(res.statusCode).toEqual(400);
      });
      it("should change password for user0", async () => {
        const res = await request(server)
          .put("/auth/password")
          .set("Authorization", "Bearer " + token0)
          .send({ password: "123" });
        expect(res.statusCode).toEqual(200);
        let loginRes0 = await request(server).post("/auth/login").send(user0);
        expect(loginRes0.statusCode).toEqual(401);
        loginRes0 = await request(server).post("/auth/login").send({
          email: user0.email,
          password: "123"
        });
        expect(loginRes0.statusCode).toEqual(200);
        const loginRes1 = await request(server).post("/auth/login").send(user1);
        expect(loginRes1.statusCode).toEqual(200);
      });
      it("should change password for user1", async () => {
        const res = await request(server)
          .put("/auth/password")
          .set("Authorization", "Bearer " + token1)
          .send({ password: "123" });
        expect(res.statusCode).toEqual(200);
        const loginRes0 = await request(server).post("/auth/login").send(user0);
        expect(loginRes0.statusCode).toEqual(200);
        let loginRes1 = await request(server).post("/auth/login").send(user1);
        expect(loginRes1.statusCode).toEqual(401);
        loginRes1 = await request(server).post("/auth/login").send({
          email: user1.email,
          password: "123"
        });
        expect(loginRes1.statusCode).toEqual(200);
      });
    });
    describe("POST /logout", () => {
      it("should reject bogus token", async () => {
        const res = await request(server)
          .post("/auth/logout")
          .set("Authorization", "Bearer BAD")
          .send();
        expect(res.statusCode).toEqual(401);
      });
      it("should prevent only user0 from making a password change", async () => {
        const res = await request(server)
          .post("/auth/logout")
          .set("Authorization", "Bearer " + token0)
          .send();
        expect(res.statusCode).toEqual(200);
        const res0 = await request(server)
          .put("/auth/password")
          .set("Authorization", "Bearer " + token0)
          .send({ password: "123" });
        expect(res0.statusCode).toEqual(401);
        const res1 = await request(server)
          .put("/auth/password")
          .set("Authorization", "Bearer " + token1)
          .send({ password: "123" });
        expect(res1.statusCode).toEqual(200);
      });
      it("should prevent only user1 from making a password change", async () => {
        const res = await request(server)
          .post("/auth/logout")
          .set("Authorization", "Bearer " + token1)
          .send();
        expect(res.statusCode).toEqual(200);
        const res0 = await request(server)
          .put("/auth/password")
          .set("Authorization", "Bearer " + token0)
          .send({ password: "123" });
        expect(res0.statusCode).toEqual(200);
        const res1 = await request(server)
          .put("/auth/password")
          .set("Authorization", "Bearer " + token1)
          .send({ password: "123" });
        expect(res1.statusCode).toEqual(401);
      });
    });
  });
});
