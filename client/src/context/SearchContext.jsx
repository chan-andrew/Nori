import { createContext, useContext, useState } from "react";
import { api } from "../lib/api.js";

// Location is captured right after the text prompt and kept for the session
// (sessionStorage) so repeat searches skip the step. Distance and delivery
// time on result cards can't render without it.

const SearchContext = createContext(null);

function loadSessionLocation() {
  try {
    return JSON.parse(sessionStorage.getItem("nori_location")) ?? null;
  } catch {
    return null;
  }
}

export function SearchProvider({ children }) {
  const [queryText, setQueryText] = useState("");
  const [filters, setFilters] = useState(null);
  const [results, setResults] = useState(null);
  const [widened, setWidened] = useState(false);
  const [queryLogId, setQueryLogId] = useState(null);
  const [location, setLocationState] = useState(loadSessionLocation);
  // A parsed query waiting on the location step before it can run.
  const [pending, setPending] = useState(null);

  function setLocation(next) {
    setLocationState(next);
    if (next) sessionStorage.setItem("nori_location", JSON.stringify(next));
    else sessionStorage.removeItem("nori_location");
  }

  async function runSearch(text, parsedFilters, loc = location, logId = queryLogId) {
    setQueryText(text);
    setFilters(parsedFilters);
    setQueryLogId(logId);
    const { results: ranked, widened: w } = await api.search(parsedFilters, loc);
    setResults(ranked);
    setWidened(Boolean(w));
    setPending(null);
    return ranked;
  }

  async function refine(nextFilters) {
    setFilters(nextFilters);
    const { results: ranked, widened: w } = await api.refine(nextFilters, location);
    setResults(ranked);
    setWidened(Boolean(w));
    return ranked;
  }

  function reset() {
    setQueryText("");
    setFilters(null);
    setResults(null);
    setWidened(false);
    setQueryLogId(null);
    setPending(null);
  }

  return (
    <SearchContext.Provider
      value={{
        queryText, filters, results, widened, queryLogId,
        location, setLocation, pending, setPending,
        runSearch, refine, reset,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
