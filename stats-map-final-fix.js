/* Final Stats/map presentation fix. Loaded last so it only owns map presentation. */
(function () {
  const $ = id => document.getElementById(id);

  function install() {
    const style = $('stats-map-final-style') || document.createElement('style');
    style.id = 'stats-map-final-style';
    style.textContent = `
      /* Final presentation override for the actual Top Venues map markers. */
      #top-venues-map .maplibregl-canvas {
        filter: grayscale(.72) saturate(.42) contrast(1.03) brightness(.95);
      }

      /* Original Top Venues marker. */
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
        box-shadow:0 3px 8px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.28) !important;
      }
      .top-venue-marker span {
        display:none !important;
      }

      /* Actual map implementation uses .quality-beer-marker. Remove its beer/mug
         treatment and replace it with the same sleek gold location pin. */
      .quality-beer-marker {
        width:40px !important;
        height:40px !important;
        position:relative !important;
        cursor:pointer !important;
        filter:drop-shadow(0 3px 6px rgba(0,0,0,.28)) !important;
      }
      .quality-beer-marker::before {
        content:"" !important;
        position:absolute !important;
        left:4px !important;
        top:2px !important;
        width:32px !important;
        height:32px !important;
        border-radius:50% 50% 50% 7px !important;
        transform:rotate(-45deg) !important;
        background:linear-gradient(145deg,#ffe08a 0%,#f4bd3f 48%,#c78a16 100%) !important;
        border:2.5px solid rgba(255,255,255,.96) !important;
        box-sizing:border-box !important;
        box-shadow:0 3px 8px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.28) !important;
        z-index:1 !important;
      }
      .quality-beer-marker::after {
        display:none !important;
        content:none !important;
      }
      .quality-beer-marker .mug,
      .quality-beer-marker .foam,
      .quality-beer-marker .mug::before,
      .quality-beer-marker .mug::after {
        display:none !important;
        content:none !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  install();
})();
