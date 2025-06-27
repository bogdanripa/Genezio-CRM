import { useState } from "react";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { AuthService } from "@genezio/auth";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [googleLoginLoading, setGoogleLoginLoading] = useState(false);

  const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
    setGoogleLoginLoading(true);
    try {
      await AuthService.getInstance().googleRegistration(
        credentialResponse.credential!
      );

      console.log("Login Success");
      navigate("/");
    } catch (error: any) {
      console.log("Login Failed", error);
      alert("Login Failed");
    }

    setGoogleLoginLoading(false);
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-indigo-950 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Genezio CRM</h1>
        <p className="text-muted-foreground">
          Manage your accounts and customer relationships
        </p>
      </div>
      <div className="form-container">
        {googleLoginLoading ? (
          <>Loading...</>
        ) : (
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              handleGoogleLogin(credentialResponse);
            }}
            onError={() => {
              console.log("Login Failed");
              alert("Login Failed");
            }}
          />
        )}
      </div>
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p className="mt-1">
          Users will only see accounts from their email domain
        </p>
      </div>

      {/* Add a direct link to dashboard for better routing */}
      <div className="mt-4">
        <Link to="/dashboard" className="text-primary hover:underline">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
