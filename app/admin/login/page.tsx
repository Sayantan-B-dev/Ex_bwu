import AdminLoginForm from "@/components/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <div className="wrap">
      <header>
        <div className="kicker">Administration</div>
        <h1>Master Login</h1>
        <p>Use the credentials set up in the Supabase terminal (admins table).</p>
      </header>
      <main className="admin-login-card">
        <div className="admin-panel">
          <AdminLoginForm />
        </div>
      </main>
    </div>
  );
}