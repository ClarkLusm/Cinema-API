const UserService = require("../services/UserService");
const { sendMailService } = require("../services/MailService");


exports.profile = async (req, res) => {
  try {

    const user = await UserService.getProfile(req.params.id);
    
    res.json({
      success: true,
      message: "Get profile successfully",
      data: user,
    });

  } catch (err) {

    res.status(400).json({
      message: err.message,
    });

  }
};

exports.listCustomer = async (req, res) => {

  try {

    const result = await UserService.getListCustomer(req.query);

    res.json({
      success: true,
      ...result,
    });

  } catch (err) {

    res.status(500).json({
      message: "Server error",
    });

  }
};

exports.changePassword = async (req, res) => {

  try {

    await UserService.changePassword(req.body);

    res.json({
      message: "Update password successful",
    });

  } catch (err) {

    res.status(400).json({
      message: err.message,
    });

  }
};

exports.deleteCustomer = async (req, res) => {

  try {

    await UserService.deleteCustomer(req.params.id);

    res.json({
      message: "Customer deleted successfully",
    });

  } catch (err) {

    res.status(400).json({
      message: err.message,
    });

  }
};

exports.banUser = async (req, res) => {

  try {

    await UserService.banUser(req.params.id, req.body.reason);

    res.json({
      message: "User banned successfully",
    });

  } catch (err) {

    res.status(400).json({
      message: err.message,
    });

  }
};

exports.unbanUser = async (req, res) => {

  try {

    await UserService.unbanUser(req.params.id);

    res.json({
      message: "User unbanned successfully",
    });

  } catch (err) {

    res.status(400).json({
      message: err.message,
    });

  }
};

exports.sendMail = async (req, res) => {

  try {

    const { email, subject, message } = req.body;

    await sendMailService({
      to: email,
      subject,
      html: `<h3>${message}</h3>`,
    });

    res.json({
      success: true,
      message: "Send email successful",
    });

  } catch (err) {

    res.status(500).json({
      message: "Send mail failed",
    });

  }
};
