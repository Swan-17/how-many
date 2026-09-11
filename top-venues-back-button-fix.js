/* Give the Top Venues map's Back to Stats button a little more bottom clearance. */
(function () {
  if (window.__howManyTopVenuesBackButtonFix) return;
  window.__howManyTopVenuesBackButtonFix = true;

  const style = document.createElement('style');
  style.id = 'top-venues-back-button-fix-styles';
  style.textContent = `
    #top-venues-map-page .top-map-footer {
      padding-bottom: calc(18px + env(safe-area-inset-bottom)) !important;
    }
  `;
  document.head.appendChild(style);
})();
