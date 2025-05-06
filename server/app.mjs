import express from "express";
import { AuthService } from "@genezio/auth";
import cors from "cors";

const app = express();
const secret = "Cats are the best!";

app.use(cors());

async function checkAuth(req, res, next) {
  try {
    const token = req.headers.authorization.split(" ")[1];
    await AuthService.getInstance().userInfoForToken(token);
    next();
  } catch (error) {
    res.status(401).send({
      message: "Unauthorized",
    });
  }
}

app.get("/secret", checkAuth, async function (_req, res, _next) {
  res.send({
    message: `The secret is: ${secret}`,
  });
});

app.listen(8080, () => {
  console.log(
    "Server is running on port 8080. Check the app on http://localhost:8080"
  );
});
