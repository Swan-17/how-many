/* How Many Beers - Top Venues map polish */
(function () {
  const HIDDEN_LAYER = 'ferry';

  function hideShippingLanes(map) {
    try {
      if (!map || typeof map.getLayer !== 'function' || !map.getLayer(HIDDEN_LAYER)) return;
      map.setLayoutProperty(HIDDEN_LAYER, 'visibility', 'none');
    } catch (_) {}
  }

  function patchMapLibre() {
    const ml = window.maplibregl;
    if (!ml || !ml.Map || ml.Map.prototype.__howManyShippingPatch) return !!ml;
    const proto = ml.Map.prototype;
    const originalOnce = proto.once;
    proto.once = function (type, listener) {
      if (type === 'load') this.once('__how_many_hide_shipping', function () { hideShippingLanes(this); });
      return originalOnce.call(this, type, listener);
    };
    const originalFire = proto.fire;
    proto.fire = function (type, data) {
      if (type === 'load') hideShippingLanes(this);
      return originalFire.call(this, type, data);
    };
    proto.__howManyShippingPatch = true;
    return true;
  }

  function capitaliseBeers(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(textNode => {
      if (/\bbeers\b/.test(textNode.nodeValue)) {
        textNode.nodeValue = textNode.nodeValue.replace(/\bbeers\b/g, 'Beers');
      }
    });
  }

  function observeBeers() {
    const roots = () => [
      document.getElementById('top-venues-card'),
      document.getElementById('top-venues-map-page')
    ].filter(Boolean);
    const refresh = () => roots().forEach(capitaliseBeers);
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, {childList:true, subtree:true, characterData:true});
  }

  const timer = setInterval(() => {
    if (patchMapLibre()) clearInterval(timer);
  }, 50);
  setTimeout(() => clearInterval(timer), 30000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeBeers, {once:true});
  } else {
    observeBeers();
  }
})();
