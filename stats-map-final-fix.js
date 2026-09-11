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

      /* Plain, upright gold map pin. The marker box is fixed and transparent;
         MapLibre's anchor:'bottom' therefore puts the exact tip on the address. */
      .quality-beer-marker {
        position:relative !important;
        width:56px !important;
        height:68px !important;
        min-width:56px !important;
        min-height:68px !important;
        display:block !important;
        margin:0 !important;
        padding:0 !important;
        border:0 !important;
        outline:0 !important;
        background:transparent !important;
        box-shadow:none !important;
        border-radius:0 !important;
        cursor:pointer !important;
        box-sizing:border-box !important;
        transform:none !important;
        filter:drop-shadow(0 2px 3px rgba(0,0,0,.30)) !important;
      }

      #top-venues-quality-map .maplibregl-marker.quality-beer-marker {
        position:absolute !important;
        margin:0 !important;
        padding:0 !important;
        box-sizing:border-box !important;
      }

      /* Exactly centred on the marker box: vertical centre x=28px,
         with the single bottom point at y=68px. */
      .quality-beer-marker::before {
        content:"" !important;
        position:absolute !important;
        left:3px !important;
        top:0 !important;
        width:50px !important;
        height:68px !important;
        margin:0 !important;
        padding:0 !important;
        border:0 !important;
        background:#d4a72c !important;
        box-shadow:none !important;
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

      /* Remove the old beer/foam artwork completely. */
      .quality-beer-marker .mug,
      .quality-beer-marker .foam {
        display:none !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  install();
})();
