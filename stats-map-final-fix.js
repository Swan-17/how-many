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

      /* Simple gold upright teardrop pin. Keep the marker box fixed so
         MapLibre's anchor:'bottom' puts the tip on the venue coordinate. */
      .quality-beer-marker {
        width:56px !important;
        height:68px !important;
        min-width:56px !important;
        min-height:68px !important;
        display:block !important;
        cursor:pointer !important;
        box-sizing:border-box !important;
        filter:drop-shadow(0 2px 3px rgba(0,0,0,.30)) !important;
      }

      #top-venues-quality-map .maplibregl-marker.quality-beer-marker {
        position:absolute !important;
        margin:0 !important;
        padding:0 !important;
        box-sizing:border-box !important;
      }

      /* Symmetrical, vertical gold teardrop. No beer graphic, rotation,
         diagonal element, or inner circle. */
      .quality-beer-marker::before {
        content:"" !important;
        position:absolute !important;
        left:3px !important;
        top:0 !important;
        width:50px !important;
        height:68px !important;
        background:#d4a72c !important;
        clip-path:polygon(
          50% 100%,
          42% 88%, 31% 76%, 20% 63%, 12% 50%,
          7% 38%, 6% 27%, 9% 18%, 16% 10%,
          27% 4%, 38% 1%, 50% 0,
          62% 1%, 73% 4%, 84% 10%, 91% 18%,
          94% 27%, 93% 38%, 88% 50%,
          80% 63%, 69% 76%, 58% 88%
        ) !important;
        z-index:1 !important;
      }

      .quality-beer-marker .mug,
      .quality-beer-marker .foam {
        display:none !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  install();
})();
