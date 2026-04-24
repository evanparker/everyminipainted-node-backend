import { Types } from "mongoose";
import ModerationReport, {
  IModerationReport
} from "../models/moderationReport";

const getModerationReports = async (
  dbQuery: { [key: string]: unknown } = {},
  queryParams: { limit?: number; offset?: number; status?: string } = {},
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

const getModerationReportsOnUser = async (userId: string) => {
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
        "mini.userId": new Types.ObjectId(userId)
      }
    }
  ]);
  return reports;
};

export async function createModerationReport(
  userId: string | undefined | Types.ObjectId,
  reportObj: Partial<IModerationReport>
) {
  return ModerationReport.create({ userId, ...reportObj });
}

export async function getModerationReport(id: string) {
  return ModerationReport.findById(id)
    .populate([
      {
        path: "mini",
        options: { getDeleted: true },
        populate: ["images", "userId", "figure"]
      },
      "userId"
    ])
    .lean();
}

export async function getAllModerationReports(queryParams: {
  reportedUser?: string;
  userId?: string;
  status?: string;
}) {
  if (queryParams.reportedUser) {
    return await getModerationReportsOnUser(queryParams.reportedUser);
  }

  const dbQuery: { [key: string]: unknown } = {};
  if (queryParams?.userId) {
    dbQuery.userId = queryParams.userId;
    delete queryParams.userId;
  }
  if (queryParams?.status) {
    dbQuery.status = queryParams.status;
    delete queryParams.status;
  }
  return getModerationReports(dbQuery, queryParams);
}

export async function updateModerationReport(
  id: string,
  reportObj: Partial<IModerationReport>
) {
  return ModerationReport.findByIdAndUpdate(id, reportObj);
}
