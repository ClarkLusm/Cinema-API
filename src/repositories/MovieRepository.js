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
  const [rows] = await db.execute(`SELECT * FROM ${Movie.table} WHERE id=?`, [
    id,
  ]);

  return rows[0] || null;
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
