/* How Many Beers - Group top venues stats */
(function () {
  let installed = false;
  let currentRequest = 0;

  const $ = id => document.getElementById(id);

  function esc(v) {
    return String(v ?? '').replace(/[&<>\'\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[c]));
  }

  function addStyles() {
    if ($('top-venues-styles')) return;
    const s = document.createElement('style');
    s.id = 'top-venues-styles';
    s.textContent = `
      #top-venues-card .top-venues-toggle { width: 100%; padding: 12px; font-size: 13px; }
      #top-venues-card .top-venues-list { margin-top: 12px; }
      #top-venues-card .top-venue-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border-color); }
      #top-venues-card .top-venue-row:last-child { border-bottom: none; }
      #top-venues-card .top-venue-name { font-size: 13px; font-weight: 700; min-width: 0; }
      #top-venues-card .top-venue-address { display: block; margin-top: 3px; color: var(--text-muted); font-size: 10px; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #top-venues-card .top-venue-count { color: var(--primary-color); font-size: 13px; font-weight: 800; white-space: nowrap; }
    `;
    document.head.appendChild(s);
  }

  function ensureCard() {
    const weeklyCanvas = $('weeklyChart');
    const statsPage = $('page-stats');
    if (!weeklyCanvas || !statsPage) return null;

    let card = $('top-venues-card');
    if (card) return card;

    const weeklyCard = weeklyCanvas.closest('.card');
    if (!weeklyCard) return null;

    card = document.createElement('div');
    card.id = 'top-venues-card';
    card.className = 'card hidden';
    card.innerHTML = `
      <div class="accordion-header" onclick="toggleTopVenues()" style="padding:2px 0;">
        <h3 style="margin: 0; font-size: 15px; color: var(--text-muted);">TOP VENUES</h3>
        <span id="top-venues-icon" class="accordion-icon">▼</span>
      </div>
      <div id="top-venues-body" class="hidden">
        <div id="top-venues-list" class="top-venues-list"></div>
      </div>
    `;
    weeklyCard.insertAdjacentElement('afterend', card);
    return card;
  }

  async function loadTopVenues() {
    const card = ensureCard();
    if (!card) return;

    const select = $('analytics-group-select');
    const code = select?.value;
    const isPersonal = !code || code === 'my_stats' || code === 'all_friends';
    card.classList.toggle('hidden', isPersonal);
    if (isPersonal) return;

    const list = $('top-venues-list');
    const body = $('top-venues-body');
    if (!list) return;

    if (body?.classList.contains('hidden')) {
      list.innerHTML = '';
      return;
    }

    const requestId = ++currentRequest;
    list.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">Loading venues…</div>';

    if (!window.sb) {
      list.innerHTML = '<div style="color:#fca5a5;font-size:12px;">Stats database is not ready yet. Try again in a moment.</div>';
      return;
    }

    const { data: members, error: memberError } = await window.sb
      .from('group_members')
      .select('user_email')
      .eq('group_code', code);

    if (requestId !== currentRequest) return;
    if (memberError) {
      list.innerHTML = `<div style="color:#fca5a5;font-size:12px;">${esc(memberError.message)}</div>`;
      return;
    }

    const memberEmails = Array.from(new Set((members || []).map(m => (m.user_email || '').toLowerCase().trim()).filter(Boolean)));
    if (!memberEmails.length) {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">No members found for this group.</div>';
      return;
    }

    const { data: sessions, error: sessionError } = await window.sb
      .from('drinking_sessions')
      .select('id, user_email, venue_name, venue_address, started_at')
      .in('user_email', memberEmails)
      .order('started_at', { ascending: false });

    if (requestId !== currentRequest) return;
    if (sessionError) {
      list.innerHTML = `<div style="color:#fca5a5;font-size:12px;">${esc(sessionError.message)}</div>`;
      return;
    }

    if (!sessions?.length) {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">No venues visited yet.</div>';
      return;
    }

    const sessionIds = sessions.map(s => s.id);
    const { data: events, error: eventError } = await window.sb
      .from('drink_location_events')
      .select('session_id, delta')
      .in('session_id', sessionIds);

    if (requestId !== currentRequest) return;
    if (eventError) {
      list.innerHTML = `<div style="color:#fca5a5;font-size:12px;">${esc(eventError.message)}</div>`;
      return;
    }

    const drinksBySession = {};
    (events || []).forEach(e => {
      drinksBySession[e.session_id] = (drinksBySession[e.session_id] || 0) + Number(e.delta || 0);
    });

    const venues = {};
    sessions.forEach(session => {
      const venueKey = `${session.venue_name || 'Unknown venue'}|${session.venue_address || ''}`;
      if (!venues[venueKey]) {
        venues[venueKey] = {
          name: session.venue_name || 'Unknown venue',
          address: session.venue_address || '',
          drinks: 0,
          sessions: 0
        };
      }
      venues[venueKey].drinks += drinksBySession[session.id] || 0;
      venues[venueKey].sessions += 1;
    });

    const rows = Object.values(venues)
      .map(v => ({ ...v, drinks: Math.max(0, v.drinks) }))
      .sort((a, b) => b.drinks - a.drinks || b.sessions - a.sessions || a.name.localeCompare(b.name));

    list.innerHTML = rows.map(v => `
      <div class="top-venue-row">
        <div style="min-width:0;flex:1;">
          <div class="top-venue-name">${esc(v.name)}</div>
          ${v.address ? `<span class="top-venue-address">${esc(v.address)}</span>` : ''}
        </div>
        <div class="top-venue-count">${v.drinks} drink${v.drinks === 1 ? '' : 's'}</div>
      </div>
    `).join('');
  }

  window.toggleTopVenues = function () {
    const body = $('top-venues-body');
    const icon = $('top-venues-icon');
    if (!body) return;
    const opening = body.classList.contains('hidden');
    body.classList.toggle('hidden', !opening);
    if (icon) icon.innerText = opening ? '▲' : '▼';
    if (opening) loadTopVenues();
  };

  function install() {
    if (installed) return;
    if (!$('page-stats') || !$('weeklyChart')) return;
    installed = true;
    addStyles();
    ensureCard();

    const select = $('analytics-group-select');
    select?.addEventListener('change', () => setTimeout(loadTopVenues, 50));

    if (typeof window.switchPage === 'function' && !window.__howManyTopVenuesPageHook) {
      const original = window.switchPage;
      window.switchPage = function (page) {
        const result = original(page);
        if (page === 'stats') setTimeout(loadTopVenues, 100);
        return result;
      };
      window.__howManyTopVenuesPageHook = true;
    }

    setTimeout(loadTopVenues, 100);
  }

  const timer = setInterval(() => {
    if ($('page-stats') && $('weeklyChart')) {
      clearInterval(timer);
      install();
    }
  }, 200);
  setTimeout(() => clearInterval(timer), 10000);
})();
