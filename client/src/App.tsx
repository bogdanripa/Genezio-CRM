import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import CrmLayout from "@/polymet/layouts/crm-layout";
import LoginPage from "@/polymet/pages/login-page";
import LogoutPage from "@/polymet/pages/logout-page";
import DashboardPage from "@/polymet/pages/dashboard-page";
import AccountsPage from "@/polymet/pages/accounts-page";
import AccountDetailPage from "@/polymet/pages/account-detail-page";
import AccountFormPage from "@/polymet/pages/account-form-page";
import AccountEditPage from "@/polymet/pages/account-edit-page";
import { Toaster } from "@/components/ui/toaster";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthService } from "@genezio/auth";
AuthService.getInstance().setTokenAndRegion(
  "1-396d0728-bde4-4387-bc87-cc9937292269",
  "eu-central-1"
);

function PrivateRoute({ children }: { children: JSX.Element }) {
  const auth = AuthService.getInstance();
  const isAuthenticated = !!auth.getUserToken();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


export default function CrmPrototype() {
  return (
    <GoogleOAuthProvider clientId="478675157292-cje3bul64nkoduku4bdaargaerujlnej.apps.googleusercontent.com">
      <Router>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/logout" element={<LogoutPage />} />
        <Route
            path="/"
            element={
              <PrivateRoute>
                <Navigate to="/dashboard" replace />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <CrmLayout>
                  <DashboardPage />
                </CrmLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/accounts"
            element={
              <PrivateRoute>
                <CrmLayout>
                  <AccountsPage />
                </CrmLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/accounts/new"
            element={
              <PrivateRoute>
                <CrmLayout>
                  <AccountFormPage />
                  <Toaster />
                </CrmLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/accounts/:accountId"
            element={
              <PrivateRoute>
                <CrmLayout>
                  <AccountDetailPage />
                  <Toaster />
                </CrmLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/accounts/:accountId/edit"
            element={
              <PrivateRoute>
                <CrmLayout>
                  <AccountEditPage />
                  <Toaster />
                </CrmLayout>
              </PrivateRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}
