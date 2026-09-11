/* Final Stats/map presentation fix. Loaded last so it only owns map presentation. */
(function () {
  const $ = id => document.getElementById(id);

  function install() {
    const style = $('stats-map-final-style') || document.createElement('style');
    style.id = 'stats-map-final-style';
    style.textContent = `
      #top-venues-map .maplibregl-canvas {
        filter: grayscale(.72) saturate(.42) contrast(1.03) brightness(.95);
      }

      /* Simple, upright map pin. Keep the marker box fixed so MapLibre's
         anchor:'bottom' puts the exact centre of the tip on the coordinate. */
      .quality-beer-marker {
        width:56px !important;
        height:68px !important;
        min-width:56px !important;
        min-height:68px !important;
        display:block !important;
        cursor:pointer !important;
        box-sizing:border-box !important;
        filter:drop-shadow(0 2px 3px rgba(0,0,0,.30)) !important;
      }

      #top-venues-quality-map .maplibregl-marker.quality-beer-marker {
        position:absolute !important;
        margin:0 !important;
        padding:0 !important;
        box-sizing:border-box !important;
      }

      /* Symmetrical blue teardrop: no rotation, no diagonal edges. */
      .quality-beer-marker::before {
        content:"" !important;
        position:absolute !important;
        left:3px !important;
        top:0 !important;
        width:50px !important;
        height:68px !important;
        background:#1677a8 !important;
        clip-path:polygon(
          50% 100%,
          42% 88%, 31% 76%, 20% 63%, 12% 50%,
          7% 38%, 6% 27%, 9% 18%, 16% 10%,
          27% 4%, 38% 1%, 50% 0,
          62% 1%, 73% 4%, 84% 10%, 91% 18%,
          94% 27%, 93% 38%, 88% 50%,
          80% 63%, 69% 76%, 58% 88%
        ) !important;
        z-index:1 !important;
      }

      /* Straight, centred pint. The glass has no transform, so its vertical
         centre line stays exactly aligned with the pin's vertical centre. */
      .quality-beer-marker .mug {
        display:block !important;
        position:absolute !important;
        left:19px !important;
        top:19px !important;
        width:18px !important;
        height:26px !important;
        background:#f7b936 !important;
        border:2px solid #18232d !important;
        border-radius:2px 2px 4px 4px !important;
        box-sizing:border-box !important;
        z-index:3 !important;
        transform:none !important;
        box-shadow:inset 2px 0 rgba(255,255,255,.18) !important;
      }

      .quality-beer-marker .mug::after {
        content:"" !important;
        display:block !important;
        position:absolute !important;
        right:-6px !important;
        top:5px !important;
        width:6px !important;
        height:11px !important;
        border:2px solid #18232d !important;
        border-left:0 !important;
        border-radius:0 6px 6px 0 !important;
        box-sizing:border-box !important;
        background:transparent !important;
      }

      /* Compact foam, centred over the glass. */
      .quality-beer-marker .mug::before {
        content:"" !important;
        position:absolute !important;
        left:-3px !important;
        top:-7px !important;
        width:20px !important;
        height:9px !important;
        background:#fff !important;
        border:2px solid #18232d !important;
        border-bottom:0 !important;
        border-radius:8px 8px 3px 3px !important;
        box-sizing:border-box !important;
      }

      .quality-beer-marker .foam {
        display:block !important;
        position:absolute !important;
        left:2px !important;
        top:-4px !important;
        width:11px !important;
        height:5px !important;
        border-radius:7px !important;
        background:#fff !important;
        z-index:4 !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  install();
})();
