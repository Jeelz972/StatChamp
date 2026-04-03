// src/live/subs-modal.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createSubsModal() {
  return {
    homeSwaps: [],
    awaySwaps: [],
    pendingTeam: null,
    pendingOut: null,

    show() {
      this.homeSwaps = [];
      this.awaySwaps = [];
      this.pendingTeam = null;
      this.pendingOut = null;
      this.render();
      document.getElementById('subsModal').classList.add('show');
    },
    hide() {
      document.getElementById('subsModal').classList.remove('show');
    },

    getSwaps(team) {
      return team === 'home' ? this.homeSwaps : this.awaySwaps;
    },
    usedOuts(team) {
      return this.getSwaps(team).map((s) => s.out);
    },
    usedIns(team) {
      return this.getSwaps(team).map((s) => s.in);
    },

    selectOut(team, id) {
      const swaps = this.getSwaps(team);
      const existIdx = swaps.findIndex((s) => s.out === id);
      if (existIdx >= 0) {
        swaps.splice(existIdx, 1);
        this.pendingTeam = null;
        this.pendingOut = null;
        this.render();
        return;
      }
      this.pendingTeam = team;
      this.pendingOut = id;
      this.render();
    },

    selectIn(team, id) {
      const swaps = this.getSwaps(team);
      const existIdx = swaps.findIndex((s) => s.in === id);
      if (existIdx >= 0) {
        swaps.splice(existIdx, 1);
        this.render();
        return;
      }
      if (this.pendingTeam === team && this.pendingOut) {
        swaps.push({ out: this.pendingOut, in: id });
        this.pendingTeam = null;
        this.pendingOut = null;
        this.render();
        return;
      }
      this.render();
    },

    removeSwap(team, idx) {
      this.getSwaps(team).splice(idx, 1);
      this.pendingTeam = null;
      this.pendingOut = null;
      this.render();
    },

    render() {
      const State = window.LiveState;
      const renderTeam = (team) => {
        const players = Object.values(State.players).filter((p) => p.team === team);
        const onCourt = players.filter((p) => State.onCourt[team].includes(p.id));
        const bench = players.filter((p) => !State.onCourt[team].includes(p.id));
        const swaps = this.getSwaps(team);
        const outs = this.usedOuts(team);
        const ins = this.usedIns(team);
        const isPending = this.pendingTeam === team;

        let html = `<div class="subs-team">`;
        html += `<div class="subs-team-title ${team}">${team === 'home' ? '🏠 NOUS' : '🚨 EUX'}</div>`;

        if (swaps.length > 0) {
          html += `<div class="subs-label" style="color:var(--accent);">Changements programmés</div>`;
          swaps.forEach((s, i) => {
            const pOut = State.players[s.out], pIn = State.players[s.in];
            html += `<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.4);border-radius:8px;margin-bottom:4px;">
                    <span style="color:var(--danger);font-weight:800;font-size:0.8rem;">OUT #${pOut?.number || '?'}</span>
                    <span style="color:var(--text-muted);">→</span>
                    <span style="color:var(--success);font-weight:800;font-size:0.8rem;">IN #${pIn?.number || '?'}</span>
                    <button onclick="SubsModal.removeSwap('${team}', ${i})" style="margin-left:auto;background:var(--danger);border:none;color:white;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:0.7rem;">✕</button>
                </div>`;
          });
        }

        html += `<div class="subs-label">Sur terrain — tap pour sortir</div>`;
        html += `<div class="subs-oncourt">`;
        onCourt.forEach((p) => {
          const isUsed = outs.includes(p.id);
          const isPendingOut = isPending && this.pendingOut === p.id;
          let cls = 'subs-player oncourt';
          if (isUsed) cls += ' selected';
          if (isPendingOut) cls += ' selected';
          html += `<div class="${cls}" onclick="SubsModal.selectOut('${team}', ${p.id})" ${isUsed ? 'style="opacity:0.4;"' : ''}>
                <span class="subs-player-num">${p.number}</span>
                <span class="subs-player-name">${p.name}</span>
                <span class="subs-player-stats">${p.stats.pts}p</span>
            </div>`;
        });
        html += `</div>`;

        html += `<div class="subs-label">Banc — tap pour entrer</div>`;
        html += `<div class="subs-bench">`;
        bench.forEach((p) => {
          const isUsed = ins.includes(p.id);
          let cls = 'subs-player';
          if (isUsed) cls += ' selected';
          html += `<div class="${cls}" onclick="SubsModal.selectIn('${team}', ${p.id})" ${isUsed ? 'style="opacity:0.4;"' : ''}>
                <span class="subs-player-num">${p.number}</span>
                <span class="subs-player-name">${p.name}</span>
                <span class="subs-player-stats">${p.stats.pts}p</span>
            </div>`;
        });
        html += `</div></div>`;
        return html;
      };

      document.getElementById('subsContent').innerHTML =
        renderTeam('home') + renderTeam('away');

      const total = this.homeSwaps.length + this.awaySwaps.length;
      const btn = document.querySelector('.subs-swap-btn');
      if (btn) {
        btn.disabled = total === 0;
        btn.textContent =
          total > 0
            ? `✓ Appliquer ${total} changement${total > 1 ? 's' : ''}`
            : '✓ Appliquer les changements';
        btn.style.opacity = total > 0 ? '1' : '0.4';
      }
    },

    executeSwaps() {
      const State = window.LiveState;
      const live = window._live || {};
      let count = 0;

      this.homeSwaps.forEach((s) => {
        const idx = State.onCourt.home.indexOf(s.out);
        if (idx >= 0) {
          State.onCourt.home[idx] = s.in;
          if (live.GameEngine) live.GameEngine.log('SUB', s.out, { inId: s.in, subOut: s.out });
          count++;
        }
      });

      this.awaySwaps.forEach((s) => {
        const idx = State.onCourt.away.indexOf(s.out);
        if (idx >= 0) {
          State.onCourt.away[idx] = s.in;
          if (live.GameEngine) live.GameEngine.log('SUB', s.out, { inId: s.in, subOut: s.out });
          count++;
        }
      });

      if (count > 0) {
        if (live.UI) { live.UI.renderRoster(); live.UI.renderPBP(); live.UI.toast(`${count} changement${count > 1 ? 's' : ''} effectué${count > 1 ? 's' : ''}`); }
        if (live.TimelineFloat) live.TimelineFloat.render();
        if (live.LineupTracker) live.LineupTracker.render();
        if (live.OfflineManager) live.OfflineManager.save();
      }
      this.hide();
    },
  };
}
