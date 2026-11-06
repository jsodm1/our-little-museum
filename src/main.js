import "./styles/main.css";
import {
  memories,
  museumConfig,
  photoURL,
  fallbackURL,
} from "./config/museumConfig.js";
import { icon, installIcons } from "./components/icons.js";
import { makeSound } from "./components/sound.js";

const $ = (q) => document.querySelector(q),
  stage = $("#stage"),
  viewer = $("#viewer"),
  help = $("#help");
const small = matchMedia("(max-width:760px)"),
  reduced = matchMedia("(prefers-reduced-motion:reduce)");
const audio = makeSound(),
  pad = (n) => String(n).padStart(2, "0");
let tour = null,
  walking = false,
  indexMode = false,
  current = 0,
  first = 0,
  openTimer = 0,
  origin = null,
  failed = false;
installIcons();
$("#names").textContent = museumConfig.couple.map((p) => p.name).join(" & ");
function setImage(img, m) {
  img.onerror = () => {
    img.onerror = null;
    img.src = fallbackURL;
  };
  img.src = photoURL(m);
  img.alt = m.title;
}
function dateLabel(date) {
  const d = new Date(date + "T12:00:00");
  return isNaN(d.getTime())
    ? date
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(d);
}
function renderCards() {
  const size = indexMode ? memories.length : small.matches ? 2 : 4;
  first = indexMode ? 0 : Math.min(first, Math.max(0, memories.length - size));
  const visible = memories.slice(first, first + size);
  const cards = $("#cards");
  cards.replaceChildren();
  visible.forEach((memory, k) => {
    const btn = document.createElement("button"),
      fig = document.createElement("figure"),
      img = document.createElement("img"),
      num = document.createElement("span"),
      title = document.createElement("strong"),
      date = document.createElement("small");
    btn.className = "card";
    btn.type = "button";
    btn.setAttribute("aria-label", "Open " + memory.title);
    img.loading = "lazy";
    setImage(img, memory);
    // Thumbnails crop to a common contact-sheet format. In the viewer and 3D frame the entire image is visible.
    num.className = "num";
    num.textContent = pad(first + k + 1);
    fig.append(img, num);
    title.textContent = memory.title;
    date.textContent = dateLabel(memory.date);
    btn.append(fig, date, title);
    const index = first + k;
    btn.onclick = () => openMemory(index);
    cards.append(btn);
  });
  $("#range").textContent =
    pad(first + 1) +
    "–" +
    pad(first + visible.length) +
    " / " +
    pad(memories.length);
  $("#backCards").disabled = !first;
  $("#nextCards").disabled = first + size >= memories.length;
}
function selectTab(isIndex) {
  indexMode = isIndex;
  tour?.pause();
  document.body.classList.toggle("index-mode", isIndex);
  $("#indexTab").classList.toggle("selected", isIndex);
  $("#museumTab").classList.toggle("selected", !isIndex);
  $("#indexTab").setAttribute("aria-current", isIndex ? "page" : "false");
  $("#museumTab").setAttribute("aria-current", isIndex ? "false" : "page");
  first = 0;
  renderCards();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function setWalking(value) {
  walking = value;
  stage.classList.toggle("welcome", !value);
  stage.classList.toggle("exploring", value);
  $("#welcome").hidden = value;
  $(".tour-ui").hidden = !value;
  $("#room").textContent = value ? "Main gallery" : "Entrance hall";
  if (value) {
    tour?.start();
    $("#museum").focus({ preventScroll: true });
  } else tour?.reset();
}
function showMemory() {
  const m = memories[current];
  setImage($("#viewerImg"), m);
  $("#viewerTitle").textContent = m.title;
  $("#viewerDate").textContent = dateLabel(m.date);
  $("#viewerDesc").textContent = m.description;
  $("#viewerCount").textContent =
    "Memory " + pad(current + 1) + " / " + pad(memories.length);
  const finale = m.id === museumConfig.finaleId;
  $("#personal").hidden = !finale;
  $("#personal").textContent = finale ? museumConfig.personalMessage : "";
  viewer.classList.toggle("finale", finale);
  $("#previous").disabled = memories.length < 2;
  $("#next").disabled = memories.length < 2;
}
function openMemory(index) {
  clearTimeout(openTimer);
  const wasOpen = viewer.open;
  if (!wasOpen) origin = document.activeElement;
  current = (index + memories.length) % memories.length;
  audio.chime();
  if (!indexMode && tour) tour.focus(current);
  showMemory();
  if (!wasOpen) {
    openTimer = setTimeout(
      () => {
        openTimer = 0;
        if (!viewer.open) viewer.showModal();
      },
      tour && !indexMode && !reduced.matches ? 360 : 0,
    );
  }
}
function near(i) {
  const b = $("#prompt");
  b.hidden = i < 0;
  if (i >= 0) b.querySelector("span").textContent = memories[i].title;
  if (walking)
    $("#room").textContent =
      i < 0
        ? "Main gallery"
        : memories[i].id === museumConfig.finaleId
          ? "Final surprise"
          : memories[i].id === museumConfig.favoriteId
            ? "Memory wall"
            : "Main gallery";
}
function dismissLoading() {
  const el = $("#loading");
  el.style.opacity = "0";
  setTimeout(() => (el.hidden = true), 430);
}
function fallback() {
  if (failed) return;
  failed = true;
  tour = null;
  setWalking(false);
  stage.classList.add("fallback");
  $("#labels").hidden = true;
  $("#world").style.display = "none";
  stage.style.backgroundImage = 'url("' + photoURL(memories[0]) + '")';
  $("#room").textContent = "Photo gallery · 3D unavailable";
  $("#start").innerHTML = "Browse memories " + icon("arrow");
  $("#sceneType").textContent = "Photo collection";
  dismissLoading();
}
$("#start").onclick = () => {
  audio.chime();
  if (failed) selectTab(true);
  else setWalking(true);
};
$("#restart").onclick = () => {
  audio.chime();
  setWalking(false);
};
$("#affection").onclick = () => {
  audio.chime();
  tour?.affection();
};
$("#prompt").onclick = () => tour?.interact();
$("#indexTab").onclick = () => selectTab(true);
$("#museumTab").onclick = () => selectTab(false);
$(".brand").onclick = (e) => {
  e.preventDefault();
  selectTab(false);
  if (tour) setWalking(false);
};
$("#backCards").onclick = () => {
  first = Math.max(0, first - (small.matches ? 2 : 4));
  renderCards();
};
$("#nextCards").onclick = () => {
  first += small.matches ? 2 : 4;
  renderCards();
};
small.addEventListener("change", renderCards);
$("#previous").onclick = () => openMemory(current - 1);
$("#next").onclick = () => openMemory(current + 1);
$(".close-view").onclick = () => viewer.close();
viewer.addEventListener("close", () => {
  clearTimeout(openTimer);
  tour?.unfocus();
  if (origin?.isConnected) origin.focus({ preventScroll: true });
});
$("#guide").onclick = () => {
  tour?.pause();
  help.showModal();
};
document
  .querySelectorAll(".close-help")
  .forEach((b) => (b.onclick = () => help.close()));
for (const dialog of [viewer, help])
  dialog.addEventListener("click", (e) => {
    if (e.target !== dialog) return;
    const b = dialog.getBoundingClientRect();
    if (
      e.clientX < b.left ||
      e.clientX > b.right ||
      e.clientY < b.top ||
      e.clientY > b.bottom
    )
      dialog.close();
  });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && openTimer) {
    clearTimeout(openTimer);
    openTimer = 0;
    tour?.unfocus();
  }
  if (!viewer.open) return;
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    e.preventDefault();
    openMemory(current + (e.key === "ArrowRight" ? 1 : -1));
  }
});
$("#sound").onclick = async () => {
  const b = $("#sound");
  b.disabled = true;
  try {
    const on = await audio.toggle();
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", on ? "Turn sound off" : "Turn sound on");
    b.innerHTML =
      "<i>" +
      icon(on ? "volume" : "volumeOff") +
      "</i><span>Sound " +
      (on ? "on" : "off") +
      "</span>";
  } catch {
    b.title = "Audio unavailable in this browser";
  } finally {
    b.disabled = false;
  }
};
const full = $("#fullscreen");
if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen)
  full.hidden = true;
full.onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    full.hidden = true;
  }
};
document.addEventListener("fullscreenchange", () =>
  full.setAttribute(
    "aria-label",
    document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen",
  ),
);
selectTab(false);
async function init() {
  const started = performance.now();
  $("#loading progress").value = 5;
  try {
    const { createTour } = await import("./scenes/tour.js");
    tour = await createTour({
      progress: (n) => ($("#loading progress").value = n),
      near,
      open: openMemory,
      lost: fallback,
      active: () => !indexMode && !viewer.open && !help.open && !openTimer,
      compatible: () => {
        $("#sceneType").textContent = "3D compatibility mode";
      },
      hands: (on) => {
        const btn = $("#affection");
        btn.setAttribute("aria-pressed", String(on));
        btn.title = on ? "Release hands" : "Hold hands";
        btn.setAttribute("aria-label", btn.title);
      },
    });
    setTimeout(
      dismissLoading,
      Math.max(0, 500 - (performance.now() - started)),
    );
  } catch (err) {
    console.warn("3D gallery could not start:", err);
    fallback();
  }
}
init();
