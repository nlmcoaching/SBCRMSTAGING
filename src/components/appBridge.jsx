import React from "react";

const components = {};
export const setAppComponents = (next) => Object.assign(components, next);
export function AppComponent({ name, ...props }) {
  const Component = components[name];
  if (!Component) {
    if (import.meta.env.DEV) {
      console.warn(`[appBridge] No component registered for "${name}"`);
    }
    return null;
  }
  return <Component {...props} />;
}
