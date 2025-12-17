const express = require("express");
const db = require("../db");
const { verifyToken } = require("../middleware");
const { timeToMinutes, checkUserAppointmentConflict } = require("../utils");
const { APPOINTMENT_DURATION } = require("../config");

const router = express.Router();

router.get("/doctors", (req, res) => {
    db.query(
        `SELECT id_doctor idDoctor,full_name fullName,specialization,
        consultation_price price,image imageUrl,experience_years experience,description
        FROM doctors`,
        (e, r) => e ? res.status(500).json({ Error: "Помилка" }) : res.json(r)
    );
});

router.get("/api/doctor-slots", (req, res) => {
    const { date, idDoctor } = req.query;
    if (!date || !idDoctor) return res.status(400).json({ Error: "Дата та ID лікаря обовʼязкові" });

    db.query(
        `SELECT appointment_time
        FROM appointments
        WHERE appointment_date=? AND id_doctor=? AND status='Заплановано'`,
        [date, idDoctor],
        (e, r) => {
            if (e) return res.status(500).json({ Error: "Помилка" });
            const slots = r.map(x => ({
                time: String(x.appointment_time).substring(0, 5),
                duration: APPOINTMENT_DURATION
            }));
            res.json({ Success: true, bookedSlots: slots });
        }
    );
});

async function processAppointmentCreation(req, res, userId, idDoctor, date, time, doctorName) {
    const duration = APPOINTMENT_DURATION;
    const start = timeToMinutes(time);
    const end = start + duration;

    try {
        const userConflict = await checkUserAppointmentConflict(userId, date, time, duration);
        if (userConflict) {
            return res.json({ 
                Success: false, 
                Error: "Ви вже маєте інший запис (до лікаря чи на послугу) на цей час." 
            });
        }
    } catch (error) {
        console.error("Помилка перевірки конфлікту запису користувача:", error);
        return res.status(500).json({ Error: "Помилка сервера під час перевірки конфліктів." });
    }

    db.query(
        `SELECT appointment_time
        FROM appointments
        WHERE appointment_date=? AND id_doctor=? AND status='Заплановано'`,
        [date, idDoctor],
        (e, r) => {
            if (e) return res.status(500).json({ Error: "Помилка" });

            const conflict = r.some(a => {
                const bookedDuration = APPOINTMENT_DURATION;
                const s = timeToMinutes(a.appointment_time);
                return start < s + bookedDuration && end > s;
            });

            if (conflict) return res.json({ Success: false, Error: "Час зайнятий або конфліктує з іншим записом" });

            db.query(
                "INSERT INTO appointments(id_user,id_doctor,appointment_date,appointment_time,status) VALUES(?,?,?,?,'Заплановано')",
                [userId, idDoctor, date, time],
                (e, r) => e
                    ? res.status(500).json({ Error: "Помилка" })
                    : res.json({ Success: true, Message: `Запис до ${doctorName} створено`, id: r.insertId })
            );
        }
    );
}

router.post("/appointment", verifyToken, async (req, res) => {
    const { idDoctor, date, time, doctorName } = req.body;
    const userId = req.userId;
    const userRole = req.userRole;
    
    console.log(`[APPOINTMENT DEBUG] User ID: ${userId}, Role: ${userRole}`);
    console.log(`[APPOINTMENT DEBUG] Target Doctor ID: ${idDoctor}`);

    if (!idDoctor || !date || !time)
        return res.status(400).json({ Error: "Неповні дані" });

    if (userRole === 'Doctor') {
        db.query(
            "SELECT user_id FROM doctors WHERE id_doctor=?",
            [idDoctor],
            (e, r) => {
                if (e) {
                    console.error("Помилка БД при перевірці user_id лікаря:", e);
                    return res.status(500).json({ Error: "Помилка сервера при перевірці лікаря." });
                }
                if (r.length === 0) {
                    console.warn(`Лікар з id_doctor ${idDoctor} не знайдений.`);
                }
                
                if (r.length > 0) {
                    const targetDoctorUserId = r[0].user_id;

                    if (Number(userId) === Number(targetDoctorUserId)) {
                        console.log(`[APPOINTMENT BLOCKED] Лікар ${userId} намагався записатися до лікаря ${targetDoctorUserId} (самого до себе).`);
                        return res.json({
                            Success: false,
                            Error: "Лікар не може записатися на консультацію до самого себе."
                        });
                    }
                }

                processAppointmentCreation(req, res, userId, idDoctor, date, time, doctorName);
            }
        );
        return; 
    }

    processAppointmentCreation(req, res, userId, idDoctor, date, time, doctorName);
});

router.get("/user-appointments", verifyToken, (req, res) => {
    const userId = req.userId;
    const userRole = req.userRole;

    let query;
    let values;

    if (userRole === 'Doctor') {
        query = `
            SELECT a.id_appointment id, a.appointment_date date, a.appointment_time time, a.status,
            l.name patientName, l.email patientEmail, 
            d.specialization
            FROM appointments a 
            JOIN doctors d ON a.id_doctor = d.id_doctor
            JOIN login l ON a.id_user = l.id_user
            LEFT JOIN profiles p ON a.id_user = p.id_user
            WHERE d.user_id = ? 
            ORDER BY date DESC, time DESC`;
        values = [userId];
    } else {
        query = `
            SELECT a.id_appointment id, a.appointment_date date, a.appointment_time time, a.status,
            d.full_name doctorName, d.specialization
            FROM appointments a 
            JOIN doctors d ON a.id_doctor = d.id_doctor
            WHERE a.id_user = ? 
            ORDER BY date DESC, time DESC`;
        values = [userId];
    }

    db.query(
        query,
        values,
        (e, r) => {
            if (e) {
                console.error("DB Error on /user-appointments:", e);
                return res.status(500).json({ Error: "Помилка завантаження записів." });
            }
            res.json({ Success: true, appointments: r });
        }
    );
});

