import Invite, { IInvite } from "../models/invite";

export async function getAllInvites() {
  return await Invite.find().lean();
}

export async function getInviteByCode(code: string) {
  return await Invite.findOne({ code: code }).lean();
}

export async function createInvite(obj: IInvite) {
  return await Invite.create(obj);
}

export async function deleteInvite(code: string) {
  return await Invite.findOneAndDelete({ code: code }).lean();
}
