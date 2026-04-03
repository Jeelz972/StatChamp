// src/live/quick-stats.js
// Extrait de live.html -- lit window.LiveState au moment de l'appel

export function createQuickStats() {
  return {
    open: false,
    toggle() {
      this.open = !this.open;
      document.getElementById('qsWrap').classList.toggle('open', this.open);
      document.getElementById('qsToggle').textContent = this.open
        ? '▲ Stats rapides'
        : '▼ Stats rapides';
    },
    render() {
      const State = window.LiveState;
      const calc = (team) => {
        const players = Object.values(State.players).filter((p) => p.team === team);
        let fgm = 0, fga = 0, fg3m = 0, fg3a = 0, reb = 0, ast = 0, tov = 0, stl = 0;
        players.forEach((p) => {
          fgm += p.stats.fgm; fg3m += p.stats.fg3m;
          fga += p.stats.fga; fg3a += p.stats.fg3a;
          reb += p.stats.oreb + p.stats.dreb;
          ast += p.stats.ast; tov += p.stats.tov; stl += p.stats.stl;
        });
        const totalFgm = fgm + fg3m, totalFga = fga + fg3a;
        const fgPct = totalFga > 0 ? Math.round((totalFgm / totalFga) * 100) : 0;
        const fg3Pct = fg3a > 0 ? Math.round((fg3m / fg3a) * 100) : 0;
        return { fgPct, fg3Pct, reb, ast, tov, stl };
      };
      const h = calc('home'), a = calc('away');
      const STATS = [
        { key: 'fgPct', lbl: 'FG%', fmt: function(v){ return v + '%'; } },
        { key: 'fg3Pct', lbl: '3P%', fmt: function(v){ return v + '%'; } },
        { key: 'reb',   lbl: 'REB', fmt: function(v){ return v; } },
        { key: 'ast',   lbl: 'PD',  fmt: function(v){ return v; } },
        { key: 'stl',   lbl: 'INT', fmt: function(v){ return v; } },
        { key: 'tov',   lbl: 'BP',  fmt: function(v){ return v; } },
      ];
      const mkVals = function(d, side) {
        return STATS.map(function(s) {
          return '<div style="flex:1;text-align:center;padding:4px 2px;">' +
            '<div style="font-size:0.75rem;font-weight:800;color:' + (side === 'home' ? 'var(--home-color)' : 'var(--away-color)') + ';">' + s.fmt(d[s.key]) + '</div>' +
            '<div style="font-size:0.5rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;">' + s.lbl + '</div>' +
            '</div>';
        }).join('');
      };
      const hEl = document.getElementById('qsHome');
      const aEl = document.getElementById('qsAway');
      if (hEl) {
        hEl.style.display = 'flex';
        hEl.style.flex = '1';
        hEl.innerHTML = mkVals(h, 'home');
      }
      if (aEl) {
        aEl.style.display = 'flex';
        aEl.style.flex = '1';
        aEl.innerHTML = mkVals(a, 'away');
      }
    },
  };
}
