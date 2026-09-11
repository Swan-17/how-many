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

      /* MapLibre owns the marker's position and transform. The visual pin is
         deliberately the same fixed-height box used by anchor:'bottom', so its
         sharp tip remains vertically locked to the venue coordinate. */
      .quality-beer-marker {
        width:54px !important;
        height:66px !important;
        min-width:54px !important;
        min-height:66px !important;
        display:block !important;
        cursor:pointer !important;
        box-sizing:border-box !important;
        filter:drop-shadow(0 2px 3px rgba(0,0,0,.30)) !important;
      }

      /* Critical: MapLibre must retain absolute positioning. Do not set a CSS
         transform here because MapLibre uses transform to place the marker. */
      #top-venues-quality-map .maplibregl-marker.quality-beer-marker {
        position:absolute !important;
        margin:0 !important;
        padding:0 !important;
        box-sizing:border-box !important;
      }

      /* Larger, single-colour blue Google-style location pin. */
      .quality-beer-marker::before {
        content:"" !important;
        position:absolute !important;
        left:2px !important;
        top:0 !important;
        width:50px !important;
        height:66px !important;
        background:#67c1cf !important;
        clip-path:polygon(50% 100%,43% 91%,34% 81%,25% 71%,17% 60%,10% 49%,5% 38%,3% 28%,5% 18%,11% 10%,20% 4%,32% 1%,50% 0,68% 1%,80% 4%,89% 10%,95% 18%,97% 28%,95% 38%,90% 49%,83% 60%,75% 71%,66% 81%,57% 91%) !important;
        z-index:1 !important;
      }

      /* White inset keeps the beer icon clean and echoes the existing app's
         beer graphics rather than introducing a new visual language. */
      .quality-beer-marker::after {
        content:"" !important;
        position:absolute !important;
        left:11px !important;
        top:10px !important;
        width:32px !important;
        height:32px !important;
        border-radius:50% !important;
        background:#fff !important;
        box-shadow:0 1px 2px rgba(0,0,0,.12) !important;
        z-index:2 !important;
      }

      /* Tankard-style pint, scaled from the beer treatment already used by
         the venue marker. The handle stays inside the white circle, avoiding
         the old protruding horizontal line. */
      .quality-beer-marker .mug {
        display:block !important;
        position:absolute !important;
        left:18px !important;
        top:17px !important;
        width:18px !important;
        height:23px !important;
        background:#ffc84d !important;
        border:2px solid #1f2937 !important;
        border-radius:2px 2px 4px 4px !important;
        box-sizing:border-box !important;
        z-index:4 !important;
        transform:none !important;
        box-shadow:inset 2px 0 rgba(255,255,255,.20) !important;
      }

      /* Tankard handle: fully contained within the marker's white centre. */
      .quality-beer-marker .mug::after {
        content:"" !important;
        display:block !important;
        position:absolute !important;
        right:-7px !important;
        top:5px !important;
        width:7px !important;
        height:11px !important;
        border:2px solid #1f2937 !important;
        border-left:0 !important;
        border-radius:0 7px 7px 0 !important;
        box-sizing:border-box !important;
        background:transparent !important;
      }

      /* Foamy pint head, using the same white/outlined treatment as the app's
         existing beer marker. */
      .quality-beer-marker .mug::before {
        content:"" !important;
        position:absolute !important;
        left:-3px !important;
        top:-7px !important;
        width:20px !important;
        height:8px !important;
        background:#fff !important;
        border:2px solid #1f2937 !important;
        border-bottom:0 !important;
        border-radius:8px 8px 3px 3px !important;
        box-sizing:border-box !important;
      }

      .quality-beer-marker .foam {
        display:block !important;
        position:absolute !important;
        left:2px !important;
        top:-4px !important;
        width:12px !important;
        height:5px !important;
        border-radius:7px !important;
        background:#fff !important;
        z-index:5 !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  install();
})();
