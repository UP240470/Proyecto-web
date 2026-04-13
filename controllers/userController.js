const db = require("../config/db");

// POST /users - Crear usuario
exports.createUser = (req, res) => {
    const data = req.body;
    const fields = Object.keys(data);

    if (fields.length < 6) {
        return res.status(400).json({ error: "Faltan datos. Se requieren al menos 6 campos." });
    }

    const { name, last_name, username, email, career_id, active, password, rol } = data;

    const sqlCheck = "SELECT * FROM users WHERE email = ? OR username = ?";
    db.query(sqlCheck, [email, username], (err, result) => {
        if (err) {
            console.error(" ERROR EN CHECK:", err);
            return res.status(500).json({ error: "Error en el servidor al verificar duplicados" });
        }
        if (result.length > 0) {
            return res.status(400).json({ error: "El email o el username ya están registrados" });
        }

        const sqlInsert = "INSERT INTO users (name, last_name, username, email, career_id, active, password, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        db.query(sqlInsert, [name, last_name, username, email, career_id, active, password, rol], (err, result) => {
            if (err) {
    
                console.error(" ERROR REAL DE MYSQL AL INSERTAR:", err.sqlMessage || err);
                return res.status(500).json({ error: "error al insertar en la base de datos", details: err.sqlMessage });
            }
            res.status(200).json({
                message: "usuario creado exitosamente",
                user: { id: result.insertId, username, rol },
            });
        });
    });
};

// GET /users - Listado con paginación
exports.getUsers = (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const orderBy = req.query.orderBy || "name";
    const orderDirection = req.query.orderDirection === "desc" ? "DESC" : "ASC";

    const sqlSearch = `SELECT id,name,last_name,email,rol,active FROM users WHERE active = 1 ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`;

    db.query(sqlSearch, [limit, offset], (err, result) => {
        if (err) return res.status(500).json({ error: "error en el server" });
        res.status(200).json(result);
    });
};

// GET /users/filter - Filtros dinámicos
exports.filterUsers = (req, res) => {
    const { name, email, career, rol } = req.query;
    let sqlSearch = "SELECT id, name, last_name, email, rol, active FROM users WHERE 1=1";
    const parameters = [];

    if (name) { sqlSearch += " AND name = ?"; parameters.push(name); }
    if (email) { sqlSearch += " AND email = ?"; parameters.push(email); }
    if (rol) { sqlSearch += " AND rol = ?"; parameters.push(rol); }
    if (career) { sqlSearch += " AND career_id = ?"; parameters.push(career); }

    db.query(sqlSearch, parameters, (err, result) => {
        if (err) return res.status(500).json({ error: "error en el server" });
        res.json(result);
    });
};

// GET /users/:id - Obtener uno por ID
exports.getUserById = (req, res) => {
    const sqlSearch = "SELECT id,name,last_name,email,rol,active FROM users WHERE id = ? AND active = 1";
    db.query(sqlSearch, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: "error en el server" });
        if (result.length === 0) return res.status(404).json({ error: "usuario no encontrado" });
        res.status(200).json(result[0]);
    });
};

// PATCH /users/:id/status - Cambiar estado
exports.updateStatus = (req, res) => {
    const active = req.body.active;
    const sqlUpdate = "UPDATE users SET active = ? WHERE id = ?";
    db.query(sqlUpdate, [active, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: "error en el server" });
        res.status(200).json({ message: "estado actualizado exitosamente" });
    });
};

// PUT /users/:id - Actualización dinámica
exports.updateUser = (req, res) => {
    const userId = req.params.id;
    const campos = Object.keys(req.body);

    if (campos.length > 5) return res.status(400).json({ error: "Límite de 5 campos superado." });
    if (campos.length === 0) return res.status(400).json({ error: "No hay campos para actualizar" });

    let sqlUpdate = "UPDATE users SET ";
    const values = [];

    campos.forEach((campo, index) => {
        sqlUpdate += `${campo} = ?${index < campos.length - 1 ? ", " : ""}`;
        values.push(req.body[campo]);
    });

    sqlUpdate += " WHERE id = ?";
    values.push(userId);

    db.query(sqlUpdate, values, (err) => {
        if (err) return res.status(500).json({ error: "Error al actualizar" });
        res.json({ message: "Usuario actualizado con éxito" });
    });
};

// DELETE /users/:id - Borrado lógico
exports.deleteUser = (req, res) => {
    const sqlLogicalDelete = "UPDATE users SET active = 0 WHERE id = ?";
    db.query(sqlLogicalDelete, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "error en el server" });
        res.json({ message: "Usuario desactivado correctamente" });
    });
};