/* Final Stats/map presentation fix. Loaded last so it only owns map presentation. */
(function () {
  const $ = id => document.getElementById(id);

  function install() {
    const style = $('stats-map-final-style') || document.createElement('style');
    style.id = 'stats-map-final-style';
    style.textContent = `
      /* Restrained map presentation with a sleek beer venue pin. */
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
        position:relative !important;
        display:block !important;
        width:12px !important;
        height:15px !important;
        margin:0 !important;
        font-size:0 !important;
        line-height:0 !important;
        border:1.6px solid rgba(255,255,255,.98) !important;
        border-top:0 !important;
        border-radius:0 0 3px 3px !important;
        background:linear-gradient(to bottom,#fbbf24 0%,#f59e0b 100%) !important;
        box-sizing:border-box !important;
        transform:rotate(45deg) !important;
        box-shadow:inset 0 0 0 1px rgba(120,53,15,.18) !important;
      }
      .top-venue-marker span::before {
        content:"" !important;
        position:absolute !important;
        left:-1.6px !important;
        top:-3px !important;
        width:12px !important;
        height:4px !important;
        border-radius:3px 3px 1px 1px !important;
        background:#fff !important;
        box-shadow:0 0 0 1px rgba(255,255,255,.25) !important;
      }
      .top-venue-marker span::after {
        content:"" !important;
        position:absolute !important;
        right:-4px !important;
        top:2px !important;
        width:4px !important;
        height:7px !important;
        border:1.5px solid rgba(255,255,255,.98) !important;
        border-left:0 !important;
        border-radius:0 4px 4px 0 !important;
        box-sizing:border-box !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  install();
})();
