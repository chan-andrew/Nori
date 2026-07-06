import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import MacroRow from "../components/MacroRow.jsx";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.getProfile(user.id).then(setData).catch((err) => setError(err.message));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <Navigate to="/signin" replace />;

  const prefs = data?.user ?? user;
  const preferences = [
    ["Diet pattern", prefs.diet_pattern === "none" ? "—" : prefs.diet_pattern],
    ["Allergies", prefs.allergies || "—"],
    ["Excluded foods", prefs.disliked_foods || "—"],
    ["Daily calories", prefs.default_calorie_target ? `${prefs.default_calorie_target} cal` : "—"],
    ["Daily protein", prefs.default_protein_target ? `${prefs.default_protein_target} g` : "—"],
    ["Meal budget", prefs.average_budget ? `$${prefs.average_budget}` : "—"],
  ];

  return (
    <section className="pt-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Your profile</h1>
          <p className="mt-1 text-faint">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="text-sm font-semibold text-faint hover:text-ink"
        >
          Sign out
        </button>
      </div>

      {error && <p role="alert" className="mt-4 text-sm font-medium text-danger">{error}</p>}

      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-faint">
            Preferences
          </h2>
          <Link to="/onboarding" className="text-sm font-semibold text-accent hover:text-accent-dark">
            Edit
          </Link>
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {preferences.map(([label, value]) => (
            <div key={label} className="bg-card px-5 py-4">
              <dt className="text-xs uppercase tracking-wide text-faint">{label}</dt>
              <dd className="mt-1 font-medium capitalize">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {data?.stats && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-faint">
            Your patterns
          </h2>
          <p className="mt-3 rounded-2xl bg-accent-soft p-5 leading-relaxed">
            Across <strong>{data.stats.order_count}</strong>{" "}
            {data.stats.order_count === 1 ? "order" : "orders"}, you average{" "}
            <strong>{data.stats.avg_protein_g}g protein</strong> and{" "}
            <strong>{data.stats.avg_calories} calories</strong> per meal at about{" "}
            <strong>${data.stats.avg_price.toFixed(2)}</strong>
            {data.stats.top_protein_source && (
              <> — and {data.stats.top_protein_source} is your go-to protein</>
            )}
            .
          </p>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-faint">
          Order history
        </h2>
        {!data || data.orders.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-line bg-card p-8 text-center">
            <p className="text-faint">No orders yet.</p>
            <Link
              to="/order"
              className="mt-4 inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-dark"
            >
              Find your first dish
            </Link>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {data.orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-line bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display font-semibold">{order.item?.name ?? "Dish"}</p>
                    <p className="mt-0.5 text-sm text-faint">
                      {order.item?.restaurant_name} ·{" "}
                      {new Date(order.ordered_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {order.item && (
                    <span className="font-semibold tabular-nums">${order.item.price.toFixed(2)}</span>
                  )}
                </div>
                {order.item && <MacroRow item={order.item} className="mt-3" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
