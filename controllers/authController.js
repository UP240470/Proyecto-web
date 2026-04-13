const db = require("../config/db");

// Lógica de Login
exports.login = (req, res) => {
  const { username, password } = req.body;
  const sqlSearch = "SELECT * FROM users WHERE username = ?";

  db.query(sqlSearch, [username], (err, result) => {
    if (err) return res.status(500).json({ error: "error en el server" });
    if (result.length === 0) return res.status(404).json({ error: "el usuario no existe" });

    const user = result[0];

    if (user.failed_attempts >= 5) {
      return res.status(401).json({ error: "cuenta bloqueada por intentos fallidos" });
    }

    if (user.password === password) {
      const sqlReset = "UPDATE users SET failed_attempts = 0 WHERE username = ?";
      db.query(sqlReset, [username], (err) => {
        if (err) console.error("error al resetear los intentos fallidos", err);
      });

      return res.status(200).json({
        message: "login exitoso",
        user: { id: user.id, username: user.username, rol: user.rol },
      });
    } else {
      const sqlUpdate = "UPDATE users SET failed_attempts = failed_attempts + 1 WHERE username = ?";
      db.query(sqlUpdate, [username], (err) => {
        if (err) console.error("error al actualizar los intentos fallidos", err);
      });
      return res.status(401).json({ error: "contraseña incorrecta" });
    }
  });
};

// Lógica de Perfil
exports.getProfile = (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId es requerido" });

  const sql = "SELECT id,name,last_name,email,rol FROM users WHERE id = ?";
  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ error: "error en el server" });
    if (result.length === 0) return res.status(404).json({ error: "usuario no encontrado" });
    return res.status(200).json(result[0]);
  });
};
