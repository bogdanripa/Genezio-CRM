import express from "express";
import { Users, ActiveSessions, Accounts } from "./db.mjs";
import { MailService } from "@genezio/email-service";

const router = express.Router();

function hexInc(hex) {
    const num = BigInt("0x" + hex);
    return (num + BigInt(1)).toString(16);
}

async function getToken(userId) {
    const authSession = await ActiveSessions.findOne({ userId: hexInc(userId) }).sort({ date: -1 });
    if (!authSession) {
        return [500, "Session expired. Please log in to the Genezio CRM web interface again and then come back."];
    }
    return [200, "Authenticated", authSession.token];
}

/*
router.post("/get-token", async function (req, res, _next) {
    const secret = req.body.secret;
    const phone = req.body.phone;
    if (!secret || secret !== process.env.EMAIL_CODE_AUTH_SECRET) {
        return res.status(500).send({ message: "Internal server error" });
    }
    if (!phone) {
        return res.status(400).send({ message: "Phone is required" });
    }
    const user = await Users.findOne({ phone });
    if (!user) {
        return res.status(404).send({ message: "User not found" });
    }

    const [code, message, token] = await getToken(user.userId);
    res.status(code).send({
        message,
        token,
    });
});
*/

function generate8DigitCode() {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

router.post("/init", async function (req, res, _next) {
    const email = req.body.email;
    if (!email) {
        return res.status(400).send("Email is required");
    }
    const user = await Users.findOne({ email: email });
    if (!user) {
        return res.status(404).send("Could not identify you by email. You need to create an account at https://genezio-crm.app.genez.io/ and then come back to authenticate.");
    }

    // generate a 8 digits code
    const code = generate8DigitCode();

    const response = await MailService.sendMail({
        emailServiceToken: process.env.EMAIL_SERVICE_TOKEN,
        to: email,
        subject: "Your Genezio CRM Authentication Code",
        text: "The code to authenticate your Genezio CRM account is: " + code,
    });

    if (!response.success) {
        res.status(500).send("Failed to send email. Please try again later.");
        return;
    }

    user.emailCode = code;
    await user.save();

    res.status(200).send("An email was sent with the code to authenticate. Please share it back with me.");
});

router.post("/authenticate", async function (req, res, _next) {
    const email = req.body.email;
    const phone = req.body.phone; 
    const code = req.body.code;
    
    if (!email || !code || !phone) {
        return res.status(400).send("Email, code and phone are required");
    }
    
    const user = await Users.findOne({ email: email });
    if (!user) {
        return res.status(404).send("User's email was not found. They can create an account at https://genezio-crm.app.genez.io/ and then come back to authenticate.");
    }
    
    if (user.emailCode !== code) {
        return res.status(401).send("Invalid authentication code");
    }


    const [responseCode, message, token] = await getToken(user.userId);

    if (responseCode === 200) {
        user.emailCode = null;
        user.phone = phone;
        await user.save();
        const userAccounts = await Accounts.find({"owner.id": user.userId});
        for (const account of userAccounts) {
            account.owner.phone = phone;
            await account.save();
        }
        
        res.status(200).send({
            token,
            name: user.name
        });
    } else {
        res.status(responseCode).send(message);
    }
});

// Export the router
export default router;