const SeatRepo = require("../repositories/SeatBookingRepository");

exports.holdSeats = async (data, userId) => {
  const { showTimeId, seatIds } = data;

  if (!showTimeId || !seatIds || seatIds.length === 0) {
    throw new Error("Missing required fields");
  }

  //check ghế bị trùng
  const existingSeats = await SeatRepo.findConflictingSeats(
    showTimeId,
    seatIds
  );

  if (existingSeats.length > 0) {
    throw new Error("Some seats already taken");
  }

  //giữ ghế 5 phút
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

  const bookings = seatIds.map((seatId) => ({
    show_time_id: showTimeId,
    seat_id: seatId,
    user_id: userId,
    status: "HOLD",
    expires_at: expiresAt,
  }));

  try {
    await SeatRepo.insertSeatBookings(bookings);
  } catch (err) {
    // bắt lỗi duplicate key (UNIQUE)
    if (err.code === "ER_DUP_ENTRY") {
      throw new Error("Seats already booked (conflict)");
    }
    throw err;
  }

  return {
    success: true,
    message: "Seats held successfully",
    expiresAt,
  };
};