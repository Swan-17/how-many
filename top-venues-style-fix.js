/* Make the Top Venues heading use the same visual treatment as the other Stats card headings. */
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
      cursor: pointer;
      text-align: left;
      font-family: inherit;
    }
    #top-venues-toggle span:first-child {
      color: var(--text-muted) !important;
      font: 700 15px/1.2 inherit !important;
      text-transform: uppercase !important;
      letter-spacing: normal !important;
    }
    #top-venues-toggle span:last-child {
      color: var(--primary-color) !important;
      font-size: 14px !important;
      font-weight: 700 !important;
    }
    #top-venues-body { padding: 12px 0 0; border-top: 1px solid var(--border-color); }
  `;
  document.head.appendChild(style);

  const applyTitle = () => {
    const title = document.querySelector('#top-venues-toggle span:first-child');
    if (title && title.textContent.includes('TOP VENUES')) title.textContent = 'TOP VENUES';
  };

  applyTitle();
  const timer = setInterval(() => {
    applyTitle();
    if (document.querySelector('#top-venues-toggle span:first-child')) clearInterval(timer);
  }, 100);
  setTimeout(() => clearInterval(timer), 5000);
})();
