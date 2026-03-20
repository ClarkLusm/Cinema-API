const db = require("../config/db.config");
const Movie = require("../models/MovieModel");

exports.createMovie = async (title, description, poster) => {
  await db.execute(
    `INSERT INTO ${Movie.table}(title,description,poster)
     VALUES(?,?,?)`,
    [title, description, poster],
  );
};

exports.getMovieById = async (id) => {
  const [[movie]] = await db.execute(`SELECT * FROM movies WHERE id = ?`, [id]);

  if (!movie) return null;

  // genres
  const [genres] = await db.execute(
    `
    SELECT g.name 
    FROM genres g
    JOIN movie_genres mg ON g.id = mg.genre_id
    WHERE mg.movie_id = ?
    `,
    [id],
  );

  // showtimes
  const [showtimes] = await db.execute(
    `
    SELECT start_time, end_time
    FROM showtimes
    WHERE movie_id = ?
    `,
    [id],
  );

  return {
    ...movie,
    genres: genres.map((g) => g.name),
    showtimes,
  };
};

exports.getMovies = async (search, limit, offset) => {
  const [rows] = await db.execute(
    `SELECT 
        m.*,
        GROUP_CONCAT(g.name) AS genres
     FROM (
        SELECT *
        FROM ${Movie.table}
        WHERE title LIKE ?
        ORDER BY id DESC
        LIMIT ? OFFSET ?
     ) m
     LEFT JOIN movie_genres mg ON mg.movie_id = m.id
     LEFT JOIN genres g ON g.id = mg.genre_id
     GROUP BY m.id`,
    [`%${search}%`, limit, offset],
  );

  return rows;
};

exports.countMovies = async (search) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) total
     FROM ${Movie.table}
     WHERE title LIKE ?`,
    [`%${search}%`],
  );

  return rows[0].total;
};

exports.deleteMovie = async (id) => {
  const [result] = await db.execute(`DELETE FROM ${Movie.table} WHERE id=?`, [
    id,
  ]);

  return result.affectedRows;
};

exports.searchMovies = async (keyword) => {
  const query = `
    SELECT 
      m.*,
      GROUP_CONCAT(g.name) AS genres
    FROM ${Movie.table} m
    LEFT JOIN movie_genres mg ON m.id = mg.movie_id
    LEFT JOIN genres g ON mg.genre_id = g.id
    WHERE LOWER(m.title) LIKE LOWER(?)
    GROUP BY m.id
  `;

  const [rows] = await db.execute(query, [`%${keyword}%`]);

  return rows.map((row) => ({
    ...row,
    genres: row.genres ? row.genres.split(",") : [],
  }));
};

exports.suggestMovies = async (keyword) => {
  const query = `
    SELECT 
      m.*,
      GROUP_CONCAT(g.name) AS genres
    FROM ${Movie.table} m
    LEFT JOIN movie_genres mg ON m.id = mg.movie_id
    LEFT JOIN genres g ON mg.genre_id = g.id
    WHERE LOWER(m.title) LIKE LOWER(?)
    GROUP BY m.id
    LIMIT 10
  `;

  const [rows] = await db.execute(query, [`%${keyword}%`]);

  return rows.map((row) => ({
    ...row,
    genres: row.genres ? row.genres.split(",") : [],
  }));
};
