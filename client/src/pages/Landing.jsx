import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Landing() {
  const { user } = useAuth();

  return (
    <section className="flex flex-col items-center pt-24 text-center sm:pt-32">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-faint">
        Pittsburgh · Beta
      </p>
      <h1 className="mt-5 max-w-xl font-display text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
        Order to your <em className="text-accent">macros</em>.
      </h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-faint">
        Tell us your protein, carb, and price goals in plain language. We search nearby
        menus, estimate the nutrition, and rank what fits.
      </p>

      <Link
        to="/order"
        className="mt-12 inline-flex h-36 w-36 items-center justify-center rounded-full bg-accent font-display text-2xl font-semibold italic text-on-accent shadow-lg shadow-accent/25 transition-transform hover:scale-[1.03] active:scale-[0.98]"
      >
        Order
      </Link>

      {!user && (
        <p className="mt-12 text-sm text-faint">
          <Link to="/signup" className="font-semibold text-ink underline underline-offset-4 hover:text-accent">
            Create an account
          </Link>{" "}
          to save your goals and order history.
        </p>
      )}

      <p className="mt-16 max-w-sm text-xs leading-relaxed text-faint">
        Nutrition values are AI estimates, not restaurant-verified. Ordering completes on
        DoorDash.
      </p>
    </section>
  );
}
