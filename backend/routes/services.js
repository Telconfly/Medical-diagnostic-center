

const express = require("express");
const db = require("../db");
const { verifyToken } = require("../middleware");
const { timeToMinutes, getServiceDuration, checkUserAppointmentConflict } = require("../utils");
const { SERVICE_DURATION } = require("../config");

const router = express.Router();


router.get("/services", (req, res) => {
    db.query(
        "SELECT id_service idService,name,description,price,duration_minutes duration, image imageUrl FROM services",
        (e, r) => {
            if (e) {
                console.error("SQL Error in /services:", e);
                return res.status(500).json({ Error: "Помилка завантаження даних послуг. Перевірте структуру БД." });
            }
            res.json(r);
        }
    );
});


router.get("/api/service-slots", (req, res) => {
    const { date, idService } = req.query;
    if (!date || !idService) return res.status(400).json({ Error: "Дата та ID послуги обовʼязкові" });

    db.query(
        `SELECT sa.appointment_time, s.duration_minutes
        FROM service_appointments sa
        JOIN services s ON sa.id_service=s.id_service
        WHERE sa.appointment_date=? AND sa.id_service=? AND sa.status='Заплановано'`, 
        [date, idService],
        (e, r) => {
            if (e) return res.status(500).json({ Error: "Помилка" });
            const slots = r.map(x => ({
                time: String(x.appointment_time).substring(0, 5),
                duration: SERVICE_DURATION 
            }));
            res.json({ Success: true, bookedSlots: slots });
        }
    );
});


router.post("/service-appointment", verifyToken, async (req, res) => {
    const { idService, date, time, serviceName } = req.body;
    if (!idService || !date || !time)
        return res.status(400).json({ Error: "Неповні дані" });

    const duration = await getServiceDuration(idService).catch(e => console.error(e));
    if (!duration) return res.status(404).json({ Error: "Послуга не знайдена" });

    const start = timeToMinutes(time), end = start + duration;

    
    try {
        const userConflict = await checkUserAppointmentConflict(req.userId, date, time, duration);
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
        `SELECT sa.appointment_time
        FROM service_appointments sa
        WHERE sa.appointment_date=? AND sa.id_service=? AND sa.status='Заплановано'`,
        [date, idService],
        (e, r) => {
            if (e) return res.status(500).json({ Error: "Помилка" });

            const conflict = r.some(a => {
                const bookedDuration = SERVICE_DURATION;
                const s = timeToMinutes(a.appointment_time);
                return start < s + bookedDuration && end > s;
            });

            if (conflict) return res.json({ Success: false, Error: "Час зайнятий" });

            
            db.query(
                "INSERT INTO service_appointments(id_user,id_service,appointment_date,appointment_time,status) VALUES(?,?,?,?,'Заплановано')",
                [req.userId, idService, date, time],
                err => err
                    ? res.status(500).json({ Error: "Помилка" })
                    : res.json({ Success: true, Message: `Запис на "${serviceName}" створено` })
            );
        }
    );
});


router.get("/user-service-appointments", verifyToken, (req, res) => {
    db.query(
        `SELECT sa.id_service_appointment id, sa.appointment_date date,sa.appointment_time time,sa.status,
        s.name serviceName,s.duration_minutes duration
        FROM service_appointments sa
        JOIN services s ON sa.id_service=s.id_service
        WHERE sa.id_user=? ORDER BY date DESC,time DESC`,
        [req.userId],
        (e, r) => e ? res.status(500).json({ Error: "Помилка" }) : res.json({ Success: true, serviceAppointments: r })
    );
});


router.post("/cancel-service-appointment", verifyToken, (req, res) => {
    const { appointmentId } = req.body;
    if (!appointmentId) {
        return res.status(400).json({ Error: "ID запису обов'язковий" });
    }

    db.query(
        "UPDATE service_appointments SET status='Скасовано' WHERE id_service_appointment=? AND id_user=? AND status='Заплановано'",
        [appointmentId, req.userId],
        (err, results) => {
            if (err) return res.status(500).json({ Error: "Помилка бази даних під час скасування" });
            if (results.affectedRows === 0) {
                return res.status(400).json({ Error: "Запис не знайдено, вже скасовано або доступ заборонено." });
            }
            res.json({ Success: true, Message: "Запис на послугу успішно скасовано." });
        }
    );
});

module.exports = router;