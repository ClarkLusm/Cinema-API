const OrderService = require("../services/OrderService");

exports.checkout = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await OrderService.checkout(req.body, userId);

    res.json(result);
  } catch (err) {
    next(err);
  }
};