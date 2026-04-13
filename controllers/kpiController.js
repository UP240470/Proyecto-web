const db = require("../config/db");

// Obtener conteo de tickets por estado (open, in_progress, closed)
exports.getTicketsStatusKPI = (req, res) => {
  const sql = "SELECT status, COUNT(*) as count FROM tickets GROUP BY status";

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error al obtener KPI de estados:", err);
      return res.status(500).json({ error: "error en el server" });
    }

    // Transformamos a formato amigable: { open: 5, closed: 2 }
    const kpi = {};
    result.forEach(row => {
      kpi[row.status] = row.count;
    });

    res.json(kpi);
  });
};

// Obtener conteo de tickets creados por cada usuario
exports.getTicketsUserKPI = (req, res) => {
  const sql = "SELECT created_by, COUNT(*) as count FROM tickets GROUP BY created_by";

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error al obtener KPI de usuarios:", err);
      return res.status(500).json({ error: "error en el server" });
    }

    const kpi = {};
    result.forEach(row => {
      kpi[row.created_by] = row.count;
    });

    res.json(kpi);
  });
};