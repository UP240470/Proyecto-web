// --- MÓDULOS ---
const express = require("express");
const db = require("./config/db");

const app = express();
const PORT = 3000;

app.use(express.json());

// ==========================================
// 1. MÓDULO DE AUTENTICACIÓN
// ==========================================

// Login con manejo de intentos fallidos
app.post("/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Faltan datos" });

    db.query('SELECT * FROM users WHERE username = ?', [username], (err, result) => {
        if (err) return res.status(500).json({ error: "Error en servidor" });
        if (result.length === 0) return res.status(404).json({ error: "Usuario no existe" });

        const user = result[0];
        if (user.failed_attempts >= 5) return res.status(401).json({ error: "Cuenta bloqueada" });

        if (user.password === password) {
            db.query('UPDATE users SET failed_attempts = 0 WHERE username = ?', [username]);
            return res.status(200).json({ 
                message: "Login exitoso", 
                user: { id: user.id, username: user.username, rol: user.rol } 
            });
        } else {
            db.query('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE username = ?', [username]);
            return res.status(401).json({ error: "Password incorrecto" });
        }
    });
});

// Obtener Perfil (versión con query param - más simple)
app.get("/auth/profile", (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "Se requiere userId" });
    
    db.query('SELECT id, name, last_name, username, email, rol, career_id FROM users WHERE id = ?', [userId], (err, result) => {
        if (err || result.length === 0) return res.status(404).json({ error: "Perfil no encontrado" });
        res.json(result[0]);
    });
});

// ==========================================
// 2. MÓDULO DE USUARIOS
// ==========================================

// Crear usuario con validación de existencia única
app.post("/users", (req, res) => {
    const { name, last_name, username, email, career_id, active, password, rol } = req.body;
    
    // Validar que el username o email no existan ya
    db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], (err, result) => {
        if (err) return res.status(500).json({ error: "Error en servidor" });
        if (result.length > 0) return res.status(400).json({ error: "Usuario o Email ya registrados" });

        const sql = 'INSERT INTO users (name, last_name, username, email, career_id, active, password, rol, failed_attempts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())';
        db.query(sql, [name, last_name, username, email, career_id, active, password, rol], (err, result) => {
            if (err) return res.status(500).json({ error: "Error al insertar" });
            res.status(201).json({ message: "Usuario creado", id: result.insertId });
        });
    });
});

// Obtener usuarios con PAGINACIÓN y ORDENAMIENTO
app.get("/users", (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const orderBy = req.query.orderBy || 'id';
    const orderDir = req.query.orderDir === 'desc' ? 'DESC' : 'ASC';
    
    // Validar que orderBy sea una columna válida para evitar inyección SQL
    const columnasPermitidas = ['id', 'name', 'last_name', 'username', 'email', 'rol', 'created_at'];
    const orderBySeguro = columnasPermitidas.includes(orderBy) ? orderBy : 'id';

    const sql = `SELECT id, name, last_name, email, rol FROM users WHERE active = 1 ORDER BY ${orderBySeguro} ${orderDir} LIMIT ? OFFSET ?`;
    db.query(sql, [limit, offset], (err, result) => {
        if (err) return res.status(500).json({ error: "Error" });
        res.json(result);
    });
});

// Obtener usuario por ID
app.get("/users/:id", (req, res) => {
    db.query('SELECT id, name, last_name, username, email, career_id, rol, active FROM users WHERE id = ? AND active = 1', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: "Error en servidor" });
        if (result.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
        res.status(200).json(result[0]);
    });
});

// Filtrar usuarios
app.get("/users/filter", (req, res) => {
    const { name, rol, career } = req.query;
    let sql = 'SELECT id, name, last_name, email, rol FROM users WHERE active = 1';
    const params = [];
    
    if (name) { 
        sql += ' AND name LIKE ?'; 
        params.push(`%${name}%`); 
    }
    if (rol) { 
        sql += ' AND rol = ?'; 
        params.push(rol); 
    }
    if (career) { 
        sql += ' AND career_id = ?'; 
        params.push(career); 
    }

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ error: "Error en filtro" });
        res.json(result);
    });
});

// Actualizar usuario (Máximo 5 campos)
app.put("/users/:id", (req, res) => {
    const campos = Object.keys(req.body);
    if (campos.length > 5) return res.status(400).json({ error: "Máximo 5 campos permitidos" });
    if (campos.length === 0) return res.status(400).json({ error: "No se enviaron datos" });
    
    let sql = 'UPDATE users SET ' + campos.map(c => `${c} = ?`).join(', ') + ' WHERE id = ?';
    const values = [...Object.values(req.body), req.params.id];

    db.query(sql, values, (err) => {
        if (err) return res.status(500).json({ error: "Error al actualizar" });
        res.json({ message: "Usuario actualizado" });
    });
});

