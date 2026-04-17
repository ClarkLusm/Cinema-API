"use strict";

const AuthService = require("../services/AuthService");
const UserService = require("../services/UserService");
const UserRepo = require("../repositories/UserRepository");

exports.register = async (req, res) => {
  try {
    const token = await AuthService.register(req.body);

    res.status(201).json({
      message: "Register successful",
      token,
    });
  } catch (err) {
    console.log(err);

    if (err.message === "EMAIL_EXIST") {
      return res.status(409).json({
        message: "Email đã tồn tại",
      });
    }

    res.status(500).json({
      message: "Server error",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const token = await AuthService.login({ email, password });

    const user = await UserRepo.getByEmail(email);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
      },
    });
  } catch (error) {
    console.error(error);
    if (error.message === "EMAIL_NOT_FOUND") {
      return res.status(404).json({ message: "Tài khoản chưa được đăng ký" });
    }
    if (error.message === "ACCOUNT_NOT_ACTIVE") {
      return res.status(403).json({ message: "Tài khoản chưa kích hoạt" });
    }
    if (error.message === "PASSWORD_WRONG") {
      return res.status(401).json({ message: "Sai mật khẩu" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    await AuthService.forgotPassword(email);

    res.status(200).json({
      success: true,
      message: "A password reset link has been sent to your email.",
    });
  } catch (err) {
    if (err.message === "EMAIL_NOT_FOUND") {
      return res.status(404).json({
        message: "Email not found",
      });
    }

    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.activateAccount = async (req, res) => {
  try {
    let token = req.body.token;

    if (!token) {
      token = req.headers.authorization?.split(" ")[1];
    }

    if (!token) {
      return res.status(400).json({ message: "Token not provided" });
    }

    await AuthService.activateAccount(token);

    return res.status(200).json({
      success: true,
      message: "Account activated successfully",
    });
  } catch (err) {
    console.error(err);

    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (err.message === "ACCOUNT_ACTIVATED") {
      return res.status(400).json({
        message: "Account already activated",
      });
    }

    return res.status(400).json({
      message: "Invalid or expired token",
    });
  }
};

exports.resendActivation = async (req, res) => {
  try {
    const token = AuthService.resendActivation(req.body);

    return res.status(200).json({
      success: true,
      message: "Activation link has been sent to your email",
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { id, token, password } = req.body;

    if (!id || !token || !password) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    await AuthService.resetPassword({ id, token, password });

    res.status(200).json({
      success: true,
      message: "Your password reset was successful",
    });
  } catch (err) {
    if (err.message === "INVALID_TOKEN") {
      return res.status(400).json({ message: "Invalid token" });
    }

    if (err.message === "TOKEN_EXPIRED") {
      return res.status(400).json({ message: "Token expired" });
    }

    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await UserService.updateProfile(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Update profile successfully",
      data: user,
    });
  } catch (err) {
    console.error(err);

    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(400).json({
      message: err.message,
    });
  }
};
