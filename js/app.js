import { introduction, letters, mascots } from "./content.js";

const view = document.querySelector("#view");
const pageCounter = document.querySelector("#page-counter");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const pageCount = 3 + letters.length;
let openingTimer;
let currentRoute;
let returnFocusId;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function navigationButton(text, destination, className = "text-button") {
  const button = element("button", className, text);
  button.type = "button";
  button.dataset.destination = destination;
  return button;
}

function mascot(asset, className = "") {
  const wrapper = element("span", `mascot ${className}`);
  wrapper.setAttribute("role", "img");
  wrapper.setAttribute("aria-label", asset.alt || "Your Roblox friend");
  // Sprite sheets are displayed as one frame; their source files stay untouched.
  if (asset.still) {
    const still = element("span", "mascot-still");
    still.style.backgroundImage = `url(${JSON.stringify(asset.still)})`;
    still.setAttribute("aria-hidden", "true");
    wrapper.append(still);
  }
  if (asset.image) {
    const animated = element("img", "mascot-animated");
    animated.alt = "";
    animated.width = 512;
    animated.height = 512;
    animated.decoding = "async";
    animated.dataset.animatedSource = asset.image;
    wrapper.classList.add("has-animation");
    if (asset.still) wrapper.classList.add("has-still");
    if (!motionPreference.matches || !asset.still) animated.src = asset.image;
    wrapper.append(animated);
  }
  return wrapper;
}

function flourish() {
  const wrapper = element("span", "flourish");
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.innerHTML = '<svg viewBox="0 0 250 24" fill="none"><path d="M3 16C48 3 125 3 129 13c5 13-28 9-15 1 17-10 88-11 133-1" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>';
  return wrapper;
}

function title(text, className = "") {
  const heading = element("h1", className, text);
  heading.id = "view-heading";
  heading.tabIndex = -1;
  return heading;
}

function renderIntroduction(isSurprise) {
  const content = isSurprise ? introduction.surprise : introduction.welcome;
  const section = element("section", `intro-view ${isSurprise ? "surprise-view" : "welcome-view"}`);
  section.setAttribute("aria-labelledby", "view-heading");
  const headingBlock = element("div", "intro-heading");
  headingBlock.append(element("p", "handwritten eyebrow", content.eyebrow), title(content.heading), flourish());
  const hero = element("div", "intro-hero");
  const illustration = element("div", "intro-illustration");
  illustration.append(mascot(isSurprise ? mascots.introduction : mascots.welcome, "intro-mascot"));
  const stars = element("span", "doodle-stars", "✧");
  stars.setAttribute("aria-hidden", "true");
  illustration.append(stars);
  const copy = element("div", "intro-copy");
  copy.append(element("p", "intro-description", content.description), navigationButton(content.button, isSurprise ? "envelopes" : "surprise", "stitched-button"), element("p", "intro-aside", content.aside));
  hero.append(illustration, copy);
  section.append(headingBlock, hero);
  if (isSurprise) {
    const nav = element("nav", "view-navigation intro-navigation");
    nav.setAttribute("aria-label", "Gift navigation");
    nav.append(navigationButton("← Back", "welcome"));
    section.append(nav);
  }
  return section;
}

function envelope(letter) {
  const button = element("button", "envelope-button");
  button.type = "button";
  button.dataset.letter = letter.id;
  button.setAttribute("aria-label", `Open letter ${letter.id}: ${letter.label}`);
  const body = element("span", "envelope");
  const flap = element("span", "envelope-flap");
  const seal = element("span", "heart-seal", "♥");
  seal.setAttribute("aria-hidden", "true");
  const label = element("span", "envelope-label");
  label.append(element("span", "envelope-number", letter.id), element("span", "envelope-title", letter.label));
  body.append(flap, seal, label);
  button.append(body, element("span", "envelope-action", "Open letter →"));
  return button;
}

function renderMenu() {
  const section = element("section", "menu-view");
  section.setAttribute("aria-labelledby", "view-heading");
  const header = element("div", "menu-heading");
  const headingBlock = element("div", "menu-heading-copy");
  headingBlock.append(title("Open when..."), flourish(), element("p", "menu-subtitle", "Pick whatever you need today. No wrong order."));
  header.append(mascot(mascots.menu, "menu-mascot"), headingBlock);
  const grid = element("div", "envelope-grid");
  letters.forEach((letter) => grid.append(envelope(letter)));
  const nav = element("nav", "view-navigation");
  nav.setAttribute("aria-label", "Gift navigation");
  nav.append(navigationButton("← Back", "surprise"));
  section.append(header, grid, nav);
  return section;
}

function mediaFrame(letter) {
  const figure = element("figure", `polaroid media-${letter.mediaType}`);
  const media = element(letter.mediaType === "video" ? "video" : "img", "letter-media");
  if (letter.mediaType === "video") {
    media.controls = true;
    media.preload = "metadata";
    media.playsInline = true;
    media.setAttribute("aria-label", letter.mediaAlt || letter.caption || letter.heading);
  } else {
    media.alt = letter.mediaAlt || letter.caption || letter.heading;
    media.decoding = "async";
  }
  media.src = letter.mediaSource;
  // A removed or mistyped attachment never leaves a broken image icon.
  media.addEventListener("error", () => { figure.hidden = true; }, { once: true });
  figure.append(media);
  if (letter.caption) figure.append(element("figcaption", "handwritten", letter.caption));
  return figure;
}

