/* Final Stats/map presentation fix. Loaded last so it only owns map presentation. */
(function () {
  const $ = id => document.getElementById(id);

  function install() {
    const style = $('stats-map-final-style') || document.createElement('style');
    style.id = 'stats-map-final-style';
    style.textContent = `
      /* Restrained map presentation with a clearer beer venue pin. */
      #top-venues-map .maplibregl-canvas {
        filter: grayscale(.72) saturate(.42) contrast(1.03) brightness(.95);
      }
      .top-venue-marker-wrap {
        width:40px !important;
        height:40px !important;
      }
      .top-venue-marker {
        width:32px !important;
        height:32px !important;
        border-radius:50% 50% 50% 7px !important;
        transform:rotate(-45deg) !important;
        display:grid !important;
        place-items:center !important;
        box-sizing:border-box !important;
        background:linear-gradient(145deg,#ffd166 0%,#f59e0b 58%,#b45309 100%) !important;
        border:2.5px solid rgba(255,255,255,.96) !important;
        box-shadow:0 3px 8px rgba(0,0,0,.34) !important;
      }
      .top-venue-marker span {
        transform:rotate(45deg) !important;
        font-size:16px !important;
        line-height:1 !important;
        width:auto !important;
        height:auto !important;
        border-radius:0 !important;
        background:transparent !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  install();
})();
