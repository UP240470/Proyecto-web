const db = require("../config/db");

exports.getCategories = (req, res) => {
  const sql = "SELECT id, name, description FROM categorias";
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: "Error interno" });
    res.status(200).json(result);
  });
};