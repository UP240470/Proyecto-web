const mysql = require("mysql2")

const connection = mysql.createConnection({
    host : "localhost" ,
    user: "root",
    password: "",
    database: "store"
});

connection.connect((err)=>{
    if(err){
        console.error("error de conecion" , err);
        return;
    }
    console.log("connected to mySQL")
});

module.exports = connection;
