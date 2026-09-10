/* Final Stats/map presentation fix. Loaded last so it wins over feature-layer state changes. */
(function () {
  const $ = id => document.getElementById(id);

  function restoreStatsView() {
    const app = $('app-screen');
    const stats = $('page-stats');
    const map = $('top-venues-map-page');
    const nav = document.querySelector('nav');
    if (!app || !stats) return;

    app.classList.remove('hidden');
    map?.classList.add('hidden');
    stats.classList.remove('hidden');
    nav?.classList.remove('hidden');
    document.querySelectorAll('nav button').forEach(button => button.classList.remove('active'));
    $('nav-stats')?.classList.add('active');
  }

  function bindBackButton() {
    const button = $('top-venues-back-stats');
    if (!button || button.__finalStatsFixBound) return;
    button.__finalStatsFixBound = true;
    button.addEventListener('click', () => {
      // The existing map handler runs first; force the final UI state after it finishes.
      requestAnimationFrame(() => requestAnimationFrame(restoreStatsView));
      setTimeout(restoreStatsView, 100);
    });
  }

  function install() {
    bindBackButton();
    if (!$('top-venues-map-page')) return;

    const style = $('stats-map-final-style') || document.createElement('style');
    style.id = 'stats-map-final-style';
    style.textContent = `
      /* Muted, professional map presentation. */
      #top-venues-map .maplibregl-canvas {
        filter: grayscale(.65) saturate(.55) contrast(1.06) brightness(.92);
      }
      .top-venue-marker-wrap { width:36px !important; height:36px !important; }
      .top-venue-marker {
        width:30px !important;
        height:30px !important;
        background:#334155 !important;
        border:2px solid rgba(248,250,252,.92) !important;
        box-shadow:0 2px 7px rgba(0,0,0,.45) !important;
      }
      .top-venue-marker span { font-size:15px !important; }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }

  const timer = setInterval(() => {
    install();
    if ($('top-venues-back-stats') && $('top-venues-map-page')) clearInterval(timer);
  }, 100);
  setTimeout(() => clearInterval(timer), 30000);
  install();
})();
