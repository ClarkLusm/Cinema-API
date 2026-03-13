const MovieRepo = require("../repositories/MovieRepository");
const { getPagination } = require("../utils/PaginationUtil");

exports.createMovie = async(data)=>{

  const {title,description,poster}=data;

  await MovieRepo.createMovie(title,description,poster);
};

exports.getMovieList = async(query)=>{

  const {page,limit,offset}=getPagination(query);
  const search=query.search||"";

  const movies = await MovieRepo.getMovies(search,limit,offset);

  const formattedMovies = movies.map(movie => ({
    ...movie,
    genres: movie.genres ? movie.genres.split(",") : []
  }));

  const total = await MovieRepo.countMovies(search);

  return{
    data:formattedMovies,
    pagination:{
      page,
      limit,
      total
    }
  };
};

exports.getMovieDetail = async(id)=>{

  const movie = await MovieRepo.getMovieById(id);

  if(!movie){
    throw new Error("Movie not found");
  }

  return movie;
};

exports.deleteMovie = async(id)=>{

  const affected = await MovieRepo.deleteMovie(id);

  if(affected===0){
    throw new Error("Movie not found");
  }
};