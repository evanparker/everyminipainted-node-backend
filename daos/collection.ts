import Collection, { ICollection } from "../models/collection";

const getCollections = async (
  dbQuery = {},
  queryParams: { limit?: number; offset?: number } = {},
  options = {}
) => {
  const limit = queryParams.limit === undefined ? 20 : queryParams.limit;
  const offset = queryParams.offset === undefined ? 0 : queryParams.offset;

  const result = Collection.paginate(dbQuery, {
    populate: "thumbnail",
    lean: true,
    offset,
    limit,
    sort: { createdAt: -1 },
    ...options
  });

  return result;
};

export async function getAllCollections(queryParams = {}) {
  return getCollections({}, queryParams);
}

export async function getCollectionById(id: string) {
  const collection = await Collection.findById(id)
    .lean()
    .populate({ path: "manufacturer" })
    .populate({ path: "images" })
    .populate({ path: "thumbnail" })
    .populate({
      path: "figures",
      populate: { path: "thumbnail" }
    });
  return collection;
}

export async function getCollectionsIncludingFigure(
  id: string,
  queryParams: any = {}
) {
  const collections = await getCollections(
    { figures: { $in: id } },
    queryParams
  );
  return collections;
}

export async function getCollectionsBySearch(queryParams: any = {}) {
  return getCollections(
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

export async function createCollection(obj: ICollection) {
  return await Collection.create(obj);
}

export async function updateCollection(id: string, obj: Partial<ICollection>) {
  return await Collection.updateOne({ _id: id }, obj, { new: true });
}

export async function findAndUpdateCollection(
  filter: any,
  obj: Partial<ICollection>
) {
  return await Collection.findOneAndUpdate(filter, obj, {
    new: true
  });
}

export async function upsertCollection(filter: any, obj: Partial<ICollection>) {
  return await Collection.findOneAndUpdate(filter, obj, {
    new: true,
    upsert: true // Make this update into an upsert
  });
}

export async function deleteCollection(id: string) {
  return await Collection.findOneAndDelete({ _id: id });
}
