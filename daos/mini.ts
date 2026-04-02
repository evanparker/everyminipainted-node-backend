import Mini, { IMini } from "../models/mini";

const getMinis = async (
  dbQuery = {},
  queryParams: { limit?: number; offset?: number } = {},
  options = {}
) => {
  const limit = queryParams.limit === undefined ? 20 : queryParams.limit;
  const offset = queryParams.offset === undefined ? 0 : queryParams.offset;

  const result = Mini.paginate(
    { ...dbQuery, isDeleted: false },
    {
      populate: "thumbnail",
      lean: true,
      offset,
      limit,
      sort: { createdAt: -1 },
      ...options
    }
  );

  return result;
};

export async function getAllMinis(queryParams = {}) {
  return getMinis({}, queryParams);
}

export async function getMinisBySearch(queryParams: {
  limit?: number;
  offset?: number;
  search: string;
}) {
  return getMinis(
    { name: { $regex: queryParams.search, $options: "i" }, isDeleted: false },
    queryParams,
    { sort: { name: 1 } }
  );
}

export async function getMiniById(id: string) {
  let mini = await Mini.findById(id)
    .lean()
    .populate({ path: "figure" })
    .populate({
      path: "userId",
      populate: { path: "avatar" }
    })
    .populate({ path: "images" })
    .populate({ path: "thumbnail" });

  return mini;
}

export async function getMinisByUserId(userId: string, queryParams = {}) {
  return getMinis({ userId }, queryParams);
}

export async function getMinisByFigureId(figureId: string, queryParams = {}) {
  return getMinis({ figure: figureId }, queryParams);
}

export async function createMini(miniObj: IMini) {
  return await Mini.create(miniObj);
}

export async function updateMini(id: string, miniObj: Partial<IMini>) {
  return await Mini.findOneAndUpdate({ _id: id }, miniObj, { new: true });
}

export async function deleteMini(id: string) {
  return await Mini.findOneAndUpdate({ _id: id }, { isDeleted: true });
}
