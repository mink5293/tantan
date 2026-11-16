// Location is requested only by an explicit click, never on page load.
// The visitor's answer is remembered on their device, so the card pops up once.
const CHOICE_KEY = "tantan-privacy-choice";
const ENVELOPE_ICON = `<svg viewBox="0 0 48 38" fill="none" aria-hidden="true"><rect x="3" y="4" width="41" height="29" rx="3" stroke="currentColor" stroke-width="2"/><path d="m4 7 20 15L43 7M4 31l13-13m26 13L31 18" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

function savedChoice() {
  try { return localStorage.getItem(CHOICE_KEY); } catch { return null; }
}
function saveChoice(value) {
  try { localStorage.setItem(CHOICE_KEY, value); } catch { /* Private browsing: the card may show again next time. */ }
}

async function send(payload) {
  const response = await fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "same-origin", keepalive: true });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Location sharing is temporarily unavailable.");
  return result;
}

export function startActivityLog() {
  let receipt = null;
  let shared = false;
  let busy = false;

  const card = document.createElement("dialog");
  card.className = "privacy-card";
  card.setAttribute("aria-labelledby", "privacy-title");
  card.setAttribute("aria-describedby", "privacy-copy");
  card.innerHTML = `<div class="privacy-card-inner">
    <span class="privacy-seal">${ENVELOPE_ICON}</span>
    <h2 id="privacy-title" tabindex="-1" autofocus>A small privacy note</h2>
    <p id="privacy-copy" class="privacy-copy">The time you open this gift is saved privately for the sender. You can also choose to share your location for this visit. It’s completely optional, and records expire after 30 days.</p>
    <p class="privacy-status" role="status"></p>
    <div class="privacy-actions">
      <button type="button" class="stitched-button" data-privacy="share">Share location</button>
      <button type="button" class="outline-button" data-privacy="dismiss">Not now</button>
      <button type="button" class="stitched-button" data-privacy="done" hidden>Done</button>
      <button type="button" class="text-button" data-privacy="remove" hidden>Remove shared location</button>
    </div>
  </div>`;
  const status = card.querySelector(".privacy-status");
  const buttons = [...card.querySelectorAll("button")];
  const button = action => card.querySelector(`[data-privacy="${action}"]`);

  function show(message, actions, shareLabel = "Share location") {
    status.textContent = message;
    button("share").textContent = shareLabel;
    buttons.forEach(item => { item.hidden = !actions.includes(item.dataset.privacy); });
  }
  function lock(value) {
    busy = value;
    buttons.forEach(item => { item.disabled = value; });
  }
  function open() {
    if (card.open) return;
    if (shared) show("Location shared for this visit.", ["done", "remove"]);
    else show("", ["share", "dismiss"]);
    if (typeof card.showModal === "function") card.showModal();
    else card.setAttribute("open", "");
  }
  function close() {
    // Any way of closing counts as an answer, so the card won't pop up again.
    saveChoice(shared ? "shared" : savedChoice() || "declined");
    if (typeof card.close === "function") card.close();
    else card.removeAttribute("open");
  }

  // The Esc key, or a tap outside the card, closes it like "Not now".
  card.addEventListener("cancel", event => { event.preventDefault(); if (!busy) close(); });
  card.addEventListener("click", async event => {
    if (event.target === card) { if (!busy) close(); return; }
    const action = event.target.closest("button")?.dataset.privacy;
    if (!action || busy) return;
    if (action === "dismiss" || action === "done") { close(); return; }
    if (action === "share" && (!window.isSecureContext || !navigator.geolocation)) {
      show("This browser can’t share location. You can still enjoy the gift.", ["done"]);
      return;
    }
    lock(true);
    try {
      if (action === "share") {
        status.textContent = "Waiting for your browser’s location permission…";
        // This is the only call to geolocation, inside this explicit click handler.
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
        await send({ visitToken: receipt, consent: "share", location: { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: position.timestamp } });
        shared = true;
        saveChoice("shared");
        show(`Location shared for this visit (accuracy about ${Math.round(position.coords.accuracy)} m). Thank you!`, ["done", "remove"]);
      } else if (action === "remove") {
        await send({ visitToken: receipt, consent: "withdraw" });
        shared = false;
        saveChoice("declined");
        show("Your shared location has been removed.", ["done"]);
      }
    } catch (error) {
      if (error.code === 1) { saveChoice("declined"); show("Location not shared. You can keep enjoying the gift.", ["done"]); }
      else if (error.code === 2 || error.code === 3) show("Your browser couldn’t find a location. Nothing was shared.", ["share", "dismiss"], "Try again");
      else show(error.message, ["share", "dismiss"], "Try again");
    } finally { lock(false); }
  });

  send({ page: location.hash.slice(1) || "welcome" }).then(result => {
    receipt = result.visitToken;
    // The sender's own signed-in visits aren't logged, so they never see the card.
    if (result.ignored || !receipt) return;
    document.body.append(card);
    // A small, quiet way to reopen the note later, without popping up again.
    const footer = document.querySelector(".site-footer span");
    if (footer) {
      const link = document.createElement("button");
      link.type = "button";
      link.className = "privacy-link";
      link.textContent = "privacy";
      link.addEventListener("click", open);
      footer.append(" · ", link);
    }
    if (!savedChoice()) setTimeout(open, 900);
  }).catch(() => { /* Logging must never block the gift. */ });
}
