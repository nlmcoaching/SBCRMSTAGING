import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { C } from "../../lib/theme.js";
import { Section } from "../section";
import { Today } from "../today";
import { FollowUpEngine } from "../followup";

/**
 * Owns page search query so keystrokes re-render only this subtree (not App/sidebar).
 * Render-prop API: children({ searchInput, content, localGo }).
 */
export function SearchScope({ section, view, setView, onOpen, onGo, children }) {
  const [query, setQuery] = useState("");
  useEffect(() => { setQuery(""); }, [section]);

  const localGo = (id, v = 0) => {
    setQuery("");
    onGo(id, v);
  };

  const searchInput = (section !== "today" && !(section === "sessions" && view === 0)) ? (
    <div className="sb-search">
      <Search size={15} color={C.ink3} />
      <input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
    </div>
  ) : null;

  const content = section === "today"
    ? <Today onOpen={onOpen} onGo={localGo} />
    : section === "engine"
    ? <FollowUpEngine onOpen={onOpen} />
    : <Section section={section} view={view} setView={setView} query={query} onOpen={onOpen} />;

  return children({ searchInput, content, localGo });
}
