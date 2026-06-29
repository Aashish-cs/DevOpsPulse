import { Activity } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type AuthMode = "login" | "signup";

const demoEmail = "demo@devopspulse.local";
const demoPassword = "password123";

export function LoginPage() {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState(demoPassword);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/dashboard";

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }

      navigate(redirectTo, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);

    if (nextMode === "login") {
      setEmail(demoEmail);
      setPassword(demoPassword);
      return;
    }

    setEmail("");
    setPassword("");
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-brand">
          <Activity size={32} />
          <div>
            <h1>DevOpsPulse</h1>
            <p>Uptime monitoring for small teams and demos.</p>
          </div>
        </div>
        <div className="segmented-control" role="tablist" aria-label="Authentication mode">
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => selectMode("login")}
            role="tab"
            aria-selected={mode === "login"}
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            type="button"
            onClick={() => selectMode("signup")}
            role="tab"
            aria-selected={mode === "signup"}
          >
            Signup
          </button>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={8}
              required
            />
          </label>
          {mode === "login" ? (
            <Link className="auth-helper-link" to="/forgot-password">
              Forgot password?
            </Link>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button wide" type="submit" disabled={submitting}>
            {submitting ? "Working..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
