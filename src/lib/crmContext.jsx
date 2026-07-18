import React, { createContext, useContext } from "react";

/**
 * Thin CRM session context — shared App state for feature views.
 * Section / Today / FollowUpEngine read from here instead of prop-drilling
 * every new App field (the former blank-page failure mode).
 *
 * Layout/nav props (section, view, setView, query, onOpen, onGo) stay as props.
 */
const CrmContext = createContext(null);

export function CrmProvider({ value, children }) {
  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) {
    throw new Error("useCrm() must be used within <CrmProvider>");
  }
  return ctx;
}