// Cambiar estado del usuario
app.patch("/users/:id/status", (req, res) => {
    const { active } = req.body;
    if (active === undefined) return res.status(400).json({ error: "Se requiere el campo active (0 o 1)" });
    
    db.query('UPDATE users SET active = ? WHERE id = ?', [active, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al cambiar estado" });
        res.json({ message: "Estado de usuario actualizado" });
    });
});

// Eliminación lógica
app.delete("/users/:id", (req, res) => {
    db.query('UPDATE users SET active = 0 WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al eliminar" });
        res.json({ message: "Usuario desactivado (eliminación lógica)" });
    });
});

// ==========================================
// 3. MÓDULO DE CARRERAS
// ==========================================

// Obtener todas las carreras activas
app.get("/careers", (req, res) => {
    db.query('SELECT * FROM careers WHERE active = 1', (err, result) => {
        if (err) return res.status(500).json({ error: "Error" });
        res.json(result);
    });
});

// Filtrar carreras por nombre
app.get("/careers/filter", (req, res) => {
    const { name } = req.query;
    let sql = 'SELECT * FROM careers WHERE active = 1';
    const params = [];
    
    if (name) {
        sql += ' AND name LIKE ?';
        params.push(`%${name}%`);
    }
    
    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ error: "Error en filtro" });
        res.json(result);
    });
});

// Crear carrera
app.post("/careers", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "El nombre es requerido" });
    
    db.query('INSERT INTO careers (name, active) VALUES (?, 1)', [name], (err, result) => {
        if (err) return res.status(500).json({ error: "Error al crear" });
        res.status(201).json({ message: "Carrera creada", id: result.insertId });
    });
});

// Actualizar carrera
app.put("/careers/:id", (req, res) => {
    const { name, active } = req.body;
    db.query('UPDATE careers SET name = ?, active = ? WHERE id = ?', [name, active, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al actualizar" });
        res.json({ message: "Carrera actualizada" });
    });
});

// Eliminar carrera (lógico)
app.delete("/careers/:id", (req, res) => {
    db.query('UPDATE careers SET active = 0 WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al eliminar" });
        res.json({ message: "Carrera eliminada" });
    });
});

// ==========================================
// 4. MÓDULO DE TIPOS Y CATEGORÍAS
// ==========================================

// TIPOS DE TICKET (CRUD completo)

// Obtener todos los tipos
app.get("/types", (req, res) => {
    db.query('SELECT * FROM types', (err, result) => {
        if (err) return res.status(500).json({ error: "Error" });
        res.json(result);
    });
});

// Crear tipo
app.post("/types", (req, res) => {
    const { type, description, area } = req.body;
    if (!type) return res.status(400).json({ error: "El tipo es requerido" });
    
    db.query('INSERT INTO types (type, description, area) VALUES (?, ?, ?)', [type, description, area], (err, result) => {
        if (err) return res.status(500).json({ error: "Error al crear" });
        res.status(201).json({ message: "Tipo creado", id: result.insertId });
    });
});

// Actualizar tipo
app.put("/types/:id", (req, res) => {
    const { type, description, area } = req.body;
    db.query('UPDATE types SET type = ?, description = ?, area = ? WHERE id = ?', [type, description, area, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al actualizar" });
        res.json({ message: "Tipo actualizado" });
    });
});

// Eliminar tipo (físico)
app.delete("/types/:id", (req, res) => {
    db.query('DELETE FROM types WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al eliminar" });
        res.json({ message: "Tipo eliminado" });
    });
});

// CATEGORÍAS
app.get("/categories", (req, res) => {
    db.query('SELECT * FROM categorias', (err, result) => {
        if (err) return res.status(500).json({ error: "Error" });
        res.json(result);
    });
});

// ==========================================
// 5. MÓDULO DE TICKETS
// ==========================================

