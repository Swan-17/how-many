/* Final Stats/map presentation fix. Loaded last so it only owns map presentation. */
(function () {
  const $ = id => document.getElementById(id);

  function install() {
    const style = $('stats-map-final-style') || document.createElement('style');
    style.id = 'stats-map-final-style';
    style.textContent = `
      /* Restrained map presentation with a sleek gold location pin. */
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
        display:block !important;
        box-sizing:border-box !important;
        background:linear-gradient(145deg,#ffe08a 0%,#f4bd3f 48%,#c78a16 100%) !important;
        border:2.5px solid rgba(255,255,255,.96) !important;
        box-shadow:0 3px 8px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.28) !important;
      }
      .top-venue-marker span {
        display:none !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  install();
})();
