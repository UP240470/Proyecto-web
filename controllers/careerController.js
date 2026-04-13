const db = require("../config/db");

// POST /careers - Crear carrera
exports.createCareer = (req, res) => {
  const { name, active } = req.body;

  if (!name || active === undefined) {
    return res.status(400).json({ error: "Faltan datos. Se requieren name y active." });
  }

  const sqlInsert = "INSERT INTO careers (name, active) VALUES (?, ?)";
  db.query(sqlInsert, [name, active], (err, result) => {
    if (err) return res.status(500).json({ error: "error al insertar en la base de datos" });

    res.status(200).json({
      message: "carrera creada exitosamente",
      career: { id: result.insertId, name, active }
    });
  });
};

// GET /careers - Listado general
exports.getCareers = (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  const orderBy = req.query.orderBy || "name";
  const orderDirection = req.query.orderDirection === "desc" ? "DESC" : "ASC";

  // Nota: Igual que en usuarios, concatenamos orderBy/Direction con cuidado
  const sqlSearch = `SELECT id, name FROM careers WHERE active = 1 ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`;

  db.query(sqlSearch, [limit, offset], (err, result) => {
    if (err) return res.status(500).json({ error: "error en el server" });
    res.status(200).json(result);
  });
};

// GET /careers/filter - Filtro por nombre
exports.filterCareers = (req, res) => {
  const { name } = req.query;
  let sqlSearch = "SELECT id, name FROM careers WHERE active = 1";
  const parameters = [];

  if (name) {
    sqlSearch += " AND name LIKE ?";
    parameters.push(`%${name}%`); // Usamos LIKE para que sea más flexible
  }

  db.query(sqlSearch, parameters, (err, result) => {
    if (err) return res.status(500).json({ error: "error en el server" });
    res.json(result);
  });
};

// GET /careers/:id - Obtener una carrera específica
exports.getCareerById = (req, res) => {
  const sqlSearch = "SELECT id, name FROM careers WHERE id = ? AND active = 1";
  db.query(sqlSearch, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "error en el server" });
    if (result.length === 0) return res.status(404).json({ error: "carrera no encontrada" });
    res.status(200).json(result[0]);
  });
};

// PUT /careers/:id - Actualizar carrera
exports.updateCareer = (req, res) => {
  const careerId = req.params.id;
  const campos = Object.keys(req.body);

  if (campos.length === 0) return res.status(400).json({ error: "No hay campos para actualizar" });

  let sqlUpdate = "UPDATE careers SET ";
  const values = [];

  campos.forEach((campo, index) => {
    sqlUpdate += `${campo} = ?${index < campos.length - 1 ? ", " : ""}`;
    values.push(req.body[campo]);
  });

  sqlUpdate += " WHERE id = ?";
  values.push(careerId);

  db.query(sqlUpdate, values, (err) => {
    if (err) return res.status(500).json({ error: "Error al actualizar" });
    res.json({ message: "Carrera actualizada con éxito" });
  });
};

// DELETE /careers/:id - Borrado lógico
exports.deleteCareer = (req, res) => {
  const sqlLogicalDelete = "UPDATE careers SET active = 0 WHERE id = ?";
  db.query(sqlLogicalDelete, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "error en el server" });
    res.json({ message: "Carrera desactivada" });
  });
};