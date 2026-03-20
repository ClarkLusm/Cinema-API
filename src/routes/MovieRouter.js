const router = require("express").Router();

const MovieRouter = require("../controllers/MovieController");
// const auth = require("../middlewares/AuthMiddleware");

router.get("/list-movie", MovieRouter.getMovies);
router.get("/movie/:id", MovieRouter.getMovieDetail);
router.get("/search", MovieRouter.getSearchMovies);
router.get("/suggest", MovieRouter.getSuggestMovies);

// router.post("/create-movie",auth,MovieController.createMovie);

module.exports = router;