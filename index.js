// --- MÓDULOS (CommonJS) ---

// Importación de dependencias externas y archivos locales

const express = require("express");

const db = require("./config/db"); // Importación del Driver/Conexión a la DB

// --- CREACIÓN DE SERVIDOR ---

// Instanciación de la aplicación Express y definición del puerto

const app = express();

const PORT = 3000;

// --- MIDDLEWARE ---

// Middleware incorporado para el parseo del cuerpo de la petición (Payload) a JSON

app.use(express.json());



// Middleware de Logs 
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] Metodo: ${req.method} | URL: ${req.url}`);
  next();
});




// ---------------------------------------------------------------------------
//                              1  MODULO AUTENTICACION   
//---------------------------------------------------------------------------

app.post("/auth/login", (req, res) => {
  const username = req.body.username;

  const password = req.body.password;

  const sqlSearch = "SELECT * FROM users WHERE username = ?";

  db.query(sqlSearch, [username], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "error en el server" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "el usuario no existe" });
    }

    const user = result[0];

    if (user.failed_attempts >= 5) {
      return res
        .status(401)
        .json({ error: "cuenta bloqueada por intentos fallidos" });
    }

    if (user.password === password) {
      const sqlReset =
        "UPDATE users SET failed_attempts = 0 WHERE username = ?";

      db.query(sqlReset, [username], (err) => {
        if (err) console.error("error al resetear los intentos fallidos", err);
      });

      return res.status(200).json({
        message: "login exitoso",

        user: { id: user.id, username: user.username, rol: user.rol },
      });
    } else {
      const sqlUpdate =
        "UPDATE users SET failed_attempts = failed_attempts + 1 WHERE username = ?";

      db.query(sqlUpdate, [username], (err) => {
        if (err)
          console.error("error al actualizar los intentos fallidos", err);
      });

      return res.status(401).json({ error: "contraseña incorrecta" });
    }
  }); // <-- Aquí cierra el callback de db.query
}); // <-- Aquí cierra el app.post


app.get("/auth/profile" , (req, res) => {
    
  const userId = req.query.userId; 

  if(!userId) {
    return res.status(400).json({ error: "userId es requerido" });
  }

  const sql = "SELECT id,name,last_name,email,rol FROM users WHERE id = ?";

  db.query(sql, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "error en el server" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "usuario no encontrado" });
    }

    return res.status(200).json(result[0]);
  });
});


// ---------------------------------------------------------------------------
//                              2  MODULO USUARIOS   
//---------------------------------------------------------------------------

app.post("/users", (req, res) => {
  // 1. Extraemos los campos para contar cuántos vienen
  const data = req.body;
  const fields = Object.keys(data); // Esto nos da un arreglo con los nombres de los campos

  // VALIDACIÓN: Mínimo 6 campos
  if (fields.length < 6) {
    return res.status(400).json({ error: "Faltan datos. Se requieren al menos 6 campos." });
  }

  const { name, last_name, username, email, career_id, active, password, rol } = data;

  // VALIDACIÓN: Email y Username únicos
  // Hacemos un SELECT antes para ver si ya existen
  const sqlCheck = "SELECT * FROM users WHERE email = ? OR username = ?";
  
  db.query(sqlCheck, [email, username], (err, result) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });

    if (result.length > 0) {
      // Si el resultado tiene algo, es que ya existe el correo o el usuario
      return res.status(400).json({ error: "El email o el username ya están registrados" });
    }

    // 2. Si pasó las validaciones, ahora sí hacemos el INSERT
    const sqlInsert =
      "INSERT INTO users (name, last_name, username, email, career_id, active, password, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    db.query(
      sqlInsert,
      [name, last_name, username, email, career_id, active, password, rol],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: "error al insertar en la base de datos" });
        }

        return res.status(200).json({
          message: "usuario creado exitosamente",
          user: {
            id: result.insertId,
            username: username,
            rol: rol,
          },
        });
      }
    );
  });
});

app.get("/users", (req, res) => {
  const limit = parseInt(req.query.limit) || 10; // Si no envían limit, por defecto 10
  const offset = parseInt(req.query.offset) || 0; // Si no envían offset, por defecto 0
  const orderBy = req.query.orderBy || "name"; // Si no envían orderBy, por defecto "name"
  const orderDirection = req.query.orderDirection === "desc" ? "DESC" : "ASC"; // Si envían orderDirection como "desc", lo ponemos en mayúscula, si no, por defecto "ASC"

  const sqlSearch =
    "SELECT id,name,last_name,email,rol,active FROM users WHERE active = 1 ORDER BY ? ? LIMIT ? OFFSET ?";

  db.query(sqlSearch, [orderBy, orderDirection, limit, offset], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "error en el server" });
    }

    return res.status(200).json(result);
  });
});

app.get("/users/filter", (req, res) => {
  // 1. Extraemos los datos que vengan en la URL

  const { name, email, career, rol } = req.query;

  // 2. Creamos la base de la consulta

  // Usamos "WHERE 1=1" para poder pegar los "AND" que queramos después

  let sqlSearch =
    "SELECT id, name, last_name, email, rol, active FROM users WHERE 1=1";

  const parameters = [];

  // 3. Si el dato existe en la URL, lo agregamos a la consulta

  if (name) {
    sqlSearch += " AND name = ?";

    parameters.push(name);
  }

  if (email) {
    sqlSearch += " AND email = ?";

    parameters.push(email);
  }

  if (rol) {
    sqlSearch += " AND rol = ?";

    parameters.push(rol);
  }

  if (career) {
    sqlSearch += " AND career_id = ?";

    parameters.push(career);
  }

  // 4. Ejecutamos con lo que se haya acumulado

  db.query(sqlSearch, parameters, (err, result) => {
    if (err) {
      console.error(err);

      return res.status(500).json({ error: "error en el server" });
    }

    res.json(result);
  });
});

app.get("/users/:id", (req, res) => {
  const sqlSearch =
    "SELECT id,name,last_name,email,rol,active FROM users WHERE id = ? AND active = 1";

  db.query(sqlSearch, [req.params.id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "error en el server" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "usuario no encontrado" });
    }

    return res.status(200).json(result[0]);
  });
});

app.patch("/users/:id/status", (req, res) => {
  const active = req.body.active;

  const sqlUpdate = "UPDATE users SET active = ? WHERE id = ?";

  db.query(sqlUpdate, [active, req.params.id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "error en el server" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "usuario no encontrado" });
    }

    return res.status(200).json({ message: "estado actualizado exitosamente" });
  });
});

app.put("/users/:id", (req, res) => {
  const userId = req.params.id;

  const campos = Object.keys(req.body); // Obtenemos los nombres de los campos enviados

  // maximo 5 campos

  if (campos.length > 5) {
    return res.status(400).json({
      error: "Demasiados campos. El límite es 5 por solicitud.",
    });
  }

  //Solo actualiza lo que enviaron

  let sqlUpdate = "UPDATE users SET ";

  const values = [];

  // Construimos el SET dinámicamente

  campos.forEach((campo, index) => {
    sqlUpdate += `${campo} = ?`;

    values.push(req.body[campo]);

    // Ponemos una coma si no es el último campo

    if (index < campos.length - 1) {
      sqlUpdate += ", ";
    }
  });

  sqlUpdate += " WHERE id = ?";

  values.push(userId);

  // Si no mandaron ningún campo en el body

  if (campos.length === 0) {
    return res
      .status(400)
      .json({ error: "No se enviaron campos para actualizar" });
  }

  db.query(sqlUpdate, values, (err, result) => {
    if (err) {
      console.error(err);

      return res.status(500).json({ error: "Error al actualizar" });
    }

    res.json({ message: "Usuario actualizado con éxito" });
  });
});

app.delete("/users/:id", (req, res) => {
  const userId = req.params.id;

  // ELIMINACIÓN LÓGICA: Solo desactivamos

  const sqlLogicalDelete = "UPDATE users SET active = 0 WHERE id = ?";

  db.query(sqlLogicalDelete, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "error en el server" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "usuario no encontrado" });
    }

    res.json({ message: "Usuario eliminado lógicamente (desactivado)" });
  });
});


// ---------------------------------------------------------------------------
//                              3  MODULO CARRERAS   
//---------------------------------------------------------------------------

app.post("/careers", (req, res) => {
  // 1. Extraemos los campos para contar cuántos vienen
  const {name , active} = req.body;

  // VALIDACIÓN: Mínimo 2 campos
  if (!name || active === undefined) {
    return res.status(400).json({ error: "Faltan datos. Se requieren al menos 2 campos." });
  }

    const sqlInsert =
      "INSERT INTO careers (name, active) VALUES (?, ?)";

    db.query(
      sqlInsert,
      [name, active],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: "error al insertar en la base de datos" });
        }

        return res.status(200).json({
          message: "carrera creada exitosamente",
          career: {
            id: result.insertId,
            name: name,
            active: active 
          },
        });
      }
    );
  });

app.get("/careers/filter", (req, res) => {
  // 1. Extraemos los datos que vengan en la URL

  const { name } = req.query;

  // 2. Creamos la base de la consulta

  // Usamos "WHERE 1=1" para poder pegar los "AND" que queramos después

  let sqlSearch =
    "SELECT id, name FROM careers WHERE active = 1 AND 1=1";

  const parameters = [];

  // 3. Si el dato existe en la URL, lo agregamos a la consulta

  if (name) {
    sqlSearch += " AND name = ?";

    parameters.push(name);
  }
  // 4. Ejecutamos con lo que se haya acumulado

  db.query(sqlSearch, parameters, (err, result) => {
    if (err) {
      console.error(err);

      return res.status(500).json({ error: "error en el server" });
    }

    res.json(result);
  });
});


app.get("/careers", (req, res) => {
  const limit = parseInt(req.query.limit) || 10; // Si no envían limit, por defecto 10
  const offset = parseInt(req.query.offset) || 0; // Si no envían offset, por defecto 0
  const orderBy = req.query.orderBy || "name"; // Si no envían orderBy, por defecto "name"
  const orderDirection = req.query.orderDirection === "desc" ? "DESC" : "ASC"; // Si envían orderDirection como "desc", lo ponemos en mayúscula, si no, por defecto "ASC"

  const sqlSearch =
    "SELECT id,name FROM careers WHERE active = 1 ORDER BY ? ? LIMIT ? OFFSET ?";

  db.query(sqlSearch, [orderBy, orderDirection, limit, offset], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "error en el server" });
    }

    return res.status(200).json(result);
  });
});



app.get("/careers/:id", (req, res) => {
  const sqlSearch =
    "SELECT id,name FROM careers WHERE id = ? AND active = 1";

  db.query(sqlSearch, [req.params.id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "error en el server" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "carrera no encontrada" });
    }

    return res.status(200).json(result[0]);
  });
});

app.patch("/careers/:id/status", (req, res) => {
  const active = req.body.active;

  const sqlUpdate = "UPDATE careers SET active = ? WHERE id = ?";

  db.query(sqlUpdate, [active, req.params.id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "error en el server" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "carrera no encontrada" });
    }

    return res.status(200).json({ message: "estado actualizado exitosamente" });
  });
});

app.put("/careers/:id", (req, res) => {
  const careerId = req.params.id;

  const campos = Object.keys(req.body); // Obtenemos los nombres de los campos enviados

  

  if (campos.length < 2) {
    return res.status(400).json({
      error: "No se enviaron suficientes campos. Se requieren al menos 2.",
    });
  }

  //Solo actualiza lo que enviaron

  let sqlUpdate = "UPDATE careers SET ";

  const values = [];

  // Construimos el SET dinámicamente

  campos.forEach((campo, index) => {
    sqlUpdate += `${campo} = ?`;

    values.push(req.body[campo]);

    // Ponemos una coma si no es el último campo

    if (index < campos.length - 1) {
      sqlUpdate += ", ";
    }
  });

  sqlUpdate += " WHERE id = ?";

  values.push(careerId);

  // Si no mandaron ningún campo en el body

  if (campos.length === 0) {
    return res
      .status(400)
      .json({ error: "No se enviaron campos para actualizar" });
  }

  db.query(sqlUpdate, values, (err, result) => {
    if (err) {
      console.error(err);

      return res.status(500).json({ error: "Error al actualizar" });
    }

    res.json({ message: "Carrera actualizada con éxito" });
  });
}); 

app.delete("/careers/:id", (req, res) => {
  const careerId = req.params.id;

  // ELIMINACIÓN LÓGICA: Solo desactivamos

  const sqlLogicalDelete = "UPDATE careers SET active = 0 WHERE id = ?";

  db.query(sqlLogicalDelete, [careerId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "error en el server" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "carrera no encontrada" });
    }

    res.json({ message: "Carrera eliminada lógicamente (desactivada)" });
  });
});



// ---------------------------------------------------------------------------
//                              4  MODULO Tipos y Categorías   
//---------------------------------------------------------------------------



app.post("/types", (req, res) => {
  const { type, description, area } = req.body;

  // VALIDACIÓN: Verificar que los campos necesarios existan
  if (!type || !description || !area) {
    return res.status(400).json({ error: "Faltan datos. Se requieren type, description y area." });
  }

  const sqlInsert = "INSERT INTO types (type, description, area) VALUES (?, ?, ?)";

  db.query(sqlInsert, [type, description, area], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "error en el server al crear el tipo" });
    }

    return res.status(201).json({
      message: "tipo de ticket creado exitosamente",
      type: {
        id: result.insertId,
        type: type,
        description: description,
        area: area
      },
    });
  });
});



app.get("/types", (req, res) => {
  const limit = parseInt(req.query.limit) || 10; // Si no envían limit, por defecto 10
  const offset = parseInt(req.query.offset) || 0; // Si no envían offset, por defecto 0
  const orderBy = req.query.orderBy || "name"; // Si no envían orderBy, por defecto "name"
  const orderDirection = req.query.orderDirection === "desc" ? "DESC" : "ASC"; // Si envían orderDirection como "desc", lo ponemos en mayúscula, si no, por defecto "ASC"

  const sqlSearch =
    "SELECT id,type,description,area FROM types  ORDER BY ? ? LIMIT ? OFFSET ?";

  db.query(sqlSearch, [orderBy, orderDirection, limit, offset], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "error en el server" });
    }

    return res.status(200).json(result);
  });
});



app.put("/types/:id", (req, res) => {
  const typeId = req.params.id;

  const campos = Object.keys(req.body); // Obtenemos los nombres de los campos enviados

  

  if (campos.length < 2) {
    return res.status(400).json({
      error: "No se enviaron suficientes campos. 3.",
    });
  }

  //Solo actualiza lo que enviaron

  let sqlUpdate = "UPDATE types SET ";

  const values = [];

  // Construimos el SET dinámicamente

  campos.forEach((campo, index) => {
    sqlUpdate += `${campo} = ?`;

    values.push(req.body[campo]);

    // Ponemos una coma si no es el último campo

    if (index < campos.length - 1) {
      sqlUpdate += ", ";
    }
  });

  sqlUpdate += " WHERE id = ?";

  values.push(typeId);

  // Si no mandaron ningún campo en el body

  if (campos.length === 0) {
    return res
      .status(400)
      .json({ error: "No se enviaron campos para actualizar" });
  }

  db.query(sqlUpdate, values, (err, result) => {
    if (err) {
      console.error(err);

      return res.status(500).json({ error: "Error al actualizar" });
    }

    res.json({ message: "Carrera actualizada con éxito" });
  });
}); 

app.delete("/types/:id", (req, res) => {
  const typeId = req.params.id;

  // ELIMINACIÓN fisica

  const sqlLogicalDelete = "DELETE FROM types WHERE id = ?";

  db.query(sqlLogicalDelete, [typeId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "error en el server" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "tipo no encontrado" });
    }

    res.json({ message: "Tipo eliminado fisicamente" });
  });
});


app.get("/categories", (req, res) => {
  // Según la página 4 del PDF, la tabla tiene: id, name, description [cite: 60, 61, 62]
  const sql = "SELECT id, name, description FROM categorias";

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error al consultar categorías:", err);
      // Uso de código HTTP 500 para errores de servidor [cite: 210]
      return res.status(500).json({ error: "error interno del servidor" });
    }

    // Si la tabla está vacía, enviamos un arreglo vacío con 200 OK [cite: 203]
    return res.status(200).json(result);
  });
});

// ---------------------------------------------------------------------------
//                              5 Módulo de Tickets 
//---------------------------------------------------------------------------

app.post("/tickets", (req, res) => {
  const { title, description, type_id, priority, created_by } = req.body;

  // 1. Definir los valores permitidos según la página 3 del PDF
  const validPriorities = ['low', 'medium', 'high']; // 
  const validStatuses = ['open', 'in_progress', 'closed']; // 

  // 2. Verificar que la prioridad enviada sea válida
  // Si no la envían, asignamos 'medium' por defecto
  const finalPriority = priority || 'medium'; 

  if (!validPriorities.includes(finalPriority)) {
    return res.status(400).json({ 
      error: "Prioridad no válida. Usa: low, medium o high." 
    });
  }

  // 3. El estado siempre será 'open' al crear uno nuevo
  const status = 'open';

  // 4. Continuar con el query...
  const sqlInsert = "INSERT INTO tickets (title, description, type_id, status, priority, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)";

  db.query(sqlInsert, [title, description, type_id, status, finalPriority, created_by, new Date()], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: "Error al crear el ticket" });
      }
      res.status(201).json({ message: "Ticket creado exitosamente", ticketId: result.insertId });
  });
});


app.get("/tickets", (req, res) => {
  // 1. Extraemos los filtros de la URL (req.query)
  const { status, priority, type_id, created_by } = req.query;

  // 2. Base de la consulta
  let sqlSearch = "SELECT * FROM tickets WHERE 1=1";
  const parameters = [];

  // 3. Agregamos los filtros dinámicamente si existen
  if (status) {
    sqlSearch += " AND status = ?";
    parameters.push(status);
  }

  if (priority) {
    sqlSearch += " AND priority = ?";
    parameters.push(priority);
  }

  if (type_id) {
    sqlSearch += " AND type_id = ?";
    parameters.push(type_id);
  }

  if (created_by) {
    sqlSearch += " AND created_by = ?";
    parameters.push(created_by);
  }

  // 4. Ejecutamos la consulta en la base de datos
  db.query(sqlSearch, parameters, (err, result) => {
    if (err) {
      console.error("Error al obtener tickets:", err);
      return res.status(500).json({ error: "error en el server" });
    }

    // 5. Enviamos los resultados (o un arreglo vacío si no hay nada)
    return res.status(200).json(result);
  });
});


app.get("/tickets/filter", (req, res) => {
  const { status, priority, type_id, created_by } = req.query;
  let sql = "SELECT * FROM tickets WHERE 1=1";
  const params = [];

  if (status) { sql += " AND status = ?"; params.push(status); }
  if (priority) { sql += " AND priority = ?"; params.push(priority); }
  if (type_id) { sql += " AND type_id = ?"; params.push(type_id); }
  if (created_by) { sql += " AND created_by = ?"; params.push(created_by); }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: "error en el server" });
    res.json(result);
  });
});


app.get("/tickets/:id", (req, res) => {
  const sql = "SELECT * FROM tickets WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "error en el server" });
    if (result.length === 0) return res.status(404).json({ error: "ticket no encontrado" });
    res.json(result[0]);
  });


app.put("/tickets/:id", (req, res) => {
  const { title, description, priority } = req.body;
  const sql = "UPDATE tickets SET title = ?, description = ?, priority = ? WHERE id = ?";
  
  db.query(sql, [title, description, priority, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "error al actualizar" });
    res.json({ message: "Ticket actualizado con éxito" });
  });
});


});



app.patch("/tickets/:id/status", (req, res) => {
  const { status } = req.body;
  const sql = "UPDATE tickets SET status = ? WHERE id = ?";
  
  db.query(sql, [status, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "error al cambiar estado" });
    res.json({ message: "Estado actualizado" });
  });
});

app.delete("/tickets/:id", (req, res) => {
  const sql = "DELETE FROM tickets WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "error al eliminar" });
    res.json({ message: "Ticket eliminado" });
  });
});

// Asignar ticket a desarrollador (POST)
// Mandas ticket_id y user_id en el body
app.post("/tickets/assign", (req, res) => {
  const { ticket_id, user_id } = req.body;
  // Usamos NOW() de MySQL para la fecha, es más fácil que pasarle el objeto de JS
  const sql = "INSERT INTO tickets_devs (id_ticket, id_user, assigned_at) VALUES (?, ?, ?)";
  
  db.query(sql, [ticket_id, user_id, new Date()], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "error en la asignación" });
    }
    
    // Si quieres que el ticket pase a 'in_progress', se hace en la tabla TICKETS
    db.query("UPDATE tickets SET status = 'in_progress' WHERE id = ?", [ticket_id]);

    res.status(201).json({ message: "Ticket asignado al desarrollador " + user_id });
  });
});

app.get("/tickets/user/:id", (req, res) => {
  const userId = req.params.id;

  // Consultamos todos los tickets donde el creador coincida con el ID
  const sql = "SELECT * FROM tickets WHERE created_by = ?";

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("Error al obtener tickets del usuario:", err);
      return res.status(500).json({ error: "error interno del servidor" });
    }

    // Si no tiene tickets, devolvemos un arreglo vacío con un 200 (es correcto)
    return res.status(200).json(result);
  });
});

// ---------------------------------------------------------------------------
//                              6  MODULO KPI basico  
//---------------------------------------------------------------------------


app.get("/kpi/tickets/status" , (req,res) => {
    const sql = "SELECT status, COUNT(*) as count FROM tickets GROUP BY status";

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error al obtener KPI:", err);
            return res.status(500).json({ error: "error en el server" });
        }

        // Transformamos el resultado a un formato más amigable
        const kpi = {};
        result.forEach(row => {
            kpi[row.status] = row.count;
        });

        res.json(kpi);
    });
});


app.get("/kpi/tickets/users" , (req,res) => {
    const sql = "SELECT created_by, COUNT(*) as count FROM tickets GROUP BY created_by";

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error al obtener KPI:", err);
            return res.status(500).json({ error: "error en el server" });
        }

        // Transformamos el resultado a un formato más amigable
        const kpi = {};
        result.forEach(row => {
            kpi[row.created_by] = row.count;
        });

        res.json(kpi);
    });
});



// --- INICIAR SERVIDOR ---

// Método listen: Pone al Event Loop a escuchar peticiones en el puerto definido

app.listen(PORT, () => {
  console.log(`Server is running in http://localhost:${PORT}`);
});
