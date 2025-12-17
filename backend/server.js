const express = require("express");
const cors = require("cors");
const path = require("path");
const { PORT } = require("./config");


require("./db");
const { verifyToken } = require("./middleware");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const appointmentRoutes = require("./routes/appointments");
const serviceRoutes = require("./routes/services");
const adminRoutes = require("./routes/admin");

const app = express();

app.use("/images", express.static(path.join(__dirname, 'images'))); 
app.use(cors());
app.use(express.json()); 


app.use("/auth", authRoutes); 


app.use("/", profileRoutes);


app.use("/", appointmentRoutes);


app.use("/", serviceRoutes);


app.use("/admin", verifyToken, adminRoutes); 



app.listen(PORT, () => console.log(`Server running on ${PORT}`));