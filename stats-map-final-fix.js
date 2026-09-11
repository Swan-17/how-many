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
    document.querySelectorAll('#app-screen > *').forEach(node => {
      if (node.id !== 'top-venues-map-page' && node.id !== 'page-stats') node.classList.add('hidden');
    });
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
      // The original map handler may call switchPage(), so restore after all handlers/state updates.
      [0, 50, 150, 350, 750].forEach(delay => setTimeout(restoreStatsView, delay));
      requestAnimationFrame(() => requestAnimationFrame(restoreStatsView));
    });
  }

  function bindCaptureBackHandler() {
    if (document.__finalStatsCaptureBound) return;
    document.__finalStatsCaptureBound = true;
    document.addEventListener('click', event => {
      if (!event.target.closest('#top-venues-back-stats')) return;
      [0, 50, 150, 350, 750].forEach(delay => setTimeout(restoreStatsView, delay));
    }, true);
  }

  function bindMapStateObserver() {
    const map = $('top-venues-map-page');
    if (!map || map.__finalStatsObserverBound || !window.MutationObserver) return;
    map.__finalStatsObserverBound = true;
    const observer = new MutationObserver(() => {
      if (map.classList.contains('hidden')) {
        setTimeout(restoreStatsView, 0);
        setTimeout(restoreStatsView, 100);
      }
    });
    observer.observe(map, { attributes: true, attributeFilter: ['class'] });
  }

  function install() {
    bindBackButton();
    bindCaptureBackHandler();
    bindMapStateObserver();
    if (!$('top-venues-map-page')) return;

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

  const timer = setInterval(() => {
    install();
    if ($('top-venues-back-stats') && $('top-venues-map-page')) clearInterval(timer);
  }, 100);
  setTimeout(() => clearInterval(timer), 30000);
  install();
})();
