const db = require("../config/db.config");
const User = require("../models/UserModel");

exports.createUser = async ({ fullname, email, password }) => {
  const [result] = await db.execute(
    `INSERT INTO ${User.table} (fullname,email,password,is_active) VALUES (?,?,?,0)`,
    [fullname, email, password]
  );
  return result;
};

exports.getByEmail = async (email) => {
  const [rows] = await db.execute(
    `SELECT * FROM ${User.table} WHERE email = ?`,
    [email]
  );
  return rows[0] || null;
};

exports.getById = async (id) => {
  const [rows] = await db.execute(
    `SELECT * FROM ${User.table} WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

exports.activateUser = async (id) => {
  await db.execute(
    `UPDATE ${User.table} SET is_active = 1 WHERE id = ?`,
    [id]
  );
};

exports.updatePassword = async (id, password) => {
  await db.execute(
    `UPDATE ${User.table} SET password = ? WHERE id = ?`,
    [password, id]
  );
};

exports.saveResetToken = async (id, token) => {
  const createdAt = new Date();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.execute(
    `INSERT INTO ${User.resetTokenTable} (token,created_at,expires_at,id) VALUES (?,?,?,?)`,
    [token, createdAt, expiresAt, id]
  );
};

exports.getResetToken = async (id) => {
  const [rows] = await db.execute(
    `SELECT token,expires_at FROM ${User.resetTokenTable} WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

exports.deleteResetToken = async (id) => {
  await db.execute(
    `DELETE FROM ${User.resetTokenTable} WHERE id = ?`,
    [id]
  );
};

exports.getListCustomer = async (search, limit, offset) => {
  const [rows] = await db.execute(
    `SELECT * FROM ${User.table} WHERE fullname LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?`,
    [`%${search}%`, limit, offset]
  );
  return rows;
};

exports.countCustomer = async (search) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total FROM ${User.table} WHERE fullname LIKE ?`,
    [`%${search}%`]
  );
  return rows[0].total;
};

exports.banUser = async (id, reason) => {
  const [result] = await db.execute(
    `UPDATE ${User.table} 
     SET status='BANNED',ban_reason=?,banned_at=NOW()
     WHERE id=?`,
    [reason, id]
  );

  return result.affectedRows;
};

exports.unbanUser = async (id) => {
  const [result] = await db.execute(
    `UPDATE ${User.table} 
     SET status='ACTIVE',ban_reason=NULL,banned_at=NULL
     WHERE id=?`,
    [id]
  );

  return result.affectedRows;
};