import { AuthService } from "@genezio/auth";
import { MailService } from "@genezio/email-service";
import { Users, ActiveSessions, Accounts } from "../db.mjs";

export async function checkAuth(req, res, next) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const userInfo = await AuthService.getInstance().userInfoForToken(token);
  
      if (!userInfo.address) {
        const domain = userInfo.email.split("@")[1];
        await Users.updateOne(
          { userId: userInfo.userId },
          {
            $set: {
              address: domain,
            },
          }
        );
        userInfo.address = domain;
      }
  
      req.userInfo = userInfo;
      next();
    } catch (error) {
      res.status(401).send("Unauthorized");
    }
}

function generate8DigitCode() {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

export async function initAuth({ email }) {
  const user = await Users.findOne({ email: email });
  if (!user) {
      throw { status: 404, message: "Could not identify you by email. You need to create an account at https://genezio-crm.app.genez.io/ and then come back to authenticate." };
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
      throw {status: 500, message: "Failed to send email. Please try again later."};
  }

  user.emailCode = code;
  await user.save();

  return "An email was sent with the code to authenticate. Please share it back with me.";
}

function hexInc(hex) {
  const num = BigInt("0x" + hex);
  return (num + BigInt(1)).toString(16);
}

async function getToken(userId) {
  const authSession = await ActiveSessions.findOne({ userId: hexInc(userId) }).sort({ date: -1 });
  if (!authSession) {
      throw {status: 500, message: "Session expired. Please log in to the Genezio CRM web interface again and then come back."};
  }
  return authSession.token;
}

export async function authenticate({ email, phone, code }) {
  const user = await Users.findOne({ email });
  if (!user) {
    throw {status: 404, message: "User's email was not found. They can create an account at https://genezio-crm.app.genez.io/ and then come back to authenticate."};
  }
  
  if (user.emailCode !== code) {
    throw {status: 401, message: "Invalid authentication code"};
  }

  const token = await getToken(user.userId);

  user.emailCode = null;
  user.phone = phone;
  await user.save();

  const userAccounts = await Accounts.find({"owner.id": user.userId});
  for (const account of userAccounts) {
      account.owner.phone = phone;
      await account.save();
  }
  
  return {
      token,
      name: user.name
  }
}