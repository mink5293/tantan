// Location is requested only by an explicit click, never on page load.
export function startActivityLog() {
  const note = document.createElement("aside");
  note.className = "privacy-note";
  note.setAttribute("aria-label", "Visit privacy");
  note.innerHTML = `<div><strong>A small privacy note</strong><p class="privacy-copy">The time you open this gift is saved privately for the sender. You can also choose to share your location for this visit. Location sharing is optional; records expire after 30 days.</p><p class="privacy-status" role="status"></p></div><div class="privacy-actions"><button type="button" data-privacy="share">Share location</button><button type="button" data-privacy="dismiss">Not now</button><button type="button" data-privacy="remove" hidden>Remove shared location</button><button type="button" data-privacy="details" hidden>Location & privacy</button></div>`;
  document.body.append(note);
  const status = note.querySelector(".privacy-status");
  const copy = note.querySelector(".privacy-copy");
  const button = action => note.querySelector(`[data-privacy="${action}"]`);
  let receipt = null;
  let ignored = false;
  let shared = false;
  let busy = false;
  const ready = send({ page: location.hash.slice(1) || "welcome" }).then(result => {
    receipt = result.visitToken;
    ignored = Boolean(result.ignored);
    if (ignored) note.remove();
  }).catch(() => { /* Logging must never block the gift. */ });

  async function send(payload) {
    const response = await fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "same-origin", keepalive: true });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Location sharing is temporarily unavailable.");
    return result;
  }
  function display(message, compact = false) {
    status.textContent = message;
    copy.hidden = compact;
    button("share").hidden = compact || shared;
    button("dismiss").hidden = compact;
    button("details").hidden = !compact;
    button("remove").hidden = !shared;
  }
  function lock(value) {
    busy = value;
    note.querySelectorAll("button").forEach(item => { item.disabled = value; });
  }
  note.addEventListener("click", async event => {
    const action = event.target.closest("button")?.dataset.privacy;
    if (!action || busy) return;
    if (action === "dismiss") { display(shared ? "Location shared for this visit." : "Location not shared.", true); return; }
    if (action === "details") {
      display(shared ? "You can remove the location shared during this visit." : "Sharing is optional. You can open every letter without it.");
      return;
    }
    lock(true);
    try {
      if (action === "share") {
        if (!window.isSecureContext || !navigator.geolocation) throw new Error("This browser can’t share location. You can still enjoy the gift.");
        status.textContent = "Waiting for your browser’s location permission…";
        // This is the only call to geolocation, inside this explicit click handler.
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
        await ready;
        if (!receipt || ignored) throw new Error("Location sharing is temporarily unavailable. Please try again after refreshing.");
        await send({ visitToken: receipt, consent: "share", location: { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: position.timestamp } });
        shared = true;
        display(`Location shared for this visit (accuracy about ${Math.round(position.coords.accuracy)} m).`, true);
      } else if (action === "remove") {
        await send({ visitToken: receipt, consent: "withdraw" });
        shared = false;
        display("Your shared location has been removed.", true);
      }
    } catch (error) {
      display(error.code === 1 ? "Location not shared. You can keep enjoying the gift." : error.code === 2 || error.code === 3 ? "Your browser couldn’t find a location. Nothing was shared." : error.message, true);
    } finally { lock(false); }
  });
}
