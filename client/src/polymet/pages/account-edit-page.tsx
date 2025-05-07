import { useParams } from "react-router-dom";
import AccountFormPage from "@/polymet/pages/account-form-page";

export default function AccountEditPage() {
  const { accountId } = useParams();

  return <AccountFormPage />;
}
