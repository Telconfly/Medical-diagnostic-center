

const express = require("express");
const db = require("../db");
const { verifyToken, requireAdmin } = require("../middleware");

const router = express.Router();


router.get("/users", verifyToken, requireAdmin, async (req, res) => {
    try {
        const users = await new Promise((resolve, reject) => {
           
            const query = "SELECT id_user AS id_login, name, email, role, NULL AS createdAt FROM login";
            db.query(query, (err, r) => err ? reject(err) : resolve(r));
        });

        res.json({
            Success: true,
            users: users
        });
    } catch (error) {
        console.error("Помилка отримання списку користувачів:", error);
        res.status(500).json({ Error: "Помилка сервера при отриманні користувачів." });
    }
});


router.delete("/users/:id", verifyToken, requireAdmin, async (req, res) => {
    const userId = req.params.id;

    if (req.userId === parseInt(userId)) {
        return res.status(403).json({ Error: "Ви не можете видалити самого себе." });
    }
    
    const user = await new Promise((resolve, reject) => {
        db.query("SELECT role FROM login WHERE id_user=?", [userId], (err, r) => err ? reject(err) : resolve(r));
    });

    if (user.length === 0 || user[0].role === 'Admin') {
        return res.status(403).json({ Error: "Користувач не знайдений або є Адміністратором." });
    }

    try {
        
        await new Promise((resolve, reject) => {
            db.query("DELETE FROM appointments WHERE id_user=?", [userId], (err, r) => err ? reject(err) : resolve(r));
        });
        await new Promise((resolve, reject) => {
            db.query("DELETE FROM service_appointments WHERE id_user=?", [userId], (err, r) => err ? reject(err) : resolve(r));
        });
        
        
        
        const result = await new Promise((resolve, reject) => {
            db.query("DELETE FROM login WHERE id_user=?", [userId], (err, r) => err ? reject(err) : resolve(r));
        });

        if (result.affectedRows > 0) {
            res.json({ Success: true, Message: `Користувач ID ${userId} та пов'язані дані успішно видалені.` });
        } else {
            res.status(404).json({ Error: "Користувач не знайдений." });
        }

    } catch (error) {
        console.error("Помилка видалення користувача:", error);
        res.status(500).json({ Error: "Помилка сервера при видаленні користувача.", Details: error.message });
    }
});



router.put("/users/:id/role", verifyToken, requireAdmin, async (req, res) => {
    const userId = req.params.id;
    const { newRole } = req.body; 
    
    if (newRole !== 'Doctor') {
        return res.status(400).json({ Error: "Невірний запит. Очікується зміна ролі на 'Doctor'." });
    }

    try {
        
        const user = await new Promise((resolve, reject) => {
            db.query("SELECT name FROM login WHERE id_user=?", [userId], (err, r) => err ? reject(err) : resolve(r));
        });

        if (user.length === 0) {
            return res.status(404).json({ Error: "Користувач не знайдений." });
        }
        const fullName = user[0].name;

        
        await new Promise((resolve, reject) => {
            db.query("UPDATE login SET role='Doctor' WHERE id_user=?", [userId], (err, r) => err ? reject(err) : resolve(r));
        });
        
       

        const message = `Користувач ${fullName} успішно переведений у роль 'Doctor'. (Запис лікаря в окремій таблиці проігноровано, оновлена лише роль).`;
        
        res.json({ 
            Success: true, 
            Message: message
        });

    } catch (error) {
        console.error("Помилка при призначенні ролі 'Лікар' (Критична):", error.message);
        res.status(500).json({ Error: "Критична помилка сервера при оновленні ролі.", Details: error.message });
    }
});



router.delete("/users/:id/role", verifyToken, requireAdmin, async (req, res) => {
    const userId = req.params.id;

    try {

        const loginUpdate = await new Promise((resolve, reject) => {
            db.query("UPDATE login SET role='User' WHERE id_user=? AND role='Doctor'", [userId], (err, r) => err ? reject(err) : resolve(r));
        });

        if (loginUpdate.affectedRows === 0) {
            return res.status(404).json({ Error: "Користувач не знайдений або не має ролі 'Doctor'." });
        }
        


        const message = `Роль 'Doctor' успішно забрана у користувача ID ${userId}.`;
        
        res.json({ Success: true, Message: message });

    } catch (error) {
        console.error("Помилка при забиранні ролі 'Лікар':", error.message);
        res.status(500).json({ Error: "Помилка сервера при забиранні ролі.", Details: error.message });
    }
});


module.exports = router;