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

      /* Simple gold upright map pin. Keep the marker box fixed so MapLibre's
         anchor:'bottom' positions the pin tip on the venue coordinate. */
      .quality-beer-marker {
        width:44px !important;
        height:54px !important;
        min-width:44px !important;
        min-height:54px !important;
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

      /* Symmetrical, vertical gold teardrop. Do not set transform on the
         MapLibre marker itself: MapLibre owns that transform for positioning. */
      .quality-beer-marker::before {
        content:"" !important;
        position:absolute !important;
        left:2px !important;
        top:0 !important;
        width:40px !important;
        height:54px !important;
        background:#d4a72c !important;
        transform:none !important;
        clip-path:polygon(
          50% 100%,
          41% 87%, 30% 74%, 20% 61%, 12% 48%,
          7% 36%, 7% 25%, 10% 17%, 17% 10%,
          28% 4%, 39% 1%, 50% 0,
          61% 1%, 72% 4%, 83% 10%, 90% 17%,
          93% 25%, 93% 36%, 88% 48%,
          80% 61%, 70% 74%, 59% 87%
        ) !important;
        z-index:1 !important;
      }

      .quality-beer-marker::after {
        display:none !important;
        content:none !important;
      }

      .quality-beer-marker .mug,
      .quality-beer-marker .foam {
        display:none !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  install();
})();
