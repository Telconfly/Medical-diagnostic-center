const db = require("./db");
const { SERVICE_DURATION } = require("./config");


const timeToMinutes = time => {
    if (!time) return 0;
    const [tH, tM] = String(time).substring(0, 5).split(":");
    return (+tH * 60) + (+tM);
};


function getServiceDuration(idService) {
    return new Promise((resolve, reject) => {
        
        db.query("SELECT id_service FROM services WHERE id_service=?", [idService], (err, results) => {
            if (err) return reject(err);
            if (results.length === 0) return resolve(null);
            resolve(SERVICE_DURATION);
        });
    });
}


const checkUserAppointmentConflict = (userId, date, time, duration) => {
    return new Promise((resolve, reject) => {
        const start = timeToMinutes(time);
        const end = start + duration;

        const query = `
            SELECT 'doctor' AS type, appointment_time AS time
            FROM appointments
            WHERE id_user=? AND appointment_date=? AND status='Заплановано'
            UNION ALL
            SELECT 'service' AS type, appointment_time AS time
            FROM service_appointments
            WHERE id_user=? AND appointment_date=? AND status='Заплановано'
        `;

        db.query(query, [userId, date, userId, date], (err, results) => {
            if (err) return reject(err);

            const conflict = results.some(appointment => {
                const bookedDuration = SERVICE_DURATION; 
                const s = timeToMinutes(appointment.time);
                return start < s + bookedDuration && end > s;
            });
            
            resolve(conflict);
        });
    });
};

module.exports = {
    timeToMinutes,
    getServiceDuration,
    checkUserAppointmentConflict
};