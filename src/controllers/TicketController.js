const TicketService = require("../services/TicketService");

exports.verifyTicket = async (req, res, next) => {
  try {
    const result = await TicketService.verifyTicket(
      req.params.ticketCode,
      req.query.sig
    );

    const acceptsHtml = String(req.headers.accept || "").includes("text/html");

    if (acceptsHtml) {
      const ticket = result.ticket;
      return res.send(`
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Ticket Verified</title>
            <style>
              body { font-family: Arial, sans-serif; background: #0b0f16; color: #fff; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
              .card { width:min(92vw, 520px); background:#141b26; border:1px solid rgba(255,255,255,.08); border-radius:24px; padding:28px; box-shadow:0 20px 60px rgba(0,0,0,.35); }
              .badge { display:inline-block; padding:8px 12px; border-radius:999px; background:#123c21; color:#8df0ae; font-weight:700; font-size:12px; letter-spacing:.08em; text-transform:uppercase; }
              h1 { margin:18px 0 8px; font-size:32px; }
              p { color:#c4cedd; }
              .row { display:flex; justify-content:space-between; gap:16px; padding:12px 0; border-top:1px solid rgba(255,255,255,.06); }
            </style>
          </head>
          <body>
            <div class="card">
              <span class="badge">Valid Ticket</span>
              <h1>${ticket.movieTitle || "Cinema Ticket"}</h1>
              <p>${ticket.cinemaName || "Cinema"} • ${ticket.roomName || "Hall"}</p>
              <div class="row"><strong>Ticket code</strong><span>${ticket.ticketCode}</span></div>
              <div class="row"><strong>Booking code</strong><span>${ticket.bookingCode || "-"}</span></div>
              <div class="row"><strong>Showtime</strong><span>${ticket.startTime || "-"}</span></div>
              <div class="row"><strong>Seats</strong><span>${ticket.seats.map((seat) => seat.label).join(", ")}</span></div>
            </div>
          </body>
        </html>
      `);
    }

    res.json(result);
  } catch (err) {
    if (
      err.message === "Missing required fields" ||
      err.message === "Invalid ticket signature" ||
      err.message === "Ticket not found" ||
      err.message === "Ticket not active"
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};
