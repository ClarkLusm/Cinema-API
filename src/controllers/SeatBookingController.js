const SeatService = require("../services/SeatService");

exports.holdSeats = async (req, res, next) => {
  try {
    const userId = req.user.id; // giả sử có auth middleware

    const result = await SeatService.holdSeats(req.body, userId);

    res.json(result);
  } catch (err) {
    next(err);
  }
};