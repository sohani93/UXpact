// Shared client-side navigation helper. The app has no router dependency —
// App.tsx already drives routing off window.location + popstate, so every
// place that needs to change the URL (bottom nav, old-link redirects, the
// post-submit handoff into the workspace) goes through this one function.
export function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
