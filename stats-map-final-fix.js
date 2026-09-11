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

      /* Clean, true teardrop pin. The marker box is the same height as the pin so
         MapLibre's bottom anchor stays exactly on the stored latitude/longitude. */
      .quality-beer-marker {
        width:40px !important;
        height:40px !important;
        position:relative !important;
        cursor:pointer !important;
        filter:drop-shadow(0 2px 4px rgba(0,0,0,.24)) !important;
      }
      .quality-beer-marker::after {
        content:"" !important;
        display:block !important;
        position:absolute !important;
        left:2px !important;
        top:0 !important;
        width:36px !important;
        height:40px !important;
        background:rgba(255,255,255,.98) !important;
        clip-path:polygon(50% 100%,42% 89%,31% 77%,20% 65%,11% 52%,5% 39%,2% 27%,4% 17%,10% 9%,19% 3%,31% 0,50% 0,69% 0,81% 3%,90% 9%,96% 17%,98% 27%,95% 39%,89% 52%,80% 65%,69% 77%,58% 89%) !important;
        z-index:1 !important;
      }
      .quality-beer-marker::before {
        content:"" !important;
        position:absolute !important;
        left:4px !important;
        top:1px !important;
        width:32px !important;
        height:36px !important;
        background:linear-gradient(145deg,#ffe49a 0%,#f3bd43 52%,#c78916 100%) !important;
        clip-path:polygon(50% 100%,42% 89%,31% 77%,20% 65%,11% 52%,5% 39%,2% 27%,4% 17%,10% 9%,19% 3%,31% 0,50% 0,69% 0,81% 3%,90% 9%,96% 17%,98% 27%,95% 39%,89% 52%,80% 65%,69% 77%,58% 89%) !important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.34) !important;
        z-index:2 !important;
      }

      /* Compact pint, fully inside the pin: no handle or protruding line. */
      .quality-beer-marker .mug {
        display:block !important;
        position:absolute !important;
        left:13px !important;
        top:10px !important;
        width:14px !important;
        height:18px !important;
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
        top:-4px !important;
        width:14px !important;
        height:5px !important;
        background:#fff !important;
        border:1.5px solid #fff !important;
        border-radius:5px 5px 2px 2px !important;
        box-sizing:border-box !important;
      }
      .quality-beer-marker .mug::after {
        display:none !important;
        content:none !important;
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