router.get("/user-appointments/as-patient", verifyToken, (req, res) => {
    const userId = req.userId;

    const query = `
        SELECT a.id_appointment id, a.appointment_date date, a.appointment_time time, a.status,
        d.full_name doctorName, d.specialization
        FROM appointments a 
        JOIN doctors d ON a.id_doctor = d.id_doctor
        WHERE a.id_user = ? 
        ORDER BY date DESC, time DESC`;
    
    db.query(
        query,
        [userId],
        (e, r) => {
            if (e) {
                console.error("DB Error on /user-appointments/as-patient:", e);
                return res.status(500).json({ Error: "Помилка завантаження моїх записів до інших лікарів." });
            }
            res.json({ Success: true, appointments: r });
        }
    );
});


router.post("/cancel-doctor-appointment", verifyToken, (req, res) => {
    const { appointmentId } = req.body;
    const userId = req.userId;
    const userRole = req.userRole;

    if (!appointmentId) {
        return res.status(400).json({ Error: "ID запису обов'язковий" });
    }

    db.query(
        `SELECT a.status, a.id_user, d.user_id AS doctor_user_id 
         FROM appointments a
         JOIN doctors d ON a.id_doctor = d.id_doctor
         WHERE a.id_appointment = ?`,
        [appointmentId],
        (err, results) => {
            if (err) {
                console.error("DB Error on cancel-doctor-appointment (check):", err);
                return res.status(500).json({ Error: "Помилка бази даних під час перевірки запису." });
            }

            if (results.length === 0) {
                return res.status(404).json({ Error: "Запис не знайдено." });
            }

            const appointment = results[0];
            const isPatient = appointment.id_user === userId;
            const isResponsibleDoctor = userRole === 'Doctor' && appointment.doctor_user_id === userId;

            if (appointment.status !== 'Заплановано') {
                return res.status(400).json({ Error: "Запис вже скасовано або завершено." });
            }

            if (!isPatient && !isResponsibleDoctor) {
                return res.status(403).json({ Error: "Доступ заборонено. Ви не є власником запису або відповідальним лікарем." });
            }
            
            db.query(
                "UPDATE appointments SET status='Скасовано' WHERE id_appointment=?",
                [appointmentId],
                (updateErr, updateResults) => {
                    if (updateErr) {
                        console.error("DB Error on cancel-doctor-appointment (update):", updateErr);
                        return res.status(500).json({ Error: "Помилка бази даних під час скасування" });
                    }
                    
                    if (updateResults.affectedRows === 0) {
                         return res.status(400).json({ Error: "Не вдалося скасувати запис." });
                    }
                    
                    const message = isResponsibleDoctor ? 
                        "Запис пацієнта успішно скасовано лікарем." : 
                        "Ваш запис успішно скасовано.";
                        
                    res.json({ Success: true, Message: message });
                }
            );
        }
    );
});



router.post("/delete-appointment", verifyToken, (req, res) => {
    const { appointmentId } = req.body;
    const userId = req.userId;
    const userRole = req.userRole;

    db.query(
        `SELECT a.status, a.id_user, d.user_id AS doctor_user_id 
         FROM appointments a
         JOIN doctors d ON a.id_doctor = d.id_doctor
         WHERE a.id_appointment = ?`,
        [appointmentId],
        (err, results) => {
            if (err) return res.status(500).json({ Error: "Помилка бази даних." });
            if (results.length === 0) return res.status(404).json({ Error: "Запис не знайдено." });

            const appointment = results[0];
            const isPatient = appointment.id_user === userId;
            const isResponsibleDoctor = userRole === 'Doctor' && appointment.doctor_user_id === userId;

            if (appointment.status !== 'Скасовано') return res.status(400).json({ Error: "Можна видалити лише скасовані записи." });
            if (!isPatient && !isResponsibleDoctor) return res.status(403).json({ Error: "Доступ заборонено." });
            
            db.query("DELETE FROM appointments WHERE id_appointment=?", [appointmentId], (deleteErr) => {
                if (deleteErr) return res.status(500).json({ Error: "Помилка видалення" });
                res.json({ Success: true, Message: "Запис видалено з історії." });
            });
        }
    );
});


router.post("/delete-service-appointment", verifyToken, (req, res) => {
    const { appointmentId } = req.body;
    const userId = req.userId;


    db.query(
        `SELECT status, id_user FROM service_appointments WHERE id_service_appointment = ?`,
        [appointmentId],
        (err, results) => {
            if (err) return res.status(500).json({ Error: "Помилка бази даних." });
            if (results.length === 0) return res.status(404).json({ Error: "Запис на послугу не знайдено." });

            const appointment = results[0];

            if (appointment.status !== 'Скасовано') return res.status(400).json({ Error: "Можна видалити лише скасовані послуги." });
            if (appointment.id_user !== userId) return res.status(403).json({ Error: "Ви не можете видалити чужий запис." });
            
            db.query("DELETE FROM service_appointments WHERE id_service_appointment = ?", [appointmentId], (deleteErr) => {
                if (deleteErr) return res.status(500).json({ Error: "Помилка при видаленні послуги." });
                res.json({ Success: true, Message: "Запис на послугу успішно видалено." });
            });
        }
    );
});

module.exports = router;