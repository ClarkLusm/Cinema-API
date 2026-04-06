const OrderService = require("../services/OrderService");

exports.checkout = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await OrderService.checkout(req.body, userId);

    res.json(result);
  } catch (err) {
    if (
      err.message === "Seats not valid or expired" ||
      err.message === "Missing required fields" ||
      err.message === "Showtime not found"
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};
