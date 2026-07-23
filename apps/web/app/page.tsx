import { redirect } from "next/navigation";

// Root page redirects straight into the app.
// The middleware handles unauthenticated users → /login.
export default function RootPage() {
  redirect("/dashboard");
}
