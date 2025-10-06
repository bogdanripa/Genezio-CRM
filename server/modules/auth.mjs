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
      if (next) next();
    } catch (error) {
      console.error(error);
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

export async function init_auth({ email }) {
  if (!email) {
    throw {status: 401, message: "The user's email is required in the init_auth call."}
  }

  const user = await Users.findOne({ email: email });
  if (!user) {
    return "https://app.mayacrm.ai/login?s="
  }

  // generate a 8 digits code
  const code = generate8DigitCode();

  const response = await MailService.sendMail({
      emailServiceToken: process.env.EMAIL_SERVICE_TOKEN,
      to: email,
      subject: "Your Maya CRM Authentication Code",
      text: "The auth code to authenticate your Maya CRM account is: " + code,
  });

  if (!response.success) {
      throw {status: 500, message: "Failed to send email. Please try again later."};
  }

  user.emailCode = code;
  await user.save();

  return "An email was sent with the auth code to authenticate. Please share it back with me.";
}

function hexInc(hex) {
  const num = BigInt("0x" + hex);
  return (num + BigInt(1)).toString(16);
}

function hexDec(hex) {
  const num = BigInt("0x" + hex);
  return (num - BigInt(1)).toString(16);
}

async function getToken(userId) {
  const authSession = await ActiveSessions.findOne({ userId: hexInc(userId) }).sort({ date: -1 });
  if (!authSession) {
      throw {status: 500, message: "Session expired. Please log in to the Maya CRM web interface again and then come back."};
  }
  return authSession.token;
}

export async function sign_in({ email, phone, auth_code }) {
  if (!email || !auth_code) {
    throw {status: 401, message: "The user's email and auth_code are both required in the sign_in call."}
  }
  const user = await Users.findOne({ email });
  if (!user) {
    throw {status: 404, message: "User's email was not found. They can create an account at https://app.mayacrm.ai/ and then come back to authenticate."};
  }
  
  if (user.emailCode !== auth_code) {
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

export async function getUserDataFromToken({ auth_token }) {
  if (!auth_token) {
    throw {status: 401, message: "The auth_token is required."}
  }

  const authSession = await ActiveSessions.findOne({ token: auth_token });
  if (!authSession) {
      throw {status: 500, message: "Session expired. Please log in to the Maya CRM web interface again and then come back."};
  }

  const user = await Users.findOne({ userId: hexDec(authSession.userId) });

  if (!user) {
    throw {status: 404, message: "User not found."};
  }

  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
  }
}

export async function finalizeSignUp({ email, s }) {
  const user = await Users.findOne({ email });
  if (!user) {
    throw {status: 404, message: "User not found."};
  }
  const token = await getToken(user.userId);
  const name = user.name;

  const response = await fetch(process.env.WA_URL + 'signUpUser', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.EMAIL_CODE_AUTH_SECRET}`,
    },
    body: JSON.stringify({ secret: s, email, name, token }),
  })

  if (!response.ok) {
    throw {status: 500, message: "Failed to sign up user."};
  }

  const responseData = await response.json();
  user.phone = responseData.phone;
  await user.save();

}