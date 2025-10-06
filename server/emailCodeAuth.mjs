import express from "express";
import { init_auth, sign_in } from "./modules/auth.mjs";

const router = express.Router();

router.post("/init", async function (req, res, _next) {
    const email = req.body.email;
    if (!email) {
        return res.status(400).send("Email is required");
    }

    try {
        return await init_auth({ email });
    } catch(e) {
        res.status(e.status || 500, e.message || "Internal Server Error");
    }
});

router.post("/sign_in", async function (req, res, _next) {
    const email = req.body.email;
    const phone = req.body.phone; 
    const code = req.body.code;
    
    if (!email || !code || !phone) {
        return res.status(400).send("Email, code and phone are required");
    }

    try {
        return await sign_in({email, phone, code});
    } catch(e) {
        res.status(e.status || 500, e.message || "Internal Server Error");
    }
});

// Export the router
export default router;