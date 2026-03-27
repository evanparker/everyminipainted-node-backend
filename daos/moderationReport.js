const { default: mongoose } = require("mongoose");
const ModerationReport = require("../models/moderationReport");

module.exports = {};

const getModerationReports = async (
  dbQuery = {},
  queryParams = {},
  options = {}
) => {
  const limit = queryParams.limit === undefined ? 20 : queryParams.limit;
  const offset = queryParams.offset === undefined ? 0 : queryParams.offset;

  if (queryParams.status) {
    dbQuery.status = queryParams.status;
  }

  const result = ModerationReport.paginate(dbQuery, {
    populate: {
      path: "mini",
      options: { getDeleted: true },
      populate: "userId",
      lean: true
    },
    lean: true,
    offset,
    limit,
    sort: { createdAt: -1 },
    ...options
  });

  return result;
};

const getModerationReportsOnUser = async (userId) => {
  const reports = await ModerationReport.aggregate([
    {
      $lookup: {
        localField: "mini",
        from: "minis",
        foreignField: "_id",
        as: "mini"
      }
    },
    {
      $unwind: "$mini"
    },
    {
      $match: {
        "mini.userId": new mongoose.Types.ObjectId(userId)
      }
    }
  ]);
  return reports;
};

module.exports.createModerationReport = async (userId, reportObj) => {
  return ModerationReport.create({ userId, ...reportObj });
};

module.exports.getModerationReport = async (id) => {
  return ModerationReport.findById(id)
    .populate([
      {
        path: "mini",
        options: { getDeleted: true },
        populate: ["images", "userId", "figure"],
        lean: true
      },
      "userId"
    ])
    .lean();
};

module.exports.getAllModerationReports = async (queryParams) => {
  if (queryParams.reportedUser) {
    return await getModerationReportsOnUser(queryParams.reportedUser);
  }

  const dbQuery = {};
  if (queryParams?.userId) {
    dbQuery.userId = queryParams.userId;
    delete queryParams.userid;
  }
  if (queryParams?.status) {
    dbQuery.status = queryParams.status;
    delete queryParams.status;
  }
  return getModerationReports(dbQuery, queryParams);
};

module.exports.updateModerationReport = async (id, reportObj) => {
  return ModerationReport.findByIdAndUpdate(id, reportObj);
};
