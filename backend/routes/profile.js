const express = require("express");
const db = require("../db");
const { verifyToken, upload, handleMulterError } = require("../middleware"); 

const router = express.Router();

router.get("/profile", verifyToken, (req, res) => {
    const isDoctor = req.userRole === 'Doctor';

    let query = `
        SELECT l.id_user id, l.name, l.email, l.role, p.phone, p.address,
        p.date_of_birth dateOfBirth, p.bio
        FROM login l LEFT JOIN profiles p ON l.id_user=p.id_user
        WHERE l.id_user=?
    `;
    
    if (isDoctor) {
        query = `
            SELECT l.id_user id, l.name, l.email, l.role, p.phone, p.address,
            p.date_of_birth dateOfBirth, p.bio,
            d.full_name doctorFullName, d.specialization, d.consultation_price price, d.experience_years experience, d.description doctorDescription, d.image imageUrl
            FROM login l 
            LEFT JOIN profiles p ON l.id_user=p.id_user
            LEFT JOIN doctors d ON l.id_user=d.user_id 
            WHERE l.id_user=?
        `;
    }

    db.query(
        query,
        [req.userId],
        (e, r) => e || !r.length
            ? res.status(500).json({ Error: "Помилка завантаження профілю" })
            : res.json({ Success: true, user: r[0] })
    );
});

router.post("/profile/update", 
    verifyToken, 
    upload.single('doctorImage'), 
    handleMulterError, 
    (req, res) => {
        const { name, phone, address, dateOfBirth, bio, specialization, price, experience, doctorDescription } = req.body;
        
        if (!name) {
            return res.status(400).json({ Error: "Неповні дані для оновлення. Відсутнє ім'я." });
        }
        
        const isDoctor = req.userRole === 'Doctor';
        const uploadedImageName = req.file ? req.file.filename : null; 

        db.query("UPDATE login SET name=? WHERE id_user=?", [name, req.userId], err => {
            if (err) return res.status(500).json({ Error: "Помилка оновлення імені" });

            db.query(
                "UPDATE profiles SET phone=?,address=?,date_of_birth=?,bio=? WHERE id_user=?",
                [phone, address, dateOfBirth, bio, req.userId],
                e => {
                    if (e) return res.status(500).json({ Error: "Помилка оновлення профілю" });
                    
                    if (isDoctor) {
                        let doctorUpdateQuery = `
                             UPDATE doctors 
                             SET full_name=?, specialization=?, consultation_price=?, experience_years=?, description=?
                             ${uploadedImageName ? ', image=?' : ''}
                             WHERE user_id=?
                           `;
                        
                        let doctorUpdateValues = [name, specialization, price, experience, doctorDescription];
                        if (uploadedImageName) {
                            doctorUpdateValues.push(uploadedImageName);
                        }
                        doctorUpdateValues.push(req.userId);

                        db.query(
                            doctorUpdateQuery,
                            doctorUpdateValues,
                            doctorErr => {
                                if (doctorErr) {
                                    console.error("Doctor profile update error:", doctorErr);
                                    return res.status(500).json({ Error: "Помилка оновлення даних лікаря." });
                                }
                                res.json({ Success: true, Message: "Профіль та дані лікаря успішно оновлено." });
                            }
                        );
                    } else {
                        res.json({ Success: true, Message: "Профіль успішно оновлено." });
                    }
                }
            );
        });
    }
);

module.exports = router;