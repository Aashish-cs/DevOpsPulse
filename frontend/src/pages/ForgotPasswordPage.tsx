import { Activity } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setResetUrl(null);
    setSubmitting(true);

    try {
      const response = await api.forgotPassword({ email });
      setMessage(response.message);
      setResetUrl(response.resetUrl ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not request password reset");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-brand">
          <Activity size={32} />
          <div>
            <h1>Reset password</h1>
            <p>Enter your account email to receive a reset link.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>

          {message ? <p className="form-success">{message}</p> : null}
          {resetUrl ? (
            <a className="text-button inline-link" href={resetUrl}>
              Open reset link
            </a>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button wide" type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <Link className="text-button inline-link" to="/login">
          Back to login
        </Link>
      </section>
    </main>
  );
}
