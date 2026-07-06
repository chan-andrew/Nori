import { createContext, useContext, useState } from "react";
import { api } from "../lib/api.js";

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [queryText, setQueryText] = useState("");
  const [filters, setFilters] = useState(null);
  const [results, setResults] = useState(null);

  async function runSearch(text, parsedFilters) {
    setQueryText(text);
    setFilters(parsedFilters);
    const { results: ranked } = await api.search(parsedFilters);
    setResults(ranked);
    return ranked;
  }

  async function refine(nextFilters) {
    setFilters(nextFilters);
    const { results: ranked } = await api.refine(nextFilters);
    setResults(ranked);
    return ranked;
  }

  function reset() {
    setQueryText("");
    setFilters(null);
    setResults(null);
  }

  return (
    <SearchContext.Provider value={{ queryText, filters, results, runSearch, refine, reset }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
