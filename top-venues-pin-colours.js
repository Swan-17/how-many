/* How Many Beers - ranked Top Venues map pin colours + rank badges */
(function () {
  const GOLD = '#d4af37';
  const SILVER = '#9ca3af';
  const BRONZE = '#b87333';
  const DARK_BLUE = '#123b63';

  function applyRankColours() {
    const map = document.getElementById('top-venues-quality-map');
    if (!map) return;
    const markers = [...map.querySelectorAll('.quality-beer-marker')];
    markers.forEach((marker, index) => {
      const colour = index === 0 ? GOLD : index === 1 ? SILVER : index === 2 ? BRONZE : DARK_BLUE;
      marker.style.setProperty('--top-venue-rank-colour', colour);
      if (index < 3) {
        marker.setAttribute('data-top-venue-rank', String(index + 1));
      } else {
        marker.removeAttribute('data-top-venue-rank');
      }
    });
  }

  function install() {
    if (window.__howManyTopVenuePinColours) return true;
    window.__howManyTopVenuePinColours = true;

    const style = document.createElement('style');
    style.id = 'top-venues-pin-colours-styles';
    style.textContent = `
      .quality-beer-marker::before {
        background: var(--top-venue-rank-colour, #123b63) !important;
      }
      .quality-beer-marker[data-top-venue-rank]::after {
        content: attr(data-top-venue-rank) !important;
        display: grid !important;
        place-items: center !important;
        font: 800 15px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important;
        color: #111827 !important;
        text-shadow: none !important;
      }
      .quality-beer-marker[data-top-venue-rank] .mug {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    const observer = new MutationObserver(applyRankColours);
    observer.observe(document.body, { childList: true, subtree: true });
    applyRankColours();
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
