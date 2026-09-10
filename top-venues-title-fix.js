/* Enforce the same Stats heading treatment for Top Venues. */
(function () {
  function apply() {
    const toggle = document.getElementById('top-venues-toggle');
    const title = toggle?.querySelector('span:first-child');
    if (!title) return false;
    title.classList.add('top-venues-title');
    title.textContent = 'TOP VENUES';
    title.style.margin = '0';
    title.style.color = 'var(--text-muted)';
    title.style.fontSize = '15px';
    title.style.fontWeight = '700';
    title.style.lineHeight = '1.2';
    title.style.textTransform = 'uppercase';
    title.style.letterSpacing = 'normal';
    title.style.textAlign = 'left';
    return true;
  }

  const timer = setInterval(() => {
    if (apply()) clearInterval(timer);
  }, 100);
  setTimeout(() => clearInterval(timer), 20000);
  apply();
})();
