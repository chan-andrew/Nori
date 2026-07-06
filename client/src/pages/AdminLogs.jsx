import { useEffect, useState } from "react";
import { listQueryLogs } from "../lib/data.js";

// Simple admin view for the weekly log review: every parsed query with its
// filter output and (if the user ordered) the selected dish. Misparsed
// sentences found here become new fuzzy_terms.json entries and prompt
// examples — the loop trains the prompt, never the model.
export default function AdminLogs() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listQueryLogs().then(setLogs).catch((err) => setError(err.message));
  }, []);

  function downloadCsv() {
    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["id", "timestamp", "raw_query", "parsed_filters", "selected_dish_id"].join(","),
      ...(logs ?? []).map((l) =>
        [esc(l.id), esc(l.timestamp), esc(l.raw_query), esc(JSON.stringify(l.parsed_filters)), esc(l.selected_dish_id)].join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nori-query-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="pt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Query logs
        </h1>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={!logs || logs.length === 0}
          className="text-sm font-semibold text-accent hover:text-accent-dark disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>
      <p className="mt-2 text-sm text-faint">
        Weekly review: find sentences the parser got wrong, add the missing phrase to{" "}
        <code className="rounded bg-mist px-1">fuzzy_terms.json</code>, and add an example if the
        miss repeats.
      </p>

      {error && <p role="alert" className="mt-4 text-sm font-medium text-danger">{error}</p>}

      {!logs ? (
        <p className="mt-8 text-faint">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-line bg-card p-8 text-center text-faint">
          No queries logged yet.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-medium">“{log.raw_query}”</p>
                <span className="shrink-0 text-xs tabular-nums text-faint">
                  {new Date(log.timestamp).toLocaleString(undefined, {
                    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                </span>
              </div>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-mist p-3 text-xs leading-relaxed">
                {JSON.stringify(log.parsed_filters, null, 1)}
              </pre>
              <p className="mt-2 text-xs text-faint">
                Selected dish:{" "}
                <span className={log.selected_dish_id ? "font-semibold text-ink" : ""}>
                  {log.selected_dish_id ?? "none"}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
