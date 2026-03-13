const bcrypt = require("bcrypt");
const UserRepo = require("../repositories/UserRepository");

exports.getProfile = async (id) => {

  const user = await UserRepo.getById(id);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const { password, email, ...safeUser } = user;

  return safeUser;
};

exports.getListCustomer = async (query) => {

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 5;
  const search = query.search || "";

  const offset = (page - 1) * limit;

  const users = await UserRepo.getListCustomer(search, limit, offset);

  const total = await UserRepo.countCustomer(search);

  return {
    data: users,
    pagination: {
      total,
      page,
      limit,
    },
  };
};

exports.changePassword = async ({ userId, oldPassword, newPassword }) => {

  const user = await UserRepo.getById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);

  if (!isMatch) {
    throw new Error("OLD_PASSWORD_WRONG");
  }

  const hashpw = await bcrypt.hash(newPassword, 10);

  await UserRepo.updatePassword(userId, hashpw);
};

exports.deleteCustomer = async (id) => {

  const affected = await UserRepo.deleteCustomer(id);

  if (affected === 0) {
    throw new Error("USER_NOT_FOUND");
  }
};

exports.banUser = async (id, reason) => {

  const user = await UserRepo.getById(id);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const affected = await UserRepo.banUser(id, reason);

  if (affected === 0) {
    throw new Error("USER_ALREADY_BANNED");
  }
};

exports.unbanUser = async (id) => {

  const affected = await UserRepo.unbanUser(id);

  if (affected === 0) {
    throw new Error("USER_NOT_BANNED");
  }
};