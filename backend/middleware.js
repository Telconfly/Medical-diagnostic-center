const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require('fs'); 
const path = require('path');
const { JWT_SECRET } = require("./config");


const verifyToken = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ Error: "Токен не надано" });
    const token = auth.split(" ")[1];
    if (!token) return res.status(401).json({ Error: "Невірний формат токена" });
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(err.name === "TokenExpiredError" ? 401 : 403).json({ Error: "Недійсний токен" });
        
        req.userId = decoded.id;
        req.userEmail = decoded.email;
        req.userRole = decoded.role || 'User'; 
        next();
    });
};


const requireAdmin = (req, res, next) => {
    if (req.userRole !== 'Admin') {
        return res.status(403).json({ Error: "Доступ заборонено: потрібна роль Адміністратора." });
    }
    next();
};


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
       
        const uploadDir = path.join(__dirname, 'images'); 
        

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        const extension = file.originalname.split('.').pop();
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + extension);
    }
});


const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });


const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ Error: `Помилка завантаження файлу: ${err.message}` });
    } else if (err) {
        
        return res.status(500).json({ Error: "Помилка обробки файлу на сервері." });
    }
    next();
};

module.exports = {
    verifyToken,
    requireAdmin,
    upload,
    handleMulterError
};