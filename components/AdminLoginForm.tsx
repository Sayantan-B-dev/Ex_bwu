"use client";

import { useState } from "react";
import { login } from "@/lib/actions";

export default function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPin, setShowPin] = useState(false);

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
        <div className="pin-wrap">
          <input className="admin-input pin-input" id="pin" name="pin" type={showPin ? "text" : "password"} autoComplete="current-password" required />
          <button
            className={showPin ? "pin-toggle shown" : "pin-toggle"}
            type="button"
            aria-label={showPin ? "Hide PIN" : "Show PIN"}
            aria-pressed={showPin}
            onClick={() => setShowPin((s) => !s)}
          >
            <svg className="pin-eye" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-7.5 11-7.5 11 7.5 11 7.5-4 7.5-11 7.5S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg className="pin-eye-off" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </button>
        </div>
      </div>
      {error && <p className="admin-msg err">{error}</p>}
      <button className="admin-btn solid" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}