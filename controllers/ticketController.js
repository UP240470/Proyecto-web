const db = require("../config/db");

// POST /tickets - Crear un ticket nuevo
exports.createTicket = (req, res) => {
  const { title, description, type_id, priority, created_by } = req.body;
  const validPriorities = ['low', 'medium', 'high'];
  const finalPriority = priority || 'medium';

  if (!validPriorities.includes(finalPriority)) {
    return res.status(400).json({ error: "Prioridad no válida. Use: low, medium o high." });
  }

  const sql = "INSERT INTO tickets (title, description, type_id, status, priority, created_by, created_at) VALUES (?, ?, ?, 'open', ?, ?, ?)";
  db.query(sql, [title, description, type_id, finalPriority, created_by, new Date()], (err, result) => {
    if (err) {
        
        console.error(" ERROR DE MYSQL EN TICKETS:", err.sqlMessage || err);
        return res.status(500).json({ error: "Error al crear el ticket", details: err.sqlMessage });
    }
    res.status(201).json({ message: "Ticket creado exitosamente", ticketId: result.insertId });
});
};

// GET /tickets - Listado con filtros dinámicos
exports.getTickets = (req, res) => {
  const { status, priority, type_id, created_by } = req.query;
  let sql = "SELECT * FROM tickets WHERE 1=1";
  const parameters = [];

  if (status) { sql += " AND status = ?"; parameters.push(status); }
  if (priority) { sql += " AND priority = ?"; parameters.push(priority); }
  if (type_id) { sql += " AND type_id = ?"; parameters.push(type_id); }
  if (created_by) { sql += " AND created_by = ?"; parameters.push(created_by); }

  db.query(sql, parameters, (err, result) => {
    if (err) return res.status(500).json({ error: "error en el server" });
    res.json(result);
  });
};

// GET /tickets/:id - Detalle de un ticket
exports.getTicketById = (req, res) => {
  db.query("SELECT * FROM tickets WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "error en el server" });
    if (result.length === 0) return res.status(404).json({ error: "ticket no encontrado" });
    res.json(result[0]);
  });
};

// PATCH /tickets/:id/status - Cambiar estado
exports.updateStatus = (req, res) => {
  const { status } = req.body;
  db.query("UPDATE tickets SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "error al cambiar estado" });
    res.json({ message: "Estado actualizado" });
  });
};

// POST /tickets/assign - Asignar a un desarrollador
exports.assignTicket = (req, res) => {
  const { ticket_id, user_id } = req.body;
  const sqlAssign = "INSERT INTO tickets_devs (id_ticket, id_user, assigned_at) VALUES (?, ?, ?)";
  
  db.query(sqlAssign, [ticket_id, user_id, new Date()], (err) => {
    if (err) return res.status(500).json({ error: "error en la asignación" });
    
    // Actualizamos el estado del ticket automáticamente a 'in_progress'
    db.query("UPDATE tickets SET status = 'in_progress' WHERE id = ?", [ticket_id]);
    res.status(201).json({ message: `Ticket ${ticket_id} asignado al dev ${user_id}` });
  });
};

// GET /tickets/user/:id - Ver tickets de un usuario específico
exports.getTicketsByUser = (req, res) => {
  db.query("SELECT * FROM tickets WHERE created_by = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "error interno" });
    res.json(result);
  });
};

// DELETE /tickets/:id - Eliminar ticket
exports.deleteTicket = (req, res) => {
  db.query("DELETE FROM tickets WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "error al eliminar" });
    res.json({ message: "Ticket eliminado físicamente" });
  });
};