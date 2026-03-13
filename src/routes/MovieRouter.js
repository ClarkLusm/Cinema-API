const router = require("express").Router();

const MovieRouter = require("../controllers/MovieController");
// const auth = require("../middlewares/AuthMiddleware");

router.get("/list-movie", MovieRouter.getMovies);

// router.get("/movie/:id",MovieController.getMovieDetail);

// router.post("/create-movie",auth,MovieController.createMovie);

module.exports = router;