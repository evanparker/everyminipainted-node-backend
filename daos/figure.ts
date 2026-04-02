import Figure, { IFigure } from "../models/figure";

const getFigures = async (
  dbQuery = {},
  queryParams: { limit?: number; offset?: number } = {},
  options = {}
) => {
  const limit = queryParams.limit === undefined ? 20 : queryParams.limit;
  const offset = queryParams.offset === undefined ? 0 : queryParams.offset;

  const result = Figure.paginate(dbQuery, {
    populate: "thumbnail",
    lean: true,
    offset,
    limit,
    sort: { createdAt: -1 },
    ...options
  });

  return result;
};

export async function getAllFigures(queryParams = {}) {
  return getFigures({}, queryParams);
}

export async function getFigureById(id: string) {
  const figure = await Figure.findById(id)
    .lean()
    .populate({ path: "manufacturer" })
    .populate({ path: "images" })
    .populate({ path: "thumbnail" });
  return figure;
}

export async function getFiguresBySearch(
  queryParams: {
    limit?: number;
    offset?: number;
    search?: string;
    manufacturer?: string;
  } = {}
) {
  return getFigures(
    {
      $and: [
        {
          $or: [
            { name: { $regex: queryParams.search, $options: "i" } },
            { partNumber: { $regex: queryParams.search, $options: "i" } }
          ]
        },
        queryParams.manufacturer
          ? { manufacturer: queryParams.manufacturer }
          : {}
      ]
    },
    queryParams,
    { sort: { name: 1 } }
  );
}

export async function getFiguresBymanufacturerId(
  manufacturerId: string,
  queryParams = {}
) {
  return getFigures({ manufacturer: manufacturerId }, queryParams);
}

export async function createFigure(obj: IFigure) {
  return await Figure.create(obj);
}

export async function updateFigure(id: string, obj: Partial<IFigure>) {
  return await Figure.updateOne({ _id: id }, obj, { new: true });
}

export async function findAndUpdateFigure(
  filter: Record<string, unknown>,
  obj: Partial<IFigure>
) {
  return await Figure.findOneAndUpdate(filter, obj, {
    new: true
  });
}

export async function upsertFigure(
  filter: Record<string, unknown>,
  obj: Partial<IFigure>
) {
  return await Figure.findOneAndUpdate(filter, obj, {
    new: true,
    upsert: true // Make this update into an upsert
  });
}

export async function deleteFigure(id: string) {
  return await Figure.findOneAndDelete({ _id: id });
}
