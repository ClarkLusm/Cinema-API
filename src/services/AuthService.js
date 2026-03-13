require("dotenv").config();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const UserRepo = require("../repositories/UserRepository");
const { sendMailService, mailTemplate } = require("./MailService");

exports.register = async ({ fullname, email, password }) => {
  const existing = await UserRepo.getByEmail(email);

  if (existing) {
    throw new Error("EMAIL_EXIST");
  }

  const hashpw = await bcrypt.hash(password, 10);

  const newUser = await UserRepo.createUser({
    fullname,
    email,
    password: hashpw,
  });

  const payload = {
    userId: newUser.insertId,
    email,
  };

  const token = jwt.sign(payload, process.env.ACTIVATION_SECRET, {
    expiresIn: process.env.ACTIVATION_EXPIRES,
  });

  const activeLink = `http://localhost:3000/activate-account?token=${token}`;
  try {
    await sendMailService({
      to: email,
      subject: "Activate Account",
      html: mailTemplate(
        "Click the button below to activate your account",
        activeLink,
        "Activate Account",
      ),
    });
  } catch (error) {
    console.log("MAIL ERROR:", error);
  }
  return token;
};

exports.login = async ({ email, password }) => {
  const user = await UserRepo.getByEmail(email);
  
  if (!user) {
    throw new Error("EMAIL_NOT_FOUND");
  }

  if (!user.is_active) {
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  const match = await bcrypt.compare(password, user.password);
  
  if (!match) {
    throw new Error("PASSWORD_WRONG");
  }

  const payload = {
    id: user.id,
    email: user.email,
    fullname: user.fullname,
  };

  return jwt.sign(payload, process.env.ACTIVATION_SECRET, {
    expiresIn: process.env.ACTIVATION_EXPIRES,
  });
};

exports.forgotPassword = async (email) => {
  const user = await UserRepo.getByEmail(email);

  if (!user) {
    throw new Error("EMAIL_NOT_FOUND");
  }

  const token = crypto.randomBytes(32).toString("hex");

  const resetToken = crypto.createHash("sha256").update(token).digest("hex");

  const activeLink = `http://localhost:3000/reset-password?id=${user.id}&token=${resetToken}`;

  await sendMailService({
    to: email,
    subject: "Forgot Password Link",
    html: mailTemplate(
      "We have received a request to reset your password. Please reset your password using the link below.",
      activeLink,
      "Reset Password",
    ),
  });

  await UserRepo.saveResetToken(user.id, resetToken);

  return { user, resetToken };
};

exports.activateAccount = async (token) => {
  const decoded = jwt.verify(token, process.env.ACTIVATION_SECRET);

  const user = await UserRepo.getById(decoded.userId);

  if (!user) throw new Error("USER_NOT_FOUND");

  if (user.is_active) {
    throw new Error("ACCOUNT_ACTIVATED");
  }

  await UserRepo.activateUser(user.id);

  return true;
};

exports.resendActivation = async (email) => {
  const user = await UserRepo.getByEmail(email);

  if (!user) throw new Error("USER_NOT_FOUND");

  if (user.is_active) {
    throw new Error("ACCOUNT_ACTIVATED");
  }

  if (user.is_active === 1) {
    return res.status(409).json({
      code: "already_activated",
      message: "Account already activated",
    });
  }

  const payload = {
    userId: user.id,
    email: user.email,
  };

  const token = jwt.sign({ payload }, process.env.ACTIVATION_SECRET, {
    expiresIn: process.env.ACTIVATION_EXPRIES,
  });

  const activeLink = `http://localhost:3000/activate-account?token=${token}`;

  await sendMailService({
    to: email,
    subject: "Activate Account",
    html: mailTemplate("Click", activeLink, "Activate Account"),
  });
};

exports.resetPassword = async ({ id, token, password }) => {
  const resetToken = await UserRepo.getResetToken(id);

  if (!resetToken) {
    throw new Error("INVALID_TOKEN");
  }

  if (new Date() > new Date(resetToken.expires_at)) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (resetToken.token !== token) {
    throw new Error("INVALID_TOKEN");
  }

  const hashpw = await bcrypt.hash(password, 10);

  await UserRepo.updatePassword(id, hashpw);

  await UserRepo.deleteResetToken(id);
};
