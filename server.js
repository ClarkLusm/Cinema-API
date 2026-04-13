require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();

const authRoutes = require("./src/routes/AuthRouter");
const userRoutes = require("./src/routes/UserRouter");
const movieRoutes = require("./src/routes/MovieRouter");
const seatRoutes = require("./src/routes/SeatBookingRouter");
const OrderRoutes = require("./src/routes/OrderRouter");
const OnePayRoutes = require("./src/routes/OnePayRouter");
const TicketRoutes = require("./src/routes/TicketRouter");
const CinemaRoutes = require("./src/routes/CinemaRouter");
const OfferRoutes = require("./src/routes/OfferRouter");
const { startSeatExpiryCleanup } = require("./src/services/SeatExpiryService");

const PORT = Number(process.env.PORT || 5000);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/seat", seatRoutes)
app.use("/api/order", OrderRoutes)
app.use("/api/onepay", OnePayRoutes)
app.use("/api/tickets", TicketRoutes)
app.use("/api/cinemas", CinemaRoutes)
app.use("/api/offers", OfferRoutes)
app.get("/", (req, res) => res.send("Auth API is running"));

startSeatExpiryCleanup();

app.listen(PORT, () => {
  console.log(`Server chay tai http://localhost:${PORT}`);
});
