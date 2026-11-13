import { useCallback, useEffect, useState } from "react";
import HomePage from "./pages/HomePage.jsx";
import ResultsPage from "./pages/ResultsPage.jsx";
import TeamPage from "./pages/TeamPage.jsx";

// Three screens and no router library. The address carries the search, so a
// results page can be shared, reloaded and left with the back button.
//   /                 home
//   /?q=sentence      results for a sentence, read by the parser
//   /?f={filters}     results for fields filled in by hand, no parsing
//   /team             what guests ask for, for the villa team
function readRoute() {
  const params = new URLSearchParams(window.location.search);
  if (window.location.pathname.replace(/\/+$/, "") === "/team") return { page: "team" };
  if (params.has("f")) {
    try {
      return { page: "results", filters: JSON.parse(params.get("f")), query: "" };
    } catch {
      return { page: "home" };
    }
  }
  if (params.has("q")) return { page: "results", query: params.get("q"), filters: null };
  return { page: "home" };
}

export function addressFor({ query, filters }) {
  if (filters) return `/?f=${encodeURIComponent(JSON.stringify(filters))}`;
  return `/?q=${encodeURIComponent(query || "")}`;
}

export default function App() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((address) => {
    window.history.pushState(null, "", address);
    setRoute(readRoute());
    window.scrollTo(0, 0);
  }, []);

  // Searches made on the results page update the address without a new page
  const remember = useCallback((search) => {
    window.history.replaceState(null, "", addressFor(search));
  }, []);

  if (route.page === "team") return <TeamPage onHome={() => go("/")} />;
  if (route.page === "results") {
    return (
      <ResultsPage
        key={`${route.query}|${JSON.stringify(route.filters)}`}
        initialQuery={route.query}
        initialFilters={route.filters}
        onHome={() => go("/")}
        onRemember={remember}
      />
    );
  }
  return <HomePage onSearch={(search) => go(addressFor(search))} onTeam={() => go("/team")} />;
}
