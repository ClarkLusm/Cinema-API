require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/AuthRouter");
const userRoutes = require("./routes/UserRouter");
const movieRoutes = require("./routes/MovieRouter");
const seatRoutes = require("./routes/SeatBookingRouter");
const orderRoutes = require("./routes/OrderRouter");
const onePayRoutes = require("./routes/OnePayRouter");
const ticketRoutes = require("./routes/TicketRouter");
const cinemaRoutes = require("./routes/CinemaRouter");
const offerRoutes = require("./routes/OfferRouter");
const { frontendOrigins, backendPublicUrl, isVercel } = require("./config/runtimeConfig");
const { startSeatExpiryCleanup } = require("./services/SeatExpiryService");

const allowedOrigins = frontendOrigins.length ? frontendOrigins : ["http://localhost:3000"];
let backgroundJobsStarted = false;

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS_ORIGIN_NOT_ALLOWED"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
};

function createApp(options = {}) {
  const { enableBackgroundJobs = !isVercel } = options;
  const app = express();

  app.use(cors(corsOptions));
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/movies", movieRoutes);
  app.use("/api/seat", seatRoutes);
  app.use("/api/order", orderRoutes);
  app.use("/api/onepay", onePayRoutes);
  app.use("/api/tickets", ticketRoutes);
  app.use("/api/cinemas", cinemaRoutes);
  app.use("/api/offers", offerRoutes);

  app.get("/", (_req, res) => {
    res.json({
      message: "Cinema API is running",
      backendPublicUrl,
      allowedOrigins,
      mode: isVercel ? "vercel" : "node",
    });
  });

  app.use((err, _req, res, _next) => {
    console.error(err);

    if (err.message === "CORS_ORIGIN_NOT_ALLOWED") {
      return res.status(403).json({
        success: false,
        message: "Origin is not allowed by CORS",
      });
    }

    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  });

  if (enableBackgroundJobs && !backgroundJobsStarted) {
    startSeatExpiryCleanup();
    backgroundJobsStarted = true;
  }

  return app;
}

module.exports = { createApp };