// Crear ticket con validación de usuario existente
app.post("/tickets", (req, res) => {
    const { title, description, type_id, status, priority, created_by } = req.body;
    
    // Validar que el usuario creador exista
    db.query('SELECT id FROM users WHERE id = ?', [created_by], (err, userRes) => {
        if (err) return res.status(500).json({ error: "Error en servidor" });
        if (userRes.length === 0) return res.status(400).json({ error: "Usuario creador no existe" });

        const sql = 'INSERT INTO tickets (title, description, type_id, status, priority, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())';
        db.query(sql, [title, description, type_id, status, priority, created_by], (err, result) => {
            if (err) return res.status(500).json({ error: "Error al crear ticket" });
            res.status(201).json({ message: "Ticket creado", id: result.insertId });
        });
    });
});

// Obtener todos los tickets
app.get("/tickets", (req, res) => {
    db.query('SELECT * FROM tickets', (err, result) => {
        if (err) return res.status(500).json({ error: "Error" });
        res.json(result);
    });
});

// Obtener ticket por ID
app.get("/tickets/:id", (req, res) => {
    db.query('SELECT * FROM tickets WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: "Error" });
        if (result.length === 0) return res.status(404).json({ error: "Ticket no existe" });
        res.json(result[0]);
    });
});

// Filtrar tickets
app.get("/tickets/filter", (req, res) => {
    const { status, priority, type_id, created_by } = req.query;
    let sql = 'SELECT * FROM tickets WHERE 1=1';
    const params = [];
    
    if (status) { 
        sql += ' AND status = ?'; 
        params.push(status); 
    }
    if (priority) { 
        sql += ' AND priority = ?'; 
        params.push(priority); 
    }
    if (type_id) { 
        sql += ' AND type_id = ?'; 
        params.push(type_id); 
    }
    if (created_by) { 
        sql += ' AND created_by = ?'; 
        params.push(created_by); 
    }

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ error: "Error en filtro" });
        res.json(result);
    });
});

// Obtener tickets por usuario específico
app.get("/tickets/user/:id", (req, res) => {
    db.query('SELECT * FROM tickets WHERE created_by = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: "Error" });
        res.json(result);
    });
});

// Actualizar ticket
app.put("/tickets/:id", (req, res) => {
    const campos = Object.keys(req.body);
    if (campos.length === 0) return res.status(400).json({ error: "No se enviaron datos" });
    
    let sql = 'UPDATE tickets SET ' + campos.map(c => `${c} = ?`).join(', ') + ' WHERE id = ?';
    const values = [...Object.values(req.body), req.params.id];
    
    db.query(sql, values, (err) => {
        if (err) return res.status(500).json({ error: "Error al actualizar" });
        res.json({ message: "Ticket actualizado" });
    });
});

// Cambiar estado del ticket
app.patch("/tickets/:id/status", (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Se requiere el campo status" });
    
    db.query('UPDATE tickets SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al cambiar estado" });
        res.json({ message: "Estado de ticket actualizado" });
    });
});

// Eliminar ticket (físico)
app.delete("/tickets/:id", (req, res) => {
    db.query('DELETE FROM tickets WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al eliminar" });
        res.json({ message: "Ticket eliminado" });
    });
});

// Asignar ticket a desarrollador
app.post("/tickets/assign", (req, res) => {
    const { id_ticket, id_user } = req.body;
    if (!id_ticket || !id_user) return res.status(400).json({ error: "Faltan datos" });
    
    db.query('INSERT INTO tickets_devs (id_ticket, id_user, assigned_at) VALUES (?, ?, NOW())', [id_ticket, id_user], (err) => {
        if (err) return res.status(500).json({ error: "Error en asignación" });
        db.query('UPDATE tickets SET status = "in_progress" WHERE id = ?', [id_ticket]);
        res.status(201).json({ message: "Desarrollador asignado correctamente" });
    });
});

// ==========================================
// 6. MÓDULO KPI
// ==========================================

// Tickets por estado
app.get("/kpi/tickets/status", (req, res) => {
    db.query('SELECT status, COUNT(*) as total FROM tickets GROUP BY status', (err, result) => {
        if (err) return res.status(500).json({ error: "Error" });
        res.json(result);
    });
});

// Tickets por usuario
app.get("/kpi/tickets/user", (req, res) => {
    db.query('SELECT created_by, COUNT(*) as total FROM tickets GROUP BY created_by', (err, result) => {
        if (err) return res.status(500).json({ error: "Error" });
        res.json(result);
    });
});

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`Servidor corriendo en: http://localhost:${PORT}`);
    console.log(`Endpoints disponibles:`);
    console.log(`  POST   /auth/login`);
    console.log(`  GET    /auth/profile?userId=1`);
    console.log(`  CRUD   /users, /careers, /types, /tickets`);
    console.log(`  KPI    /kpi/tickets/status, /kpi/tickets/user`);
});