// src/live/match-report.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createMatchReport() {
  return {
    show() {
      const State = window.LiveState;
      const live = window._live || {};
      if (live.UI) live.UI.closeModal();
      const sc = live.GameEngine ? live.GameEngine.getScore() : { home: 0, away: 0 };
      const homePlayers = Object.values(State.players).filter(function(p){ return p.team === 'home'; });
      const awayPlayers = Object.values(State.players).filter(function(p){ return p.team === 'away'; });

      const SE = typeof window !== 'undefined' && window.StatsEngine ? window.StatsEngine : null;
      const eff = SE
        ? function(s) { return SE.EFF(s.pts, s.oreb + s.dreb, s.ast, s.stl, s.blk, s.fga + s.fg3a, s.fgm + s.fg3m, s.fta, s.ftm, s.tov); }
        : function(s) { return s.pts + (s.oreb + s.dreb) + s.ast + s.stl + s.blk - s.tov - ((s.fga + s.fg3a) - (s.fgm + s.fg3m)) - (s.fta - s.ftm); };

      const mvp = homePlayers.slice().sort(function(a,b){ return eff(b.stats) - eff(a.stats); })[0];
      const topAdv = awayPlayers.slice().sort(function(a,b){ return b.stats.pts - a.stats.pts; })[0];

      const runs = [];
      const recent = State.scoreHistory;
      for (let i = 1; i < recent.length; i++) {
        const prev = recent[i-1], cur = recent[i];
        const hg = cur.home - prev.home, ag = cur.away - prev.away;
        if (ag === 0 && hg >= 8) runs.push('Nous ' + hg + '-0');
        if (hg === 0 && ag >= 8) runs.push('Eux ' + ag + '-0');
      }

      const maxQ = Math.max(4, State.match.quarter);
      const qPts = {};
      for (let q = 1; q <= maxQ; q++) qPts[q] = { home: 0, away: 0 };
      State.actions.forEach(function(a) {
        const p = State.players[a.pid]; if (!p) return;
        const q = a.q || 1;
        if (!qPts[q]) qPts[q] = { home: 0, away: 0 };
        if (a.type === 'SHOT' && a.made) qPts[q][p.team] += a.val;
        if (a.type === 'FT' && (a.ftMade||0) > 0) qPts[q][p.team] += a.ftMade;
      });

      const qLabels = [];
      for (let q = 1; q <= maxQ; q++) qLabels.push(q <= 4 ? 'Q' + q : 'OT' + (q-4));

      const fmtPct = function(m,a){ return a > 0 ? Math.round(m/a*100) + '%' : '--'; };

      let html = '';

      // Score final + QT
      html += '<div class="report-section">';
      html += '<div class="report-title">Score final — ' + State.match.date + ' vs ' + State.match.opponent + '</div>';
      html += '<div style="display:flex;gap:6px;margin-bottom:10px;">';
      qLabels.forEach(function(lbl, i) {
        const q = i + 1, d = qPts[q] || {home:0,away:0};
        html += '<div style="flex:1;text-align:center;background:var(--bg-4);border-radius:6px;padding:6px 4px;">' +
          '<div style="font-size:0.55rem;color:var(--text-muted);font-weight:700;">' + lbl + '</div>' +
          '<div style="font-size:0.9rem;font-weight:900;color:var(--home-color);">' + d.home + '</div>' +
          '<div style="font-size:0.9rem;font-weight:900;color:var(--away-color);">' + d.away + '</div></div>';
      });
      html += '<div style="flex:1;text-align:center;background:var(--bg-3);border:1px solid var(--accent);border-radius:6px;padding:6px 4px;">' +
        '<div style="font-size:0.55rem;color:var(--accent);font-weight:700;">TOTAL</div>' +
        '<div style="font-size:0.9rem;font-weight:900;color:var(--home-color);">' + sc.home + '</div>' +
        '<div style="font-size:0.9rem;font-weight:900;color:var(--away-color);">' + sc.away + '</div></div>';
      html += '</div>';
      html += (sc.home > sc.away
        ? '<div style="text-align:center;font-size:0.75rem;color:#4ade80;font-weight:800;">VICTOIRE +' + (sc.home - sc.away) + '</div>'
        : sc.away > sc.home
          ? '<div style="text-align:center;font-size:0.75rem;color:#f87171;font-weight:800;">DEFAITE -' + (sc.away - sc.home) + '</div>'
          : '<div style="text-align:center;font-size:0.75rem;color:var(--warning);font-weight:800;">EGALITE</div>');
      html += '</div>';

      // MVP
      if (mvp) {
        const s = mvp.stats, e = eff(s), fgm = s.fgm + s.fg3m, fga = s.fga + s.fg3a;
        html += '<div class="report-section">';
        html += '<div class="report-title">MVP du match</div>';
        html += '<div style="display:flex;align-items:center;gap:12px;">';
        html += '<div style="font-size:2rem;font-weight:900;color:var(--accent);">#' + mvp.number + '</div>';
        html += '<div><div style="font-size:1rem;font-weight:800;">' + mvp.name + '</div>';
        html += '<div style="font-size:0.7rem;color:var(--text-muted);">' + s.pts + ' pts — ' + (s.oreb+s.dreb) + ' reb — ' + s.ast + ' pd — ' + fmtPct(fgm, fga) + ' FG — EFF ' + (e>0?'+':'') + e + '</div></div>';
        html += '</div></div>';
      }

      // Box score Nous
      html += '<div class="report-section">';
      html += '<div class="report-title">Box Score — Nous</div>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:0.65rem;">';
      html += '<thead><tr style="color:var(--text-muted);border-bottom:1px solid var(--border);">' +
        '<th style="text-align:left;padding:3px 4px;">Joueur</th><th>MIN</th><th>PTS</th><th>FG</th><th>3P</th><th>LF</th><th>REB</th><th>PD</th><th>BP</th><th>INT</th><th>+/-</th>' +
        '</tr></thead><tbody>';
      homePlayers.slice().sort(function(a,b){ return b.stats.pts - a.stats.pts; }).forEach(function(p) {
        const s = p.stats, fgm = s.fgm+s.fg3m, fga = s.fga+s.fg3a;
        const pm = s.plusMinus;
        html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">' +
          '<td style="padding:3px 4px;font-weight:700;">#' + p.number + ' ' + p.name.substring(0,8) + '</td>' +
          '<td style="text-align:center;">' + Math.round(s.min/60) + '</td>' +
          '<td style="text-align:center;font-weight:800;color:var(--text-1);">' + s.pts + '</td>' +
          '<td style="text-align:center;">' + fmtPct(fgm,fga) + '</td>' +
          '<td style="text-align:center;">' + fmtPct(s.fg3m,s.fg3a) + '</td>' +
          '<td style="text-align:center;">' + fmtPct(s.ftm,s.fta) + '</td>' +
          '<td style="text-align:center;">' + (s.oreb+s.dreb) + '</td>' +
          '<td style="text-align:center;">' + s.ast + '</td>' +
          '<td style="text-align:center;color:#f87171;">' + s.tov + '</td>' +
          '<td style="text-align:center;">' + s.stl + '</td>' +
          '<td style="text-align:center;color:' + (pm>0?'#4ade80':pm<0?'#f87171':'var(--text-muted)') + ';font-weight:800;">' + (pm>0?'+':'') + pm + '</td>' +
          '</tr>';
      });
      html += '</tbody></table></div>';

      // Runs
      if (runs.length) {
        html += '<div class="report-section"><div class="report-title">Runs du match (8-0 et +)</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
        runs.forEach(function(r){ html += '<span style="background:var(--bg-4);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:0.7rem;font-weight:700;">' + r + '</span>'; });
        html += '</div></div>';
      }

      // Top adverse
      if (topAdv) {
        const s = topAdv.stats, fgm = s.fgm+s.fg3m, fga = s.fga+s.fg3a;
        html += '<div class="report-section"><div class="report-title">Meilleur marqueur adverse</div>';
        html += '<div style="font-size:0.75rem;">#' + topAdv.number + ' ' + topAdv.name + ' — ' + s.pts + ' pts — ' + fmtPct(fgm,fga) + ' FG — ' + s.ast + ' pd</div>';
        html += '</div>';
      }

      document.getElementById('matchReportBody').innerHTML = html;
      document.getElementById('matchReport').classList.add('show');
    },
    hide() {
      document.getElementById('matchReport').classList.remove('show');
    },
  };
}
