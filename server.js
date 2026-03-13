const express = require("express");
const cors = require("cors");
const app = express();

const authRoutes = require("./src/routes/AuthRouter");
const userRoutes = require("./src/routes/UserRouter");
const movieRoutes = require("./src/routes/MovieRouter");

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/movies", movieRoutes);
app.get("/", (req, res) => res.send("Auth API is running"));

app.listen(5000, () => {
  console.log("Server chay tai http://localhost:5000");
});
