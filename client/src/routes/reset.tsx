import {useState} from "react";
import {AuthService} from "@genezio/auth";
import {useNavigate} from 'react-router-dom';
import {GenezioError} from "@genezio/types";

export default function ResetPasswordForm() {
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const navigate = useNavigate();

  const queryString = window.location.search;
  const queryParams = new URLSearchParams(queryString);
  const token: string = queryParams.get('token') || "not specified";

  const reset = async () => {
    if (password1 != password2) {
      alert("Passwords don't match.");
      return;
    }
    try {
      await AuthService.getInstance().resetPasswordConfirmation(token, password1);
      alert("Your password was changed. Let's sign in again.");
      navigate('/login');
    } catch (error) {
      alert((error as GenezioError).code + ": " + (error as GenezioError).message);
    }
  };

  return (
    <form className="form-container">
      <h2>Reset Password</h2>
      <div>
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          value={password1}
          onChange={(e) => setPassword1(e.target.value)}/>
      </div>
      <div>
        <label htmlFor="password">Confirm Password:</label>
        <input
          type="password"
          id="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}/>
      </div>
      <button onClick={reset}>Reset Password</button>
    </form>
  );
};