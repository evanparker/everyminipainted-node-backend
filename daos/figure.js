const mongoose = require("mongoose");
const Figure = require("../models/figure");

module.exports = {};

const getFigures = async (dbQuery = {}, queryParams = {}, options = {}) => {
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

module.exports.getAllFigures = async (queryParams = {}) => {
  return getFigures({}, queryParams);
};

module.exports.getFigureById = async (id) => {
  const figure = await Figure.findById(id)
    .lean()
    .populate({ path: "manufacturer", lean: true })
    .populate({ path: "images", lean: true })
    .populate({ path: "thumbnail", lean: true });
  return figure;
};

module.exports.getFiguresBySearch = async (queryParams = {}) => {
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
};

module.exports.getFiguresBymanufacturerId = async (
  manufacturerId,
  queryParams = {}
) => {
  return getFigures({ manufacturer: manufacturerId }, queryParams);
};

module.exports.createFigure = async (obj) => {
  return await Figure.create(obj);
};

module.exports.updateFigure = async (id, obj) => {
  return await Figure.updateOne({ _id: id }, obj, { new: true });
};

module.exports.findAndUpdateFigure = async (filter, obj) => {
  return await Figure.findOneAndUpdate(filter, obj, {
    new: true
  });
};

module.exports.upsertFigure = async (filter, obj) => {
  return await Figure.findOneAndUpdate(filter, obj, {
    new: true,
    upsert: true // Make this update into an upsert
  });
};

module.exports.deleteFigure = async (id) => {
  return await Figure.findOneAndDelete({ _id: id });
};
