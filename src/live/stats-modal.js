// src/live/stats-modal.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createStatsModal() {
  return {
    currentTab: 'home',
    quarterFilter: 'TOTAL',
    show() {
      this.render();
      document.getElementById('statsModal').classList.add('show');
    },
    hide() {
      document.getElementById('statsModal').classList.remove('show');
    },
    setTab(tab) {
      this.currentTab = tab;
      document.querySelectorAll('.stats-tab').forEach((t) => t.classList.remove('active'));
      document
        .querySelector(`.stats-tab:${tab === 'home' ? 'first' : 'last'}-child`)
        .classList.add('active');
      this.render();
    },
    setQuarterFilter(qf) {
      this.quarterFilter = qf;
      document.querySelectorAll('.stats-qt-tab').forEach((t) => t.classList.remove('active'));
      const el = document.querySelector(`.stats-qt-tab[data-qt="${qf}"]`);
      if (el) el.classList.add('active');
      this.render();
    },
    _computeFromActions(playerId, q) {
      const State = window.LiveState;
      const s = {
        pts: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0,
        oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, blkAgainst: 0,
        tov: 0, fouls: 0, foulDrawn: 0, plusMinus: 0,
      };
      State.actions.forEach((a) => {
        if (a.q !== q) return;
        if (a.pid === playerId) {
          if (a.type === 'SHOT') {
            if (a.val === 3) { s.fg3a++; if (a.made) { s.fg3m++; s.pts += 3; } }
            else { s.fga++; if (a.made) { s.fgm++; s.pts += a.val; } }
          }
          if (a.type === 'FT') { s.ftm += a.ftMade || 0; s.fta += a.ftAtt || 0; s.pts += a.ftMade || 0; }
          if (a.type === 'OREB') s.oreb++;
          if (a.type === 'DREB') s.dreb++;
          if (a.type === 'STL') s.stl++;
          if (a.type === 'TOV') s.tov++;
          if (a.type === 'BLK') s.blk++;
          if (a.type === 'FOUL') s.fouls++;
        }
        if (a.type === 'SHOT' && a.made && a.astId === playerId) s.ast++;
        if (a.type === 'FOUL' && a.victim === playerId) s.foulDrawn++;
        if (a.type === 'BLK' && a.victim === playerId) s.blkAgainst++;
        if (a.type === 'SHOT' && a.made && a.onCourt && a.onCourt.includes(playerId)) {
          const scorer = State.players[a.pid];
          if (scorer) {
            const scorerTeam = scorer.team;
            const playerTeam = State.players[playerId]?.team;
            s.plusMinus += scorerTeam === playerTeam ? a.val : -a.val;
          }
        }
        if (a.type === 'FT' && (a.ftMade || 0) > 0 && a.onCourt && a.onCourt.includes(playerId)) {
          const scorer = State.players[a.pid];
          if (scorer) {
            const scorerTeam = scorer.team;
            const playerTeam = State.players[playerId]?.team;
            s.plusMinus += scorerTeam === playerTeam ? a.ftMade : -a.ftMade;
          }
        }
      });
      return s;
    },
    render() {
      const State = window.LiveState;
      const live = window._live || {};
      const teamKey = this.currentTab;
      const players = Object.values(State.players).filter((p) => p.team === teamKey);
      const onCourt = State.onCourt[teamKey];
      const sc = live.GameEngine ? live.GameEngine.getScore() : { home: 0, away: 0 };
      const useQFilter = this.quarterFilter !== 'TOTAL';
      const filterQ = useQFilter ? parseInt(this.quarterFilter) : null;

      const playerData = players.map((p) => {
        const s = useQFilter
          ? this._computeFromActions(p.id, filterQ)
          : {
              pts: p.stats.pts, fgm: p.stats.fgm + p.stats.fg3m, fga: p.stats.fga + p.stats.fg3a,
              fg3m: p.stats.fg3m, fg3a: p.stats.fg3a, ftm: p.stats.ftm, fta: p.stats.fta,
              oreb: p.stats.oreb, dreb: p.stats.dreb, ast: p.stats.ast, stl: p.stats.stl,
              blk: p.stats.blk, blkAgainst: p.stats.blkAgainst || 0, tov: p.stats.tov,
              fouls: p.stats.fouls, foulDrawn: p.stats.foulDrawn || 0, plusMinus: p.stats.plusMinus,
            };
        if (!useQFilter) {
          s.fgm = p.stats.fgm + p.stats.fg3m;
          s.fga = p.stats.fga + p.stats.fg3a;
        } else {
          const totalFgm = s.fgm + s.fg3m;
          const totalFga = s.fga + s.fg3a;
          s.fgm = totalFgm;
          s.fga = totalFga;
        }
        return { player: p, s };
      });

      let teamStats = {
        pts: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0,
        oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, blkAgainst: 0, tov: 0, fouls: 0, foulDrawn: 0,
      };
      playerData.forEach(({ s }) => {
        teamStats.pts += s.pts; teamStats.fgm += s.fgm; teamStats.fga += s.fga;
        teamStats.fg3m += s.fg3m; teamStats.fg3a += s.fg3a; teamStats.ftm += s.ftm;
        teamStats.fta += s.fta; teamStats.oreb += s.oreb; teamStats.dreb += s.dreb;
        teamStats.ast += s.ast; teamStats.stl += s.stl; teamStats.blk += s.blk;
        teamStats.blkAgainst += s.blkAgainst; teamStats.tov += s.tov;
        teamStats.fouls += s.fouls; teamStats.foulDrawn += s.foulDrawn;
      });

      const fgPct = teamStats.fga > 0 ? Math.round((teamStats.fgm / teamStats.fga) * 100) : 0;
      const fg3Pct = teamStats.fg3a > 0 ? Math.round((teamStats.fg3m / teamStats.fg3a) * 100) : 0;
      const ftPct = teamStats.fta > 0 ? Math.round((teamStats.ftm / teamStats.fta) * 100) : 0;

      let displayPts = teamKey === 'home' ? sc.home : sc.away;
      if (useQFilter) displayPts = teamStats.pts;

      let html = `
        <div style="display:flex;gap:4px;padding:4px;background:rgba(0,0,0,0.3);border-radius:6px;margin-bottom:10px;flex-wrap:wrap;">
            ${['TOTAL', '1', '2', '3', '4']
              .map((q) => {
                const label = q === 'TOTAL' ? 'TOTAL' : 'Q' + q;
                const active =
                  this.quarterFilter === q
                    ? 'background:var(--accent);color:white;'
                    : 'background:transparent;color:var(--text-secondary);';
                return `<button class="stats-qt-tab" data-qt="${q}" onclick="StatsModal.setQuarterFilter('${q}')" style="padding:4px 10px;border:none;border-radius:4px;font-weight:600;font-size:0.65rem;cursor:pointer;${active}">${label}</button>`;
              })
              .join('')}
        </div>
        <div class="stats-summary">
            <div class="stats-summary-item">
                <div class="stats-summary-value">${displayPts}</div>
                <div class="stats-summary-label">Points${useQFilter ? ' Q' + filterQ : ''}</div>
            </div>
            <div class="stats-summary-item">
                <div class="stats-summary-value">${fgPct}%</div>
                <div class="stats-summary-label">FG (${teamStats.fgm}/${teamStats.fga})</div>
            </div>
            <div class="stats-summary-item">
                <div class="stats-summary-value">${fg3Pct}%</div>
                <div class="stats-summary-label">3PT (${teamStats.fg3m}/${teamStats.fg3a})</div>
            </div>
            <div class="stats-summary-item">
                <div class="stats-summary-value">${teamStats.oreb + teamStats.dreb}</div>
                <div class="stats-summary-label">Rebonds</div>
            </div>
        </div>
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Joueur</th><th>MIN</th><th>PTS</th><th>TIR</th><th>%TIR</th>
                    <th>3PT</th><th>%3PT</th><th>LF</th><th>%LF</th><th>REB</th>
                    <th>PD</th><th>BP</th><th>INT</th><th>CTR</th><th>CTR-S</th>
                    <th>FTE</th><th>FTP</th><th>+/-</th>
                </tr>
            </thead>
            <tbody>
      `;

      playerData.sort((a, b) => b.s.pts - a.s.pts);
      playerData.forEach(({ player: p, s }) => {
        const mins = Math.round(p.stats.min / 60);
        const isOnCourt = onCourt.includes(p.id);
        const fgmp = s.fga > 0 ? Math.round((s.fgm / s.fga) * 100) : 0;
        const fg3mp = s.fg3a > 0 ? Math.round((s.fg3m / s.fg3a) * 100) : 0;
        const ftmp = s.fta > 0 ? Math.round((s.ftm / s.fta) * 100) : 0;
        const reb = s.oreb + s.dreb;
        const pm = s.plusMinus;
        html += `
            <tr>
                <td>${isOnCourt ? '<span class="stats-oncourt"></span>' : ''}#${p.number} ${p.name.substring(0, 8)}</td>
                <td>${mins}</td>
                <td class="highlight">${s.pts}</td>
                <td>${s.fgm}-${s.fga}</td><td>${fgmp}%</td>
                <td>${s.fg3m}-${s.fg3a}</td><td>${fg3mp}%</td>
                <td>${s.ftm}-${s.fta}</td><td>${ftmp}%</td>
                <td>${reb}</td><td>${s.ast}</td>
                <td class="negative">${s.tov}</td>
                <td>${s.stl}</td><td>${s.blk}</td>
                <td class="negative">${s.blkAgainst}</td>
                <td class="negative">${s.fouls}</td>
                <td class="positive">${s.foulDrawn}</td>
                <td class="${pm >= 0 ? 'positive' : 'negative'}">${pm > 0 ? '+' : ''}${pm}</td>
            </tr>
        `;
      });

      html += `
            </tbody>
            <tfoot>
                <tr style="font-weight:700;background:var(--bg-card);">
                    <td>TOTAL</td><td>-</td>
                    <td class="highlight">${teamStats.pts}</td>
                    <td>${teamStats.fgm}-${teamStats.fga}</td><td>${fgPct}%</td>
                    <td>${teamStats.fg3m}-${teamStats.fg3a}</td><td>${fg3Pct}%</td>
                    <td>${teamStats.ftm}-${teamStats.fta}</td><td>${ftPct}%</td>
                    <td>${teamStats.oreb + teamStats.dreb}</td>
                    <td>${teamStats.ast}</td>
                    <td class="negative">${teamStats.tov}</td>
                    <td>${teamStats.stl}</td><td>${teamStats.blk}</td>
                    <td>${teamStats.blkAgainst}</td>
                    <td class="negative">${teamStats.fouls}</td>
                    <td>${teamStats.foulDrawn}</td>
                    <td>-</td>
                </tr>
            </tfoot>
        </table>
      `;
      document.getElementById('statsBody').innerHTML = html;
    },
  };
}
