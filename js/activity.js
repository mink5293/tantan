// Records when the gift is opened and on which page, for the sender's private
// admin log. No location or other personal details are collected.
export function startActivityLog() {
  // Tidy up a setting left on visitors' devices by an earlier version.
  try { localStorage.removeItem("tantan-privacy-choice"); } catch { /* Not available. */ }
  fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page: location.hash.slice(1) || "welcome" }),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => { /* Logging must never block the gift. */ });
}
