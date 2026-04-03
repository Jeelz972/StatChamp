// src/live/timeout-manager.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createTimeoutManager() {
  return {
    _reportTimer: null,
    getHalfQuota(q) {
      if (q <= 2) return 2;
      if (q <= 4) return 3;
      return 1;
    },
    getUsed(team, q) {
      const State = window.LiveState;
      if (q <= 2) return State.timeouts[team].filter((t) => t.q <= 2).length;
      if (q <= 4) return State.timeouts[team].filter((t) => t.q >= 3 && t.q <= 4).length;
      return State.timeouts[team].filter((t) => t.q === q).length;
    },
    getRemaining(team, q) {
      return Math.max(0, this.getHalfQuota(q) - this.getUsed(team, q));
    },
    canCall(team) {
      const State = window.LiveState;
      return this.getRemaining(team, State.match.quarter) > 0;
    },
    showPopup() {
      const State = window.LiveState;
      const live = window._live || {};
      const q = State.match.quarter;
      const hRem = this.getRemaining('home', q);
      const aRem = this.getRemaining('away', q);
      const hDis = hRem <= 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : '';
      const aDis = aRem <= 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : '';
      const html = `<div style="display:flex;gap:12px;justify-content:center;">
        <button class="btn-mod prim" ${hDis} onclick="TimeoutManager.call('home')" style="flex:1;padding:20px;">
            <div style="font-size:1.2rem;">🏠</div>
            <div style="font-size:0.7rem;margin-top:4px;">Nous (${hRem} rest.)</div>
        </button>
        <button class="btn-mod danger" ${aDis} onclick="TimeoutManager.call('away')" style="flex:1;padding:20px;">
            <div style="font-size:1.2rem;">🚨</div>
            <div style="font-size:0.7rem;margin-top:4px;">Eux (${aRem} rest.)</div>
        </button>
      </div>`;
      if (live.UI) {
        live.UI.showModal(
          '⏸ Timeout',
          html,
          [{ text: 'Annuler', action: 'UI.closeModal()', class: '' }],
          'g-1'
        );
      }
    },
    call(team) {
      const State = window.LiveState;
      const live = window._live || {};
      const q = State.match.quarter;
      if (!this.canCall(team)) {
        if (live.UI) { live.UI.toast('Quota timeouts atteint', 'error'); live.UI.closeModal(); }
        return;
      }
      if (State.match.running && live.GameEngine) live.GameEngine.toggleTimer();
      const entry = { q: q, time: State.match.time };
      State.timeouts[team].push(entry);
      if (live.GameEngine) live.GameEngine.log('TIMEOUT', 0, { team: team });
      if (live.UI) live.UI.closeModal();
      this.renderDots();
      if (live.UI) live.UI.renderPBP();
      if (live.TimelineFloat) live.TimelineFloat.render();
      if (live.OfflineManager) live.OfflineManager.save();
      if (live.UI) live.UI.toast(`Timeout ${team === 'home' ? 'Nous' : 'Eux'}`);
      this.showReport(team);
    },
    showReport(callingTeam) {
      const State = window.LiveState;
      const live = window._live || {};
      const sc = live.GameEngine ? live.GameEngine.getScore() : { home: 0, away: 0 };
      const recent = State.scoreHistory.slice(-12);
      let runHome = 0, runAway = 0;
      if (recent.length >= 2) {
        const first = recent[0], last = recent[recent.length - 1];
        const hDiff = last.home - first.home, aDiff = last.away - first.away;
        if (aDiff === 0 && hDiff > 0) runHome = hDiff;
        if (hDiff === 0 && aDiff > 0) runAway = aDiff;
      }
      const q = State.match.quarter;
      const qtPts = {};
      State.actions.forEach(function(a) {
        if ((a.q || 1) !== q) return;
        const p = State.players[a.pid]; if (!p) return;
        if (a.type === 'SHOT' && a.made) qtPts[a.pid] = (qtPts[a.pid] || 0) + a.val;
        if (a.type === 'FT' && (a.ftMade||0) > 0) qtPts[a.pid] = (qtPts[a.pid] || 0) + a.ftMade;
      });
      const topScorerId = Object.keys(qtPts).sort(function(a,b){ return qtPts[b] - qtPts[a]; })[0];
      const topScorer = topScorerId ? State.players[parseInt(topScorerId)] : null;
      const last6 = State.actions.filter(function(a){ return a.type === 'SHOT' && State.players[a.pid] && State.players[a.pid].team === 'home'; }).slice(-6);
      const l6Made = last6.filter(function(a){ return a.made; }).length;
      const fgLast = last6.length > 0 ? Math.round(l6Made / last6.length * 100) : null;
      const box = document.getElementById('toastTimeout');
      if (!box) return;
      let html = '<div style="font-weight:800;font-size:0.8rem;margin-bottom:8px;color:var(--text-1);">Bilan Timeout — ' + (callingTeam === 'home' ? 'Nous' : 'Eux') + '</div>';
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">';
      html += '<div style="text-align:center;"><div style="font-size:1.1rem;font-weight:900;color:var(--home-color);">' + sc.home + '</div><div style="font-size:0.55rem;color:var(--text-muted);">NOUS</div></div>';
      html += '<div style="font-size:1.1rem;font-weight:700;color:var(--text-muted);align-self:center;">-</div>';
      html += '<div style="text-align:center;"><div style="font-size:1.1rem;font-weight:900;color:var(--away-color);">' + sc.away + '</div><div style="font-size:0.55rem;color:var(--text-muted);">EUX</div></div>';
      html += '</div>';
      if (runHome >= 6) html += '<div style="font-size:0.7rem;color:#4ade80;font-weight:700;margin-bottom:4px;">Run Nous ' + runHome + '-0 sur les dernieres actions</div>';
      if (runAway >= 6) html += '<div style="font-size:0.7rem;color:#f87171;font-weight:700;margin-bottom:4px;">Run Eux ' + runAway + '-0 — repondre !</div>';
      if (topScorer) html += '<div style="font-size:0.7rem;color:var(--text-secondary);margin-bottom:4px;">Top Q' + q + ' : #' + topScorer.number + ' ' + topScorer.name + ' (' + (qtPts[topScorer.id]||0) + ' pts)</div>';
      if (fgLast !== null) html += '<div style="font-size:0.7rem;color:var(--text-muted);">FG% 6 dern. tentatives : <strong style="color:' + (fgLast >= 50 ? '#4ade80' : fgLast >= 33 ? 'var(--warning)' : '#f87171') + ';">' + fgLast + '%</strong></div>';
      html += '<div style="font-size:0.6rem;color:var(--text-muted);margin-top:8px;text-align:right;">Tap pour fermer</div>';
      box.innerHTML = html;
      box.classList.add('show');
      box.onclick = function(){ box.classList.remove('show'); };
      clearTimeout(this._reportTimer);
      this._reportTimer = setTimeout(function(){ box.classList.remove('show'); }, 8000);
    },
    renderDots() {
      const State = window.LiveState;
      const q = State.match.quarter;
      ['home', 'away'].forEach((team) => {
        const el = document.getElementById(team === 'home' ? 'toDotsHome' : 'toDotsAway');
        if (!el) return;
        const quota = this.getHalfQuota(q);
        const used = this.getUsed(team, q);
        let html = '';
        for (let i = 0; i < quota; i++) {
          html += `<div class="to-dot ${i < used ? 'used' : 'available'}"></div>`;
        }
        el.innerHTML = html;
      });
    },
  };
}
