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

      /* Actual map implementation uses .quality-beer-marker. Keep the pin
         silhouette, but integrate a crisp pint glass into the centre. */
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
      .quality-beer-marker .mug {
        display:block !important;
        position:absolute !important;
        left:13px !important;
        top:10px !important;
        width:14px !important;
        height:17px !important;
        background:linear-gradient(180deg,#ffd76a 0%,#e7a92b 100%) !important;
        border:1.8px solid rgba(255,255,255,.98) !important;
        border-radius:2px 2px 4px 4px !important;
        box-sizing:border-box !important;
        z-index:3 !important;
        transform:none !important;
      }
      .quality-beer-marker .mug::before {
        content:"" !important;
        display:block !important;
        position:absolute !important;
        left:-2px !important;
        top:-4px !important;
        width:14px !important;
        height:5px !important;
        background:rgba(255,255,255,.98) !important;
        border:1.6px solid rgba(255,255,255,.98) !important;
        border-radius:5px 5px 2px 2px !important;
        box-sizing:border-box !important;
      }
      .quality-beer-marker .mug::after {
        content:"" !important;
        display:block !important;
        position:absolute !important;
        right:-6px !important;
        top:3px !important;
        width:6px !important;
        height:8px !important;
        border:1.8px solid rgba(255,255,255,.98) !important;
        border-left:0 !important;
        border-radius:0 5px 5px 0 !important;
        box-sizing:border-box !important;
        background:transparent !important;
      }
      .quality-beer-marker .foam {
        display:block !important;
        position:absolute !important;
        left:15px !important;
        top:7px !important;
        width:10px !important;
        height:4px !important;
        border-radius:6px !important;
        background:#fff !important;
        z-index:4 !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  install();
})();
