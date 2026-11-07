const paths = {
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  refresh:'<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',

  down:'<path d="m6 9 6 6 6-6"/>',
  edit:'<path d="m15 4 5 5-10 10-6 1 1-6Z"/><path d="m13 6 5 5"/>',
  sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5" fill="currentColor"/><circle cx="15" cy="17" r="2.5" fill="currentColor"/>',
  map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16"/>',
  people:'<circle cx="8" cy="7" r="3"/><path d="M2 21v-3a6 6 0 0 1 12 0v3m2-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 4 5v2"/>',
  music:'<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="18" cy="16" rx="3" ry="2.5"/>',
  camera:'<path d="M3 7h4l2-3h6l2 3h4v14H3Z"/><circle cx="12" cy="13" r="4"/>',
  crosshair:'<circle cx="12" cy="12" r="7"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  tree:'<path d="m12 2-7 9h4l-6 8h18l-6-8h4Zm0 17v4"/>',
  beach:'<path d="M2 21c3-3 5 3 8 0s5 3 8 0 4 0 4 0M12 18l3-12M5 8c5-9 14-7 17 0Z"/>',
  cup:'<path d="M4 7h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm13 1h2a3 3 0 0 1 0 6h-2M7 2v2m5-2v2"/>',
  stars:'<path d="m12 2 2.6 6.5L22 11l-7.4 2.5L12 21l-2.6-7.5L2 11l7.4-2.5ZM20 2v4m-2-2h4"/>',
  house:'<path d="m2 11 10-9 10 9M5 9v13h14V9M9 22v-8h6v8"/>',
  snow:'<path d="M12 2v20M3 7l18 10M3 17 21 7M9 3l3 3 3-3M9 21l3-3 3 3"/>',
  flower:'<path d="M12 13c-7 5-12-3-5-5-5-7 5-10 5-3 4-7 11-2 6 3 8 3 3 10-3 6m-3-1v9m0-3 5-2"/><circle cx="12" cy="10" r="3"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M3 16v5h18v-5"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M3 16v5h18v-5"/>',
  send:'<path d="m2 3 20 9-20 9 4-9Zm4 9h16"/>',

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
  (paths[name] || paths[({leaf:'tree',coffee:'cup',moon:'stars',home:'house',sparkle:'flower',check:'heart',plus:'arrow',refresh:'crosshair'})[name]] || paths.heart) +
  "</svg>";
export function installIcons() {
  document
    .querySelectorAll("[data-icon]")
    .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
}
