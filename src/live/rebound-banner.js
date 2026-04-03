// src/live/rebound-banner.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createReboundBanner() {
  return {
    timeout: null,
    interval: null,
    lastShooterTeam: null,
    duration: 4000,
    show(shooterTeam) {
      const State = window.LiveState;
      this.lastShooterTeam = shooterTeam;
      document.getElementById('reboundHome').innerHTML = State.onCourt.home
        .map((id) => {
          const p = State.players[id];
          return `<button onclick="event.stopPropagation();ReboundBanner.select(${id})">${p.number}<span>${p.name.substring(0, 4)}</span></button>`;
        })
        .join('');
      document.getElementById('reboundAway').innerHTML = State.onCourt.away
        .map((id) => {
          const p = State.players[id];
          return `<button onclick="event.stopPropagation();ReboundBanner.select(${id})">${p.number}<span>${p.name.substring(0, 4)}</span></button>`;
        })
        .join('');
      document.getElementById('reboundBanner').classList.add('show');
      const bar = document.getElementById('reboundTimerBar');
      bar.style.width = '100%';
      let remaining = this.duration;
      this.interval = setInterval(() => {
        remaining -= 100;
        bar.style.width = `${(remaining / this.duration) * 100}%`;
      }, 100);
      this.timeout = setTimeout(() => this.hide(), this.duration);
    },
    select(id) {
      clearTimeout(this.timeout);
      clearInterval(this.interval);
      const State = window.LiveState;
      const live = window._live || {};
      const p = State.players[id],
        isOff = p.team === this.lastShooterTeam,
        type = isOff ? 'OREB' : 'DREB';
      p.stats[isOff ? 'oreb' : 'dreb']++;
      if (live.GameEngine) live.GameEngine.log(type, id);
      if (live.ContextManager) live.ContextManager.update(type, p.team);
      if (live.UI) { live.UI.renderRoster(); live.UI.renderPBP(); live.UI.toast(`${isOff ? '🔄 RO' : '🛡️ RD'} #${p.number}`); }
      if (live.TimelineFloat) live.TimelineFloat.render();
      this.hide();
    },
    hide() {
      clearTimeout(this.timeout);
      clearInterval(this.interval);
      document.getElementById('reboundBanner').classList.remove('show');
    },
  };
}
