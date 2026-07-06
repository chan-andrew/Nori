import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const inputClass =
  "mt-2 w-full rounded-xl border border-line bg-card px-4 py-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({
    allergies: "",
    diet_pattern: "none",
    default_calorie_target: "",
    default_protein_target: "",
    disliked_foods: "",
    average_budget: "",
  });

  if (!user) return <Navigate to="/signup" replace />;

  function set(key) {
    return (e) => setAnswers((a) => ({ ...a, [key]: e.target.value }));
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user: updated } = await api.updateProfile(user.id, {
        allergies: answers.allergies.trim(),
        diet_pattern: answers.diet_pattern,
        default_calorie_target: answers.default_calorie_target ? Number(answers.default_calorie_target) : null,
        default_protein_target: answers.default_protein_target ? Number(answers.default_protein_target) : null,
        disliked_foods: answers.disliked_foods.trim(),
        average_budget: answers.average_budget ? Number(answers.average_budget) : null,
        onboarding_complete: true,
      });
      setUser(updated);
      navigate("/order");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-lg pt-14">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        A few things about how you eat
      </h1>
      <p className="mt-2 text-faint">
        Every question is optional — skip anything, change it later from your profile.
      </p>

      <form onSubmit={save} className="mt-8 flex flex-col gap-7">
        <div>
          <label htmlFor="allergies" className="font-medium">
            1. Any food allergies or intolerances?
          </label>
          <input
            id="allergies"
            type="text"
            placeholder="e.g. peanuts, shellfish (comma-separated)"
            value={answers.allergies}
            onChange={set("allergies")}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="diet" className="font-medium">
            2. Any diet pattern?
          </label>
          <select id="diet" value={answers.diet_pattern} onChange={set("diet_pattern")} className={inputClass}>
            <option value="none">None</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="keto">Keto</option>
            <option value="halal">Halal</option>
            <option value="kosher">Kosher</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="calories" className="font-medium">
            3. Typical daily calorie target, if known
          </label>
          <input
            id="calories"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="e.g. 2200"
            value={answers.default_calorie_target}
            onChange={set("default_calorie_target")}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="protein" className="font-medium">
            4. Typical daily protein target, if known
          </label>
          <input
            id="protein"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="e.g. 160 (grams)"
            value={answers.default_protein_target}
            onChange={set("default_protein_target")}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="dislikes" className="font-medium">
            5. Foods you dislike or want excluded
          </label>
          <input
            id="dislikes"
            type="text"
            placeholder="e.g. mushrooms, cilantro (comma-separated)"
            value={answers.disliked_foods}
            onChange={set("disliked_foods")}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="budget" className="font-medium">
            6. Usual budget per meal
          </label>
          <input
            id="budget"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="e.g. 18 (dollars)"
            value={answers.average_budget}
            onChange={set("average_budget")}
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-danger">{error}</p>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-accent px-8 py-3 font-semibold text-on-accent transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save & start searching"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/order")}
            className="text-sm font-semibold text-faint hover:text-ink"
          >
            Skip for now
          </button>
        </div>
      </form>
    </section>
  );
}
