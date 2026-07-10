import React from "react";

const components = {};
export const setAppComponents = (next) => Object.assign(components, next);
export function AppComponent({ name, ...props }) {
  const Component = components[name];
  return Component ? <Component {...props} /> : null;
}
