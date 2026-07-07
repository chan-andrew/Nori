import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import GoogleIcon from "../components/GoogleIcon.jsx";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { login, loginWithGoogle, googleAvailable } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/order");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitGoogle() {
    setBusy(true);
    setError(null);
    try {
      const profile = await loginWithGoogle();
      navigate(profile.onboarding_complete ? "/order" : "/onboarding");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-card p-8 shadow-xl shadow-ink/5 sm:p-10">
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-faint">Sign in to use your saved goals and history.</p>
        </div>

        {googleAvailable && (
          <>
            <button
              type="button"
              onClick={submitGoogle}
              disabled={busy}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-line bg-card px-6 py-3 font-semibold transition-colors hover:border-ink disabled:opacity-50"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <div className="mt-4 flex items-center gap-3 text-xs uppercase tracking-[0.15em] text-faint">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        <form onSubmit={submit} className={`${googleAvailable ? "mt-4" : "mt-8"} flex flex-col gap-4`}>
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-card px-4 py-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-line bg-card px-4 py-3 pr-16 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-3 text-xs font-semibold text-faint transition-colors hover:text-ink"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-full bg-accent px-6 py-3 font-semibold text-on-accent transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-faint">
          New here?{" "}
          <Link to="/signup" className="font-semibold text-accent transition-colors hover:text-accent-dark">
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}
