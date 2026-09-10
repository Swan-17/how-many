/* Match the Top Venues stats heading to the standard Stats card headings. */
(function () {
  if (document.getElementById('top-venues-heading-style-fix')) return;
  const style = document.createElement('style');
  style.id = 'top-venues-heading-style-fix';
  style.textContent = `
    #top-venues-card { padding: 18px; overflow: hidden; }
    #top-venues-toggle {
      width: 100%;
      margin: 0 0 12px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font: 700 15px inherit;
      cursor: pointer;
      text-align: left;
    }
    #top-venues-toggle span:first-child { color: var(--text-muted); }
    #top-venues-toggle span:last-child { color: var(--primary-color); font-size: 14px; }
    #top-venues-body { padding: 12px 0 0; border-top: 1px solid var(--border-color); }
  `;
  document.head.appendChild(style);
})();
