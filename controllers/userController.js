const db = require("../config/db");

// Lógica de Login
exports.login = (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Faltan datos" });

    db.query('SELECT * FROM users WHERE username = ?', [username], (err, result) => {
        if (err) return res.status(500).json({ error: "Error en servidor" });
        if (result.length === 0) return res.status(404).json({ error: "Usuario no existe" });

        const user = result[0];
        if (user.failed_attempts >= 5) return res.status(401).json({ error: "Cuenta bloqueada" });

        if (user.password === password) {
            db.query('UPDATE users SET failed_attempts = 0 WHERE username = ?', [username]);
            res.json({ message: "Login OK", user: { id: user.id, username: user.username } });
        } else {
            db.query('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE username = ?', [username]);
            res.status(401).json({ error: "Password mal" });
        }
    });
};

// Lógica para obtener todos
exports.getUsers = (req, res) => {
    db.query('SELECT id, name, email FROM users WHERE active = 1', (err, result) => {
        if (err) return res.status(500).json({ error: "Error" });
        res.json(result);
    });
};