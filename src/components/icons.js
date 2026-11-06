const paths = {
  museum:
    '<path d="M2 21h20M3.5 20.5V11a8.5 8.5 0 0 1 17 0v9.5M7 20.5V11a5 5 0 0 1 10 0v9.5M10.5 20.5v-9.3a1.5 1.5 0 0 1 3 0v9.3"/>',
  arrow: '<path d="M3 12h16m-6-6 6 6-6 6"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  volumeOff: '<path d="M3 9h4l5-4v14l-5-4H3zm13 1 5 5m0-5-5 5"/>',
  volume:
    '<path d="M3 9h4l5-4v14l-5-4H3zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.5 2.5 0 1 1 4.2 1.8c-1.1.8-2 1.3-2 2.9m0 2.9v.1"/>',
  expand: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
  heart:
    '<path d="M12 20S3 14.2 3 8.8c0-5 6.3-6.4 9-2.1 2.7-4.3 9-2.9 9 2.1 0 5.4-9 11.2-9 11.2Z"/>',
  orbit:
    '<ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)"/><circle cx="12" cy="12" r="2"/><path d="m18 4 2 1-1 2"/>',
  restart: '<path d="M4 10a8 8 0 1 1 1.4 7M4 5v5h5"/>',
  walk: '<circle cx="14" cy="4" r="2"/><path d="m6 13 3-4 3-1 3 4 4 1m-7-4-2 6 4 3 1 4m-5-7-4 6"/>',
  image:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m5 18 6-6 3 3 3-3 4 4"/>',
};
export const icon = (name) =>
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">' +
  paths[name] +
  "</svg>";
export function installIcons() {
  document
    .querySelectorAll("[data-icon]")
    .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
}
