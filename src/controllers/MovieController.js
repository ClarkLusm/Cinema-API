const MovieService = require("../services/MovieService");

exports.createMovie = async (req, res, next) => {
  try {
    await MovieService.createMovie(req.body);

    res.json({
      success: true,
      message: "Movie created",
    });
  } catch (err) {
    next(err);
  }
};

exports.getMovies = async (req, res, next) => {
  try {
    const result = await MovieService.getMovieList(req.query);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMovieDetail = async (req, res, next) => {
  try {
    const movie = await MovieService.getMovieDetail(req.params.id);

    res.json({
      success: true,
      data: movie,
    });
  } catch (err) {
    next(err);
  }
};

exports.getSearchMovies = async (req, res, next) => {
  try {
    const movies = await MovieService.searchMovies(req.query);

    res.json({
      success: true,
      data: movies,
    });
  } catch (err) {
    next(err);
  }
};

exports.getSuggestMovies = async (req, res, next) => {
  try {
    const { keyword } = req.query;

    const movies = await MovieService.suggestMovies(keyword);

    res.json({
      success: true,
      data: movies,
    });
  } catch (err) {
    next(err);
  }
};
