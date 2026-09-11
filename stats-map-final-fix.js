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

      /* Sleek teardrop location pin with a crisp pint integrated into the centre. */
      .quality-beer-marker {
        width:40px !important;
        height:44px !important;
        position:relative !important;
        cursor:pointer !important;
        filter:drop-shadow(0 3px 5px rgba(0,0,0,.26)) !important;
      }
      .quality-beer-marker::before {
        content:"" !important;
        position:absolute !important;
        left:4px !important;
        top:1px !important;
        width:32px !important;
        height:32px !important;
        border-radius:50% 50% 50% 0 !important;
        transform:rotate(-45deg) !important;
        background:linear-gradient(145deg,#ffe49a 0%,#f3bd43 52%,#c78916 100%) !important;
        border:2px solid rgba(255,255,255,.98) !important;
        box-sizing:border-box !important;
        box-shadow:0 2px 6px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.34) !important;
        z-index:1 !important;
      }
      .quality-beer-marker::after {
        display:none !important;
        content:none !important;
      }

      /* Crisp pint: clean glass outline, compact amber fill and foam. */
      .quality-beer-marker .mug {
        display:block !important;
        position:absolute !important;
        left:13px !important;
        top:9px !important;
        width:14px !important;
        height:17px !important;
        background:linear-gradient(180deg,#ffd96e 0%,#e7a92a 100%) !important;
        border:2px solid rgba(255,255,255,.99) !important;
        border-radius:2px 2px 3px 3px !important;
        box-sizing:border-box !important;
        z-index:3 !important;
        transform:none !important;
        box-shadow:0 0 0 .5px rgba(120,77,10,.22) !important;
      }
      .quality-beer-marker .mug::before {
        content:"" !important;
        display:block !important;
        position:absolute !important;
        left:-2px !important;
        top:-5px !important;
        width:14px !important;
        height:5px !important;
        background:#fff !important;
        border:1.5px solid #fff !important;
        border-radius:5px 5px 2px 2px !important;
        box-sizing:border-box !important;
      }
      /* Remove the former white handle/line on the right entirely. */
      .quality-beer-marker .mug::after {
        display:none !important;
        content:none !important;
      }
      .quality-beer-marker .foam {
        display:block !important;
        position:absolute !important;
        left:15px !important;
        top:6px !important;
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
