const db = require("../config/db.config");
const Offer = require("../models/OfferModel");

exports.getOffers = async (limit, offset) => {
  const query = `
    SELECT *
    FROM ${Offer.offers}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await db.execute(query, [limit, offset]);
  return rows;
};

exports.countOffers = async () => {
  const query = `
    SELECT COUNT(*) AS total
    FROM ${Offer.offers}
  `;

  const [rows] = await db.execute(query);
  return rows[0].total;
};

exports.getOfferById = async (offerId) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM ${Offer.offers}
    WHERE id = ?
    LIMIT 1
    `,
    [offerId]
  );

  return rows[0];
};
