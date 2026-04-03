// src/live/starters-modal.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createStartersModal() {
  return {
    selected: [],
    quarter: 1,
    tab: 'home',

    show(quarter) {
      const State = window.LiveState;
      this.quarter = quarter;
      this.tab = 'home';
      const saved = State.starters[quarter];
      this.selected = saved && saved.length > 0 ? [...saved] : [...State.onCourt.home];
      this.render();
      document.getElementById('startersModal').classList.add('show');
    },

    setTab(tab) {
      const State = window.LiveState;
      if (this.tab === 'home') {
        State.starters[this.quarter] = [...this.selected];
      } else {
        State.opponentStarters[this.quarter] = [...this.selected];
      }
      this.tab = tab;
      if (tab === 'home') {
        const saved = State.starters[this.quarter];
        this.selected = saved && saved.length > 0 ? [...saved] : [...State.onCourt.home];
      } else {
        const saved = State.opponentStarters[this.quarter];
        this.selected = saved && saved.length > 0 ? [...saved] : [...State.onCourt.away];
      }
      this.render();
    },

    render() {
      const State = window.LiveState;
      const isHome = this.tab === 'home';
      const players = Object.values(State.players).filter(
        (p) => p.team === (isHome ? 'home' : 'away')
      );

      document.getElementById('startersTitle').innerHTML =
        `<div style="margin-bottom:10px;">5 de départ Q${this.quarter}</div>` +
        `<div style="display:flex;gap:8px;justify-content:center;">` +
        `<button class="btn-mod ${isHome ? 'prim' : ''}" onclick="StartersModal.setTab('home')" style="padding:6px 16px;font-size:0.75rem;">🏠 NOUS</button>` +
        `<button class="btn-mod ${!isHome ? 'prim' : ''}" onclick="StartersModal.setTab('away')" style="padding:6px 16px;font-size:0.75rem;">🚨 EUX</button>` +
        `</div>`;

      document.getElementById('startersGrid').innerHTML = players
        .map(
          (p) =>
            `<button class="${this.selected.includes(p.id) ? 'selected' : ''}" onclick="StartersModal.toggle(${p.id})">${p.number}<span>${p.name.substring(0, 5)}</span></button>`
        )
        .join('');

      document.getElementById('startersCount').textContent =
        `${this.selected.length}/5 sélectionnés`;
      document.getElementById('startersConfirm').disabled = this.selected.length !== 5;
    },

    toggle(id) {
      const idx = this.selected.indexOf(id);
      if (idx >= 0) this.selected.splice(idx, 1);
      else if (this.selected.length < 5) this.selected.push(id);
      this.render();
    },

    confirm() {
      const State = window.LiveState;
      const live = window._live || {};
      const selected = this.selected;
      const injuredStarters = selected.filter((id) => {
        const p = State.players[id];
        return p && p.status === 'injured';
      });
      if (injuredStarters.length > 0) {
        const names = injuredStarters
          .map((id) => { const p = State.players[id]; return p ? `#${p.number} ${p.name}` : `#${id}`; })
          .join(', ');
        if (!confirm(`Attention : ${names} ${injuredStarters.length > 1 ? 'sont blessés' : 'est blessé'}. Confirmer quand même ?`)) return;
      }
      if (this.selected.length !== 5) return;

      if (this.tab === 'home') {
        State.starters[this.quarter] = [...this.selected];
        State.onCourt.home = [...this.selected];
      } else {
        State.opponentStarters[this.quarter] = [...this.selected];
        State.onCourt.away = [...this.selected];
      }

      if (live.UI) live.UI.renderRoster();

      const oppSaved = State.opponentStarters[this.quarter];
      if (this.tab === 'home' && (!oppSaved || oppSaved.length !== 5)) {
        this.setTab('away');
        if (live.UI) live.UI.toast(`✓ NOUS validé — Sélectionnez les adverses`);
        return;
      }

      const homeSaved = State.starters[this.quarter];
      if (this.tab === 'away' && (!homeSaved || homeSaved.length !== 5)) {
        this.setTab('home');
        if (live.UI) live.UI.toast(`✓ EUX validé — Sélectionnez les nôtres`);
        return;
      }

      State.onCourt.home = [...State.starters[this.quarter]];
      State.onCourt.away = [...State.opponentStarters[this.quarter]];
      document.getElementById('startersModal').classList.remove('show');
      if (live.UI) { live.UI.renderRoster(); live.UI.toast(`5 de départ Q${this.quarter} validés`); }
      if (live.OfflineManager) live.OfflineManager.save();
    },

    cancel() {
      const live = window._live || {};
      document.getElementById('startersModal').classList.remove('show');
      if (live.UI) live.UI.renderRoster();
    },
  };
}
