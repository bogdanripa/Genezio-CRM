import { AuthService } from "@genezio/auth";
import { useNavigate } from "react-router-dom";

export default function LogoutPage() {
  const navigate = useNavigate();

  AuthService.getInstance().logout().then(() => {
    console.log("Logged out successfully");
    navigate("/login");
  });
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-indigo-950 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Maya CRM</h1>
        <p className="text-muted-foreground">
          Logging you out...
        </p>
      </div>
    </div>
  );
}
