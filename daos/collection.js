const mongoose = require("mongoose");
const Collection = require("../models/collection");

module.exports = {};

const getCollections = async (dbQuery = {}, queryParams = {}, options = {}) => {
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

module.exports.getAllCollections = async (queryParams = {}) => {
  return getCollections({}, queryParams);
};

module.exports.getCollectionById = async (id) => {
  const collection = await Collection.findById(id)
    .lean()
    .populate({ path: "manufacturer", lean: true })
    .populate({ path: "images", lean: true })
    .populate({ path: "thumbnail", lean: true })
    .populate({
      path: "figures",
      lean: true,
      populate: { path: "thumbnail", lean: true }
    });
  return collection;
};

module.exports.getCollectionsIncludingFigure = async (id, queryParams) => {
  const collections = await getCollections(
    { figures: { $in: id } },
    queryParams
  );
  return collections;
};

module.exports.getCollectionsBySearch = async (queryParams = {}) => {
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
};

module.exports.createCollection = async (obj) => {
  return await Collection.create(obj);
};

module.exports.updateCollection = async (id, obj) => {
  return await Collection.updateOne({ _id: id }, obj, { new: true });
};

module.exports.findAndUpdateCollection = async (filter, obj) => {
  return await Collection.findOneAndUpdate(filter, obj, {
    new: true
  });
};

module.exports.upsertCollection = async (filter, obj) => {
  return await Collection.findOneAndUpdate(filter, obj, {
    new: true,
    upsert: true // Make this update into an upsert
  });
};

module.exports.deleteCollection = async (id) => {
  return await Collection.findOneAndDelete({ _id: id });
};
