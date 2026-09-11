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

      /* Google Maps-inspired location marker: the element itself is exactly the
         same height as the visible pin, so MapLibre's bottom anchor is the tip. */
      .quality-beer-marker {
        width:44px !important;
        height:52px !important;
        min-width:44px !important;
        min-height:52px !important;
        position:relative !important;
        display:block !important;
        cursor:pointer !important;
        box-sizing:border-box !important;
        filter:drop-shadow(0 2px 3px rgba(0,0,0,.28)) !important;
      }

      /* Solid gold pin silhouette with a deliberately sharp bottom point. */
      .quality-beer-marker::before {
        content:"" !important;
        position:absolute !important;
        left:2px !important;
        top:0 !important;
        width:40px !important;
        height:52px !important;
        background:linear-gradient(145deg,#ffd96a 0%,#f2b72f 55%,#d08a12 100%) !important;
        clip-path:polygon(50% 100%,42% 89%,31% 77%,20% 65%,11% 52%,5% 39%,2% 28%,4% 18%,10% 10%,19% 4%,31% 1%,50% 0,69% 1%,81% 4%,90% 10%,96% 18%,98% 28%,95% 39%,89% 52%,80% 65%,69% 77%,58% 89%) !important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.28) !important;
        z-index:1 !important;
      }

      /* Clean white Google-style centre, fully inside the gold pin. */
      .quality-beer-marker::after {
        content:"" !important;
        display:block !important;
        position:absolute !important;
        left:9px !important;
        top:8px !important;
        width:26px !important;
        height:26px !important;
        border-radius:50% !important;
        background:#fff !important;
        box-shadow:0 1px 2px rgba(0,0,0,.10) !important;
        z-index:2 !important;
      }

      /* Refined pint: simple, recognisable and completely contained. */
      .quality-beer-marker .mug {
        display:block !important;
        position:absolute !important;
        left:15px !important;
        top:12px !important;
        width:14px !important;
        height:17px !important;
        background:linear-gradient(180deg,#ffd968 0%,#e7a321 100%) !important;
        border:1.7px solid #5f451b !important;
        border-radius:2px 2px 3px 3px !important;
        box-sizing:border-box !important;
        z-index:4 !important;
        transform:none !important;
        box-shadow:inset 1px 0 rgba(255,255,255,.22) !important;
      }

      /* Crisp foam head with a subtle uneven top edge. */
      .quality-beer-marker .mug::before {
        content:"" !important;
        display:block !important;
        position:absolute !important;
        left:-1.7px !important;
        top:-5px !important;
        width:14px !important;
        height:5px !important;
        background:#fff !important;
        border:1.5px solid #5f451b !important;
        border-bottom:0 !important;
        border-radius:5px 5px 2px 2px !important;
        box-sizing:border-box !important;
      }

      /* Explicitly eliminate the old handle that caused the horizontal white line. */
      .quality-beer-marker .mug::after {
        display:none !important;
        content:none !important;
      }

      .quality-beer-marker .foam {
        display:block !important;
        position:absolute !important;
        left:1px !important;
        top:-3px !important;
        width:9px !important;
        height:3px !important;
        border-radius:5px !important;
        background:#fff !important;
        z-index:5 !important;
      }

      /* Keep the clickable marker's layout box stable at every zoom level. */
      #top-venues-quality-map .maplibregl-marker.quality-beer-marker {
        margin:0 !important;
        padding:0 !important;
        box-sizing:border-box !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  install();
})();