function renderLetter(letter) {
  const section = element("article", "letter-view");
  section.setAttribute("aria-labelledby", "view-heading");
  const header = element("div", "letter-heading");
  header.append(title(letter.heading), flourish());
  section.append(header);
  const hasMedia = Boolean(letter.mediaType && letter.mediaSource);
  const paragraphs = letter.messageParagraphs.filter((paragraph) => paragraph.trim());
  const hasMessage = paragraphs.length > 0 || Boolean(letter.signature);
  if (hasMedia || hasMessage) {
    const layout = element("div", `letter-layout ${!hasMedia || !hasMessage ? "single-column" : ""}`);
    if (hasMedia) {
      const mediaColumn = element("div", "letter-media-column");
      mediaColumn.append(mediaFrame(letter));
      if (letter.mascotImage) {
        const asset = Object.values(mascots).find((item) => item.image === letter.mascotImage) || { image: letter.mascotImage };
        mediaColumn.append(mascot(asset, "letter-mascot"));
      }
      layout.append(mediaColumn);
    }
    if (hasMessage) {
      const message = element("div", "letter-paper");
      paragraphs.forEach((paragraph) => message.append(element("p", "message-paragraph", paragraph)));
      if (letter.signature) message.append(element("p", "handwritten signature", letter.signature));
      layout.append(message);
    }
    section.append(layout);
  } else {
    section.classList.add("empty-letter");
  }
  const nav = element("nav", "view-navigation letter-navigation");
  nav.setAttribute("aria-label", "Letter navigation");
  nav.append(navigationButton("← All envelopes", "envelopes", "outline-button"));
  const index = letters.indexOf(letter);
  if (index < letters.length - 1) nav.append(navigationButton("Next letter →", `letter/${letters[index + 1].id}`, "stitched-button"));
  section.append(nav);
  return section;
}

function stopVideos() {
  view.querySelectorAll("video").forEach((video) => {
    video.pause();
    video.removeAttribute("src");
    video.load(); // Cancels outstanding media requests and releases the decoder.
  });
}

function navigate(destination) {
  if (destination === "envelopes" && currentRoute?.startsWith("letter/")) returnFocusId = currentRoute.split("/")[1];
  if (location.hash.slice(1) === destination) return;
  stopVideos();
  location.hash = destination;
}

function render() {
  clearTimeout(openingTimer);
  stopVideos();
  let route = location.hash.slice(1) || "welcome";
  const letter = letters.find((item) => route === `letter/${item.id}`);
  if (!["welcome", "surprise", "envelopes"].includes(route) && !letter) {
    route = "welcome";
    history.replaceState(null, "", `${location.pathname}${location.search}#welcome`);
  }
  let content;
  let page;
  if (letter) { content = renderLetter(letter); page = letters.indexOf(letter) + 4; }
  else if (route === "envelopes") { content = renderMenu(); page = 3; }
  else { content = renderIntroduction(route === "surprise"); page = route === "surprise" ? 2 : 1; }
  const wasRendered = currentRoute !== undefined;
  if (route === "envelopes" && currentRoute?.startsWith("letter/")) returnFocusId = currentRoute.split("/")[1];
  currentRoute = route;
  view.replaceChildren(content);
  view.dataset.route = route;
  view.classList.remove("view-enter");
  void view.offsetWidth;
  view.classList.add("view-enter");
  pageCounter.textContent = `${String(page).padStart(2, "0")} / ${String(pageCount).padStart(2, "0")}`;
  pageCounter.setAttribute("aria-label", `Page ${page} of ${pageCount}`);
  document.title = `${content.querySelector("h1").textContent} · A little something for you`;
  if (wasRendered) {
    window.scrollTo({ top: 0, behavior: "instant" });
    const focusTarget = route === "envelopes" && returnFocusId ? view.querySelector(`[data-letter="${returnFocusId}"]`) : content.querySelector("h1");
    focusTarget?.focus({ preventScroll: route !== "envelopes" });
  }
  returnFocusId = undefined;
}

view.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || view.querySelector(".is-opening")) return;
  if (button.dataset.destination) navigate(button.dataset.destination);
  if (button.dataset.letter) {
    button.classList.add("is-opening");
    openingTimer = setTimeout(() => navigate(`letter/${button.dataset.letter}`), motionPreference.matches ? 0 : 280);
  }
});

motionPreference.addEventListener("change", () => {
  view.querySelectorAll(".mascot.has-still .mascot-animated").forEach((image) => {
    if (motionPreference.matches) image.removeAttribute("src");
    else image.src = image.dataset.animatedSource;
  });
});
window.addEventListener("hashchange", render);
window.addEventListener("pagehide", stopVideos);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) view.querySelectorAll("video").forEach((video) => video.pause());
});
render();
