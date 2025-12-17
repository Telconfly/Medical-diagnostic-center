const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { JWT_SECRET } = require("../config");
const { verifyToken } = require("../middleware"); 

const router = express.Router();

router.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        
        db.query(
            "INSERT INTO login(name,email,password,role) VALUES(?,?,?,'User')",
            [name, email, hash],
            (err, result) => { 
                if (err) {
                    return res.json({ 
                        Success: false, 
                        Error: err.code === "ER_DUP_ENTRY" ? "Email вже використовується" : "Помилка збереження даних користувача" 
                    });
                }
                
                const newUserId = result.insertId; 
                
                db.query(
                    "INSERT INTO profiles(id_user) VALUES(?)",
                    [newUserId],
                    (profileErr) => {
                        if (profileErr) {
                            console.error(`Помилка створення профілю для користувача ID ${newUserId}:`, profileErr);
                        }
                        
                        const token = jwt.sign({ id: newUserId, email, role: 'User' }, JWT_SECRET, { expiresIn: "1h" });
                        res.json({ Success: true, token, Message: "Користувач та його профіль успішно створені." });
                    }
                );
            }
        );
    } catch (e) {
        res.status(500).json({ Error: "Помилка хешування пароля" });
    }
});

router.post("/login", (req, res) => {
    const { email, password } = req.body;
    
    console.log(`[LOGIN] Спроба входу для email: ${email}`); 
    
    db.query("SELECT id_user AS id, email, password, role FROM login WHERE email=?", [email], async (err, r) => {
        if (err) {
            console.error("[LOGIN ERROR] Помилка БД:", err); 
            return res.status(500).json({ Success: false, Error: "Помилка сервера при запиті до БД" });
        }
        
        if (!r.length) {
            console.log("[LOGIN FAIL] Користувача не знайдено."); 
            return res.json({ Success: false, Error: "Невірні дані" });
        }
        
        if (!await bcrypt.compare(password, r[0].password)) {
            console.log("[LOGIN FAIL] Невірний пароль."); 
            return res.json({ Success: false, Error: "Невірні дані" });
        }
            
        console.log(`[LOGIN SUCCESS] Користувач ${email} успішно увійшов. Роль: ${r[0].role}`); 
        
        const token = jwt.sign(
            { id: r[0].id, email: r[0].email, role: r[0].role }, 
            JWT_SECRET, 
            { expiresIn: "1h" }
        );
        
        res.json({ Success: true, token });
    });
});

router.post("/update-password", verifyToken, async (req, res) => {
    const userId = req.userId; 
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ Success: false, Error: "Будь ласка, введіть поточний та новий паролі." });
    }

    try {
        db.query("SELECT password FROM login WHERE id_user=?", [userId], async (err, r) => {
            if (err) {
                console.error("[PASSWORD UPDATE ERROR] Помилка БД при отриманні пароля:", err);
                return res.status(500).json({ Success: false, Error: "Помилка сервера при оновленні пароля." });
            }

            if (!r.length) {
                return res.status(404).json({ Success: false, Error: "Користувача не знайдено." });
            }
            
            const currentHashedPassword = r[0].password;

            const isMatch = await bcrypt.compare(oldPassword, currentHashedPassword);

            if (!isMatch) {
                return res.json({ Success: false, Error: "Невірний поточний пароль." });
            }
            
            const newHash = await bcrypt.hash(newPassword, 10);
            
            db.query("UPDATE login SET password=? WHERE id_user=?", [newHash, userId], (updateErr) => {
                if (updateErr) {
                    console.error("[PASSWORD UPDATE ERROR] Помилка БД при оновленні:", updateErr);
                    return res.status(500).json({ Success: false, Error: "Помилка збереження нового пароля." });
                }

                res.json({ Success: true, Message: "Пароль успішно оновлено! Для безпеки, рекомендується переавторизуватися." });
            });
        });
    } catch (e) {
        console.error("[PASSWORD UPDATE ERROR] Загальна помилка:", e);
        res.status(500).json({ Success: false, Error: "Помилка обробки запиту на сервері." });
    }
});

module.exports = router;