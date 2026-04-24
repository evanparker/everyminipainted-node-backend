import Manufacturer, { IManufacturer } from "../models/manufacturer";

const getManufacturers = async (
  dbQuery = {},
  queryParams: { limit?: number; offset?: number } = {},
  options = {}
) => {
  const limit = queryParams.limit === undefined ? 20 : queryParams.limit;
  const offset = queryParams.offset === undefined ? 0 : queryParams.offset;

  const result = Manufacturer.paginate(dbQuery, {
    populate: "thumbnail",
    lean: true,
    offset,
    limit,
    sort: { createdAt: -1 },
    ...options
  });

  return result;
};

export async function getAllManufacturers(
  queryParams: { limit?: number; offset?: number } = {}
) {
  return getManufacturers({}, queryParams);
}

export async function getManufacturerById(id: string) {
  const manufacturer = await Manufacturer.findById(id)
    .lean()
    .populate({ path: "images" })
    .populate({ path: "thumbnail" });
  return manufacturer;
}

export async function getManufacturersBySearch(queryParams: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  return getManufacturers(
    { name: { $regex: queryParams.search, $options: "i" } },
    queryParams,
    { sort: { name: 1 } }
  );
}

export async function createManufacturer(obj: IManufacturer) {
  return await Manufacturer.create(obj);
}

export async function updateManufacturer(
  id: string,
  obj: Partial<IManufacturer>
) {
  return await Manufacturer.updateOne({ _id: id }, obj, { new: true });
}

export async function deleteManufacturer(id: string) {
  return await Manufacturer.findOneAndDelete({ _id: id });
}
