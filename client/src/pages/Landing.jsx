import { Link } from "react-router-dom";
import Reveal from "../components/Reveal.jsx";

// Marketing homepage: what Nori is and why it beats filter-menu delivery
// apps, with one primary CTA ("Order now" → /order, the text prompt screen).
// Everything reads from the shared color tokens, so dark mode comes free.

function SpeechIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MacroIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20V10M18 20V4M6 20v-4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const BENEFITS = [
  {
    icon: SpeechIcon,
    title: "Ask in your own words",
    body: "No filter menus, no checkbox maze. “High protein, low carb, under $15” is a complete search — Nori reads it the way a person would.",
  },
  {
    icon: MacroIcon,
    title: "Macros on every dish",
    body: "Every result shows estimated calories, protein, carbs, and fat, so you order to your targets instead of guessing from a menu photo.",
  },
  {
    icon: ShieldIcon,
    title: "Your rules, applied automatically",
    body: "Save allergies, dislikes, and a diet pattern once — every search respects them without you restating a thing.",
  },
];

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="pt-16 text-center sm:pt-24">
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Order delivery that fits your macros.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-faint">
          Nori turns a plain-words request — protein, calories, budget, cravings — into real
          dishes from restaurants near you. Describe the meal; Nori finds it.
        </p>
        <div className="mt-9">
          <Link
            to="/order"
            className="inline-block rounded-full bg-accent px-10 py-4 text-lg font-semibold text-on-accent transition-all hover:bg-accent-dark active:scale-[0.98]"
          >
            Order now
          </Link>
        </div>
        <p className="mt-4 text-sm text-faint">
          Free to use — just type what you're hungry for.
        </p>
      </section>

      {/* Value prop */}
      <section className="mt-20 border-t border-line pt-14 sm:mt-28">
        <p className="mx-auto max-w-2xl text-center text-xl leading-relaxed sm:text-2xl">
          <span className="font-display italic">Delivery apps show you everything.</span>{" "}
          <span className="text-faint">
            Nori shows you the dishes that actually fit your protein target, your calorie budget,
            and your wallet — ranked by how well they match.
          </span>
        </p>
      </section>

      {/* Benefits */}
      <section className="mt-16 sm:mt-20">
        <h2 className="sr-only">Why Nori</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-line bg-card p-6 transition-all hover:border-ink/30 hover:shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold leading-snug">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-faint">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mt-20 rounded-2xl bg-mist p-10 text-center sm:mt-24">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Hungry with a number in mind?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-faint">
          Tell Nori the meal you're picturing and get a ranked list of nearby dishes that fit.
        </p>
        <Link
          to="/order"
          className="mt-7 inline-block rounded-full bg-accent px-8 py-3.5 font-semibold text-on-accent transition-all hover:bg-accent-dark active:scale-[0.98]"
        >
          Order now
        </Link>
        <p className="mt-6 text-xs text-faint">
          Nutrition numbers are estimates from menu descriptions — not restaurant-verified.
        </p>
      </section>
    </div>
  );
}
