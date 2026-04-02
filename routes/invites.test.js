const request = require("supertest");

const server = require("../server");
const testUtils = require("../test-utils");

const User = require("../models/user").default;
const Image = require("../models/image").default;
const Invite = require("../models/invite").default;

describe("/invites", () => {
  beforeAll(testUtils.connectDB);
  afterAll(testUtils.stopDB);

  afterEach(testUtils.clearDB);

  const invite0 = {
    code: "code0"
  };
  const invite1 = {
    code: "code1"
  };

  describe("Before login", () => {
    describe("POST /", () => {
      it("should send 401 without a token", async () => {
        const res = await request(server).post("/invites").send(invite0);
        expect(res.statusCode).toEqual(401);
      });
      it("should send 401 with a bad token", async () => {
        const res = await request(server)
          .post("/invites")
          .set("Authorization", "Bearer BAD")
          .send(invite0);
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
    const invite2 = {
      code: "code2"
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
    let token1;
    let userId0;
    beforeEach(async () => {
      await Invite.create(invite0);
      await Invite.create(invite1);
      await Invite.create(invite2);
      const signupRes = await request(server)
        .post("/auth/signup")
        .send({ ...user0, invite: invite0.code });
      const res0 = await request(server).post("/auth/login").send(user0);
      token0 = res0.body.token;
      userId0 = signupRes.body._id;
      await request(server)
        .post("/auth/signup")
        .send({ ...user1, invite: invite1.code });
      await User.updateOne(
        { email: user1.email },
        { $push: { roles: "admin" } }
      );
      const res1 = await request(server).post("/auth/login").send(user1);
      token1 = res1.body.token;
    });

    describe("POST /", () => {
      it("should send 403 without admin", async () => {
        const res = await request(server)
          .post("/invites")
          .set("Authorization", `Bearer ${token0}`)
          .send(invite0);
        expect(res.statusCode).toEqual(403);
      });

      it("should send 401 without token", async () => {
        const res = await request(server).post(`/invites/`).send(invite0);
        expect(res.statusCode).toEqual(401);
      });

      it("should send 200 with admin", async () => {
        const res = await request(server)
          .post("/invites")
          .set("Authorization", `Bearer ${token1}`)
          .send(invite0);
        expect(res.statusCode).toEqual(200);
      });

      it("should send 409 with duplicate code", async () => {
        await request(server)
          .post("/invites")
          .set("Authorization", `Bearer ${token1}`)
          .send(invite0);
        const res = await request(server)
          .post("/invites")
          .set("Authorization", `Bearer ${token1}`)
          .send(invite0);
        expect(res.statusCode).toEqual(409);
      });

      it("should send 400 with no code", async () => {
        const res = await request(server)
          .post("/invites")
          .set("Authorization", `Bearer ${token1}`)
          .send({});
        expect(res.statusCode).toEqual(400);
      });
    });
    describe("GET /:code", () => {
      it("should send 200 for valid code", async () => {
        const res = await request(server)
          .get(`/invites/${invite2.code}`)
          .send();
        expect(res.statusCode).toEqual(200);
      });
      it("should send 404 for invalid code", async () => {
        const res = await request(server).get(`/invites/BADCODE`).send();
        expect(res.statusCode).toEqual(404);
      });
    });
    describe("DELETE /:code", () => {
      it("should send 200 for valid code", async () => {
        const res = await request(server)
          .delete(`/invites/${invite2.code}`)
          .set("Authorization", `Bearer ${token1}`)
          .send();
        expect(res.statusCode).toEqual(200);
      });
      it("should send 404 for invalid code", async () => {
        const res = await request(server)
          .delete(`/invites/BADCODE`)
          .set("Authorization", `Bearer ${token1}`)
          .send();
        expect(res.statusCode).toEqual(404);
      });
      it("should send 403 without admin", async () => {
        const res = await request(server)
          .delete(`/invites/${invite2.code}`)
          .set("Authorization", `Bearer ${token0}`)
          .send();
        expect(res.statusCode).toEqual(403);
      });
      it("should send 401 without token", async () => {
        const res = await request(server)
          .delete(`/invites/${invite2.code}`)
          .send();
        expect(res.statusCode).toEqual(401);
      });
    });
  });
});
