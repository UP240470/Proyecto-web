const db = require("../config/db");

// POST /types - Crear nuevo tipo
exports.createType = (req, res) => {
  const { type, description, area } = req.body;
  if (!type || !description || !area) {
    return res.status(400).json({ error: "Faltan datos (type, description, area)." });
  }

  const sql = "INSERT INTO types (type, description, area) VALUES (?, ?, ?)";
  db.query(sql, [type, description, area], (err, result) => {
    if (err) return res.status(500).json({ error: "Error al crear tipo" });
    res.status(201).json({ message: "Tipo creado", id: result.insertId });
  });
};

// GET /types - Listar tipos con paginación
exports.getTypes = (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  const orderBy = req.query.orderBy || "type";
  const orderDirection = req.query.orderDirection === "desc" ? "DESC" : "ASC";

  const sql = `SELECT * FROM types ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`;
  db.query(sql, [limit, offset], (err, result) => {
    if (err) return res.status(500).json({ error: "Error en servidor" });
    res.json(result);
  });
};

// DELETE /types/:id - Eliminación física
exports.deleteType = (req, res) => {
  db.query("DELETE FROM types WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "Error al eliminar" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "No encontrado" });
    res.json({ message: "Tipo eliminado físicamente" });
  });
};