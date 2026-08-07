"use client";

import { useState } from "react";
import { login } from "@/lib/actions";

export default function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await login(null, new FormData(e.currentTarget));
    if (res && !res.ok) {
      setError(res.error ?? "Login failed.");
      setPending(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-field">
        <label htmlFor="name">Name</label>
        <input className="admin-input" id="name" name="name" type="text" autoComplete="username" required />
      </div>
      <div className="admin-field">
        <label htmlFor="pin">PIN</label>
        <input className="admin-input" id="pin" name="pin" type="password" autoComplete="current-password" required />
      </div>
      {error && <p className="admin-msg err">{error}</p>}
      <button className="admin-btn solid" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}