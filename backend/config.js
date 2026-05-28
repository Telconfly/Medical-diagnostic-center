
module.exports = {

    DB_CONFIG: {
        host: "localhost",
        user: "root",
        password: "",
        database: "mdctwo"
    },

    // ⚠️ ВАЖЛИВО: JWT_SECRET має бути замінено на безпечне значення через змінні середовища
    // (наприклад: process.env.JWT_SECRET) перед розгортанням у production!
    JWT_SECRET: "your_super_secret_jwt_key",
    APPOINTMENT_DURATION: 30, 
    SERVICE_DURATION: 30, 
    PORT: 8081
};