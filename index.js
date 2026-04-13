// --- MÓDULOS (CommonJS) ---

// Importación de dependencias externas y archivos locales
//Importaciones
const express = require("express")
const db = require ("./config/db");
const userRoutes = require("./routes/userRoutes")
const authRoutes = require("./routes/authRoutes")
const careerRoutes = require ("./routes/careerRoutes")
const typeRoutes = require ("./routes/typeRoutes")
const catalogRoutes = require("./routes/catalogRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const kpiRoutes = require("./routes/kpiRoutes");
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

// ... otras importaciones
app.use("/auth", authRoutes); // Esto hace que las rutas sean /auth/login y /auth/profile

// ---------------------------------------------------------------------------
//                              2  MODULO USUARIOS   
//---------------------------------------------------------------------------

app.use("/users", userRoutes);

// ---------------------------------------------------------------------------
//                              3  MODULO CARRERAS   
//---------------------------------------------------------------------------

app.use("/careers", careerRoutes);


// ---------------------------------------------------------------------------
//                              4  MODULO Tipos y Categorías   
//---------------------------------------------------------------------------
app.use("/types", typeRoutes);
app.use("/catalog", catalogRoutes);

// ---------------------------------------------------------------------------
//                              5 Módulo de Tickets 
//---------------------------------------------------------------------------
app.use("/tickets", ticketRoutes);
// ---------------------------------------------------------------------------
//                              6  MODULO KPI basico  
//---------------------------------------------------------------------------
//importaciones

app.use("/kpi", kpiRoutes);


//prueba solo ver si el servidor esta vivo
app.get("/",(req,res) =>{
  res.send("Servidor funcionando");
});

//Inicio del server
app.listen(PORT,()=>{
  console.log('Servidor corriendo en Servidor corriendo en http://localhost:', + PORT);
});
