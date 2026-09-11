/* Final Stats/map presentation fix. Loaded last so it only owns map presentation. */
(function () {
  const $ = id => document.getElementById(id);

  function install() {
    const style = $('stats-map-final-style') || document.createElement('style');
    style.id = 'stats-map-final-style';
    style.textContent = `
      /* Restrained, neutral map presentation. */
      #top-venues-map .maplibregl-canvas {
        filter: grayscale(.72) saturate(.42) contrast(1.03) brightness(.95);
      }
      .top-venue-marker-wrap { width:34px !important; height:34px !important; }
      .top-venue-marker {
        width:28px !important;
        height:28px !important;
        background:#334155 !important;
        border:2px solid rgba(248,250,252,.94) !important;
        box-shadow:0 2px 6px rgba(0,0,0,.42) !important;
      }
      .top-venue-marker span {
        font-size:0 !important;
        width:8px !important;
        height:8px !important;
        border-radius:50%;
        background:#f8fafc;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  install();
})();
