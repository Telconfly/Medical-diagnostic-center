const express = require("express");
const fs = require('fs');
const path = require('path');
const db = require("../db");
const { verifyToken, requireAdmin, upload, handleMulterError } = require("../middleware");
const { SERVICE_DURATION } = require("../config"); 
const userManagementRouter = require("./userManagement"); 

const router = express.Router();

router.use(userManagementRouter);

router.get("/doctors", verifyToken, requireAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                d.id_doctor AS idDoctor, 
                d.user_id AS userId,
                d.full_name AS fullName, 
                d.specialization, 
                d.consultation_price AS price,
                d.experience_years AS experience,
                d.description,
                d.image AS imageUrl,
                l.email AS userEmail  
            FROM doctors d
            LEFT JOIN login l ON d.user_id = l.id_user; 
        `;

        db.query(query, (err, doctors) => {
            if (err) {
                console.error("Помилка завантаження лікарів для адміна:", err);
                return res.status(500).json({ Error: "Помилка бази даних." });
            }
            res.json({ Success: true, doctors });
        });
    } catch (error) {
        console.error("Помилка отримання лікарів для Адміна:", error);
        res.status(500).json({ Error: "Помилка сервера." });
    }
});

router.get("/stats", verifyToken, requireAdmin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const getTotalCount = (table, whereClause = '') => new Promise((resolve, reject) => {
            const query = `SELECT COUNT(*) AS count FROM ${table} ${whereClause}`;
            db.query(query, (err, r) => err ? reject(err) : resolve(r[0].count));
        });

        const totalUsers = await getTotalCount("login");
        const doctorAppointmentsToday = await getTotalCount("appointments", `WHERE appointment_date='${today}' AND status='Заплановано'`);
        const serviceAppointmentsToday = await getTotalCount("service_appointments", `WHERE appointment_date='${today}' AND status='Заплановано'`);
        const activeServices = await getTotalCount("services");

        res.json({
            Success: true,
            stats: {
                totalUsers,
                todayAppointments: doctorAppointmentsToday + serviceAppointmentsToday,
                activeServices,
            }
        });
    } catch (error) {
        console.error("Помилка отримання статистики для Адміна:", error);
        res.status(500).json({ Error: "Помилка сервера при отриманні статистики." });
    }
});

router.post("/doctors", verifyToken, requireAdmin, upload.single('imageUpload'), handleMulterError, (req, res) => {
    const { fullName, specialization, price, experience, description } = req.body;
    const image = req.file ? req.file.filename : null; 
    
    if (!fullName || !specialization || !price || !experience || !description || !image) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ Error: "Неповні дані або відсутнє зображення." });
    }

    const query = `
        INSERT INTO doctors 
        (full_name, specialization, consultation_price, image, experience_years, description) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.query(query, [fullName, specialization, price, image, experience, description], (err, result) => {
        if (err) {
            console.error("Помилка створення лікаря:", err);
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ Error: "Помилка бази даних при додаванні лікаря." });
        }
        res.json({ Success: true, Message: `Лікар ${fullName} успішно доданий.`, id: result.insertId });
    });
});

router.put("/doctors/:id", verifyToken, requireAdmin, upload.single('imageUpload'), handleMulterError, (req, res) => {
    const idDoctor = req.params.id;
    const { fullName, specialization, price, experience, description } = req.body;
    const newImage = req.file ? req.file.filename : null; 
    
    if (!fullName || !specialization || !price || !experience || !description) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ Error: "Неповні дані." });
    }

    if (newImage) {
        db.query("SELECT image FROM doctors WHERE id_doctor=?", [idDoctor], (err, results) => {
            if (err) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(500).json({ Error: "Помилка сервера при оновленні." });
            }
            const oldImage = results.length > 0 ? results[0].image : null;
            
            const query = `
                UPDATE doctors SET 
                full_name=?, specialization=?, consultation_price=?, experience_years=?, description=?, image=?
                WHERE id_doctor=?
            `;
            const params = [fullName, specialization, price, experience, description, newImage, idDoctor];
            
            db.query(query, params, (err, result) => {
                if (err) {
                    console.error("Помилка оновлення лікаря:", err);
                    if (req.file) fs.unlinkSync(req.file.path);
                    return res.status(500).json({ Error: "Помилка бази даних при оновленні лікаря." });
                }
                
                if (result.affectedRows > 0) {
                    if (oldImage) {
                        const oldPath = path.join(__dirname, '..', 'images', oldImage);
                        fs.unlink(oldPath, (err) => {
                            if (err && err.code !== 'ENOENT') console.error("Помилка видалення старого файлу:", err);
                        });
                    }
                    return res.json({ Success: true, Message: `Лікар ID ${idDoctor} успішно оновлений.`, image: newImage });
                } else {
                    if (req.file) fs.unlinkSync(req.file.path);
                    return res.status(404).json({ Error: "Лікар з таким ID не знайдений." });
                }
            });
        });
    } else {
        const query = `
            UPDATE doctors SET 
            full_name=?, specialization=?, consultation_price=?, experience_years=?, description=? 
            WHERE id_doctor=?
        `;
        const params = [fullName, specialization, price, experience, description, idDoctor];
        
        db.query(query, params, (err, result) => {
            if (err) {
                console.error("Помилка оновлення лікаря без зображення:", err);
                return res.status(500).json({ Error: "Помилка бази даних при оновленні лікаря." });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ Error: "Лікар з таким ID не знайдений." });
            }
            res.json({ Success: true, Message: `Лікар ID ${idDoctor} успішно оновлений.` });
        });
    }
});

