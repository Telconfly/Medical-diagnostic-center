const mysql = require("mysql");
const { DB_CONFIG } = require("./config");

const db = mysql.createConnection(DB_CONFIG);

db.connect(err => {
    if (err) {
        console.error("DB Error:", err);
        return;
    }
    console.log("MySQL connected");
});

module.exports = db;