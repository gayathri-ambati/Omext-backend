import express from "express";
import cors from "cors";
import { db } from "./db.js";
// import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authMiddleware } from "./middleware/auth.js";
import bcrypt from "bcryptjs";


const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/admin/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.execute(
            "SELECT * FROM admins WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const admin = rows[0];
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: admin.id, email: admin.email },
            "SECRET_KEY",
            { expiresIn: "1d" }
        );

        res.json({
            token,
            admin: { email: admin.email }
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// Partner enquiry
app.get("/api/partnership-enquiries", async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM partner_enquiries ORDER BY id DESC"
        );

        res.json(rows);
    } catch (error) {
        console.error("GET partner enquiries error:", error);
        res.status(200).json([]);
    }
});


// Contact enquiry
app.post("/api/contact-enquiries",

    async (req, res) => {
        console.log("REQUEST BODY:", req.body); // 👈 ADD THIS

        try {
            const { name, email, phone, subject, message } = req.body;

            // Add validation
            if (!name || !email || !subject || !message) {
                return res.status(400).json({
                    success: false,
                    error: "All required fields must be filled"
                });
            }

            await db.execute(
                `INSERT INTO contact_enquiries
                (name, email, phone, subject, message, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())`,
                [name, email, phone || null, subject, message]
            );

            console.log("✅ Contact enquiry saved to database");
            res.json({ success: true });
        } catch (err) {
            console.error("❌ INSERT ERROR:", err);
            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    });


// GET partner enquiries
// ⚠️ Remove authMiddleware - partnership enquiries should be public
app.post("/api/partnership-enquiries", async (req, res) => {
    console.log("PARTNERSHIP REQUEST BODY:", req.body);

    try {
        const {
            companyName,
            contactPerson,
            email,
            phone,
            location,
            businessType,
            message
        } = req.body;

        // Validation
        if (!companyName || !contactPerson || !email || !businessType) {
            return res.status(400).json({
                success: false,
                error: "Required fields: company name, contact person, email, and business type"
            });
        }

        await db.execute(
            `INSERT INTO partner_enquiries 
                (company_name, contact_person, email, phone, location, business_type, message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [companyName, contactPerson, email, phone || null, location || null, businessType, message || null]
        );

        console.log("✅ Partnership enquiry saved");
        res.json({ success: true });
    } catch (err) {
        console.error("❌ PARTNERSHIP INSERT ERROR:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});


// GET contact enquiries
app.get("/api/contact-enquiries", async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM contact_enquiries ORDER BY id DESC"
        );

        res.json(rows);
    } catch (error) {
        console.error("GET contact enquiries error:", error);
        res.status(200).json([]);
    }
});

// DELETE partner enquiry
app.delete("/api/partnership-enquiries/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await db.execute(
            "DELETE FROM partner_enquiries WHERE id = ?",
            [id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ success: false });
    }
});

// DELETE contact enquiry
app.delete("/api/contact-enquiries/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await db.execute(
            "DELETE FROM contact_enquiries WHERE id = ?",
            [id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error("Delete contact enquiry error:", error);
        res.status(500).json({ success: false });
    }
});


app.listen(5000, () => {
    console.log("Backend running on http://localhost:5000");
});