router.delete("/doctors/:id", verifyToken, requireAdmin, (req, res) => {
    const idDoctor = req.params.id;

    db.query("SELECT image FROM doctors WHERE id_doctor=?", [idDoctor], (err, results) => {
        const imageToDelete = results && results.length > 0 ? results[0].image : null;
        
        db.query("DELETE FROM appointments WHERE id_doctor=?", [idDoctor], (err) => {
            if (err) return res.status(500).json({ Error: "Помилка при очищенні записів лікаря." });

            db.query("DELETE FROM doctors WHERE id_doctor=?", [idDoctor], (err, result) => {
                if (err) return res.status(500).json({ Error: "Помилка бази даних при видаленні лікаря." });
                
                if (result.affectedRows > 0) {
                    if (imageToDelete) {
                        const imagePath = path.join(__dirname, '..', 'images', imageToDelete);
                        fs.unlink(imagePath, (err) => {
                            if (err && err.code !== 'ENOENT') console.error("Помилка видалення файлу зображення:", err);
                        });
                    }
                    res.json({ Success: true, Message: `Лікар ID ${idDoctor} та пов'язані записи успішно видалені.` });
                } else {
                    res.status(404).json({ Error: "Лікар не знайдений." });
                }
            });
        });
    });
});



router.post("/services", verifyToken, requireAdmin, upload.single('imageUpload'), handleMulterError, (req, res) => {
    const { name, price, description, duration } = req.body;
    const image = req.file ? req.file.filename : null; 
    const durationMinutes = parseInt(duration) || SERVICE_DURATION;

    if (!name || !price || !description || !image) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ Error: "Неповні дані або відсутнє зображення." });
    }

    const query = `
        INSERT INTO services 
        (name, description, price, duration_minutes, image) 
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.query(query, [name, description, price, durationMinutes, image], (err, result) => {
        if (err) {
            console.error("Помилка створення послуги:", err);
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ Error: "Помилка бази даних при додаванні послуги." });
        }
        res.json({ Success: true, Message: `Послуга "${name}" успішно додана.`, id: result.insertId });
    });
});

router.put("/services/:id", verifyToken, requireAdmin, upload.single('imageUpload'), handleMulterError, (req, res) => {
    const idService = req.params.id;
    const { name, price, description, duration } = req.body;
    const newImage = req.file ? req.file.filename : null; 
    const durationMinutes = parseInt(duration) || SERVICE_DURATION;

    if (!name || !price || !description) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ Error: "Неповні дані." });
    }

    if (newImage) {
        db.query("SELECT image FROM services WHERE id_service=?", [idService], (err, results) => {
            if (err) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(500).json({ Error: "Помилка сервера при оновленні." });
            }
            const oldImage = results.length > 0 ? results[0].image : null;
            
            const query = `
                UPDATE services SET 
                name=?, description=?, price=?, duration_minutes=?, image=? 
                WHERE id_service=?
            `;
            const params = [name, description, price, durationMinutes, newImage, idService];
            
            db.query(query, params, (err, result) => {
                if (err) {
                    console.error("Помилка оновлення послуги:", err);
                    if (req.file) fs.unlinkSync(req.file.path);
                    return res.status(500).json({ Error: "Помилка бази даних при оновленні послуги." });
                }
                
                if (result.affectedRows > 0) {
                    if (oldImage) {
                        const oldPath = path.join(__dirname, '..', 'images', oldImage);
                        fs.unlink(oldPath, (err) => {
                            if (err && err.code !== 'ENOENT') console.error("Помилка видалення старого файлу:", err);
                        });
                    }
                    return res.json({ Success: true, Message: `Послуга ID ${idService} успішно оновлена.`, image: newImage });
                } else {
                    if (req.file) fs.unlinkSync(req.file.path);
                    return res.status(404).json({ Error: "Послуга з таким ID не знайдена." });
                }
            });
        });
    } else {
        const query = `
            UPDATE services SET 
            name=?, description=?, price=?, duration_minutes=? 
            WHERE id_service=?
        `;
        const params = [name, description, price, durationMinutes, idService];
        
        db.query(query, params, (err, result) => {
            if (err) {
                console.error("Помилка оновлення послуги без зображення:", err);
                return res.status(500).json({ Error: "Помилка бази даних при оновленні послуги." });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ Error: "Послуга з таким ID не знайдена." });
            }
            res.json({ Success: true, Message: `Послуга ID ${idService} успішно оновлена.` });
        });
    }
});

router.delete("/services/:id", verifyToken, requireAdmin, (req, res) => {
    const idService = req.params.id;

    db.query("SELECT image FROM services WHERE id_service=?", [idService], (err, results) => {
        const imageToDelete = results && results.length > 0 ? results[0].image : null;

        db.query("DELETE FROM service_appointments WHERE id_service=?", [idService], (err) => {
            if (err) return res.status(500).json({ Error: "Помилка при очищенні записів послуги." });

            db.query("DELETE FROM services WHERE id_service=?", [idService], (err, result) => {
                if (err) return res.status(500).json({ Error: "Помилка бази даних при видаленні послуги." });
                
                if (result.affectedRows > 0) {
                    if (imageToDelete) {
                        const imagePath = path.join(__dirname, '..', 'images', imageToDelete);
                        fs.unlink(imagePath, (err) => {
                            if (err && err.code !== 'ENOENT') console.error("Помилка видалення файлу зображення:", err);
                        });
                    }
                    res.json({ Success: true, Message: `Послуга ID ${idService} та пов'язані записи успішно видалені.` });
                } else {
                    res.status(404).json({ Error: "Послуга не знайдена." });
                }
            });
        });
    });
});

module.exports = router;