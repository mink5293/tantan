const $ = selector => document.querySelector(selector);
const params = new URLSearchParams(location.hash.slice(1));
let setupToken = params.get("setup");
if (location.hash) history.replaceState(null, "", location.pathname);
let next = null;
let total = 0;
let loaded = 0;
const date = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
const pageNames = { welcome: "Welcome", surprise: "Introduction", envelopes: "Envelope menu" };

async function api(data, before) {
  const response = await fetch(`/api/admin${before ? `?before=${encodeURIComponent(before)}` : ""}`, { credentials: "same-origin", cache: "no-store", ...(data ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}) });
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.error || "Please try again."); error.status = response.status; throw error; }
  return result;
}
function loginScreen() {
  $("#dashboard").hidden = true;
  $("#visits").replaceChildren(); // Don't leave coordinates in the DOM after sign-out.
  $("#auth-panel").hidden = false;
  $("#initial-status").hidden = true;
  $("#confirm-group").hidden = !setupToken;
  $("#confirm-password").required = Boolean(setupToken);
  $("#password").autocomplete = setupToken ? "new-password" : "current-password";
  $("#auth-title").textContent = setupToken ? "Make this corner yours." : "Your private corner.";
  $("#auth-description").textContent = setupToken ? "Choose a private admin password of at least 12 characters. This setup link works once." : "Sign in to see when your gift was opened and any location a visitor chose to share.";
  $("#auth-submit").textContent = setupToken ? "Set password & continue" : "Sign in";
}
function label(page) { return pageNames[page] || `Letter ${page.split("/")[1] || ""}`; }
function locationLabel(location) { return location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : "Location not shared"; }
function cell(row, title, text) { const td = document.createElement("td"); td.dataset.label = title; if (text) td.textContent = text; row.append(td); return td; }
function row(visit) {
  const tr = document.createElement("tr");
  const opened = cell(tr, "Opened");
  const time = document.createElement("time"); time.dateTime = new Date(visit.openedAt).toISOString(); time.textContent = date.format(visit.openedAt); opened.append(time);
  cell(tr, "Entry page", label(visit.page));
  const place = cell(tr, "Shared location", locationLabel(visit.location));
  if (visit.location) {
    const detail = document.createElement("small"); detail.textContent = `Browser accuracy: ±${visit.location.accuracy.toLocaleString()} m`;
    const map = document.createElement("a"); map.className = "map-link"; map.textContent = "View on map ↗"; map.target = "_blank"; map.rel = "noopener noreferrer"; map.referrerPolicy = "no-referrer";
    map.href = `https://www.openstreetmap.org/?mlat=${visit.location.latitude}&mlon=${visit.location.longitude}#map=16/${visit.location.latitude}/${visit.location.longitude}`;
    place.append(detail, map);
  }
  const action = cell(tr, "");
  const remove = document.createElement("button"); remove.type = "button"; remove.className = "delete-visit"; remove.textContent = "Delete"; remove.setAttribute("aria-label", `Delete visit from ${date.format(visit.openedAt)}`);
  remove.addEventListener("click", async () => {
    if (!confirm("Delete this visit and any shared location? This cannot be undone.")) return;
    remove.disabled = true;
    try { await api({ action: "delete", key: visit.key }); await load(); }
    catch (error) { $("#dashboard-status").textContent = error.message; remove.disabled = false; }
  });
  action.append(remove);
  return tr;
}
async function load(append = false) {
  $("#refresh").disabled = true; $("#load-more").disabled = true;
  try {
    const data = await api(null, append ? next : null);
    $("#initial-status").hidden = true; $("#auth-panel").hidden = true; $("#dashboard").hidden = false;
    $("#dashboard-status").textContent = "";
    if (!append) {
      $("#visits").replaceChildren(); loaded = 0;
      const latest = data.visits[0];
      $("#last-opened").textContent = latest ? date.format(latest.openedAt) : "No visits yet";
      $("#last-page").textContent = latest ? label(latest.page) : "New visits will appear here";
      $("#last-location").textContent = latest ? locationLabel(latest.location) : "—";
      $("#last-accuracy").textContent = latest?.location ? `Browser accuracy: ±${latest.location.accuracy.toLocaleString()} m` : "Shared only with permission";
    }
    data.visits.forEach(visit => $("#visits").append(row(visit)));
    loaded += data.visits.length; total = data.total; next = data.next;
    $("#visit-total").textContent = total.toLocaleString();
    $("#loaded-count").textContent = total ? `Showing ${loaded} of ${total}` : "";
    $("#empty-state").hidden = total > 0;
    $(".table-scroll").hidden = total === 0;
    $("#load-more").hidden = !next;
  } catch (error) {
    if (error.status === 401) loginScreen();
    else { $("#initial-status").hidden = true; if ($("#dashboard").hidden) loginScreen(); $("#dashboard-status").textContent = error.message; $("#auth-status").textContent = error.message; }
  } finally { $("#refresh").disabled = false; $("#load-more").disabled = false; }
}
$("#auth-form").addEventListener("submit", async event => {
  event.preventDefault();
  const password = $("#password").value;
  if (setupToken && password !== $("#confirm-password").value) { $("#auth-status").textContent = "The passwords don’t match."; return; }
  $("#auth-submit").disabled = true; $("#auth-status").textContent = "Signing in…";
  try {
    await api({ action: setupToken ? "setup" : "login", password, ...(setupToken ? { setupToken } : {}) });
    setupToken = null; $("#auth-form").reset(); $("#auth-status").textContent = ""; await load();
  } catch (error) {
    $("#auth-status").textContent = error.message;
    if (error.status === 409) { setupToken = null; loginScreen(); }
  } finally { $("#auth-submit").disabled = false; }
});
$("#refresh").addEventListener("click", () => load());
$("#load-more").addEventListener("click", () => load(true));
$("#logout").addEventListener("click", async () => {
  try { await api({ action: "logout" }); $("#auth-form").reset(); $("#password-form").reset(); loginScreen(); }
  catch (error) { if (error.status === 401) loginScreen(); else $("#dashboard-status").textContent = error.message; }
});
$("#password-form").addEventListener("submit", async event => {
  event.preventDefault();
  if ($("#new-password").value !== $("#new-password-confirm").value) { $("#password-status").textContent = "The new passwords don’t match."; return; }
  const button = event.currentTarget.querySelector("button"); button.disabled = true;
  try {
    await api({ action: "password", currentPassword: $("#current-password").value, password: $("#new-password").value });
    $("#password-form").reset(); $("#password-status").textContent = "Password updated. Other sessions have been signed out.";
  } catch (error) { $("#password-status").textContent = error.message; }
  finally { button.disabled = false; }
});
// Revalidate when returning to the tab; this also handles logout in another tab.
document.addEventListener("visibilitychange", () => { if (!document.hidden && !$("#dashboard").hidden) load(); });
if (setupToken) loginScreen(); else load();
