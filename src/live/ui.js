// src/live/ui.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createUI() {
  return {
    init() {
      this.renderRoster();
      this.updateHeader();
      this.updateFoulsDisplay();
      this.renderPBP();
    },
    updateHeader() {
      const State = window.LiveState;
      const live = window._live || {};
      const sc = live.GameEngine ? live.GameEngine.getScore() : { home: 0, away: 0 };
      document.getElementById('scH').textContent = sc.home;
      document.getElementById('scA').textContent = sc.away;
      document.getElementById('qTag').textContent = State.match.quarter > 4 ? ('OT' + (State.match.quarter - 4)) : ('Q' + State.match.quarter);
      const m = Math.floor(State.match.time / 60),
        s = State.match.time % 60;
      const btn = document.getElementById('timerBtn');
      btn.textContent = `${m}:${s < 10 ? '0' + s : s}`;
      btn.classList.toggle('running', State.match.running);
      this.updateQuarterScores();
      if (live.LineupTracker) live.LineupTracker.render();
    },
    updateQuarterScores() {
      const State = window.LiveState;
      const band = document.getElementById('qscoreBand');
      if (!band) return;
      const maxQ = Math.max(4, State.match.quarter);
      const qLabels = [];
      for (let q = 1; q <= maxQ; q++) qLabels.push(q <= 4 ? 'Q' + q : 'OT' + (q - 4));
      const qPts = {};
      qLabels.forEach((_, i) => { qPts[i + 1] = { home: 0, away: 0 }; });
      State.actions.forEach(function(a) {
        const p = State.players[a.pid];
        if (!p) return;
        const q = a.q || 1;
        if (!qPts[q]) qPts[q] = { home: 0, away: 0 };
        if (a.type === 'SHOT' && a.made) qPts[q][p.team] += a.val;
        if (a.type === 'FT' && (a.ftMade || 0) > 0) qPts[q][p.team] += a.ftMade;
      });
      band.innerHTML = qLabels.map(function(lbl, i) {
        const q = i + 1;
        const d = qPts[q] || { home: 0, away: 0 };
        const isActive = q === State.match.quarter;
        return `<div class="qscore-col${isActive ? ' active-q' : ''}">` +
          `<div class="qscore-label">${lbl}</div>` +
          `<div class="qscore-home">${d.home}</div>` +
          `<div class="qscore-away">${d.away}</div>` +
          `</div>`;
      }).join('');
    },
    updateFoulsDisplay() {
      const State = window.LiveState;
      const live = window._live || {};
      const q = State.match.quarter,
        hF = State.teamFouls.home[q - 1] || 0,
        aF = State.teamFouls.away[q - 1] || 0;
      const renderDots = (c) => {
        let h = '';
        for (let i = 0; i < 5; i++) {
          const f = i < c,
            b = c >= 5 && i === 4;
          h += `<div class="foul-dot ${f ? 'filled' : ''} ${b ? 'bonus' : ''}"></div>`;
        }
        return h;
      };
      document.getElementById('foulsHome').innerHTML = renderDots(hF);
      document.getElementById('foulsAway').innerHTML = renderDots(aF);
      if (live.TimeoutManager) live.TimeoutManager.renderDots();
    },
    setSyncStatus(s) {
      const dot = document.getElementById('syncDot'),
        txt = document.getElementById('syncStatus');
      dot.className = 'sync-dot';
      if (s === 'online') {
        txt.textContent = 'OK';
      } else if (s === 'syncing') {
        dot.classList.add('syncing');
        txt.textContent = '...';
      } else if (s === 'error') {
        dot.classList.add('error');
        txt.textContent = 'Err';
      }
    },
    animScore(t) {
      const el = document.getElementById(t === 'home' ? 'scH' : 'scA');
      el.style.transform = 'scale(1.3)';
      setTimeout(() => (el.style.transform = 'scale(1)'), 200);
    },
    renderRoster() {
      const State = window.LiveState;
      const q = State.match.quarter,
        starters = State.starters[q] || [];
      const getFatigue = (p) => {
        const m = Math.round(p.stats.min / 60);
        if (m >= 8 && State.onCourt[p.team].includes(p.id)) return 'fatigue-high';
        return '';
      };
      const getFoulClass = (p) => {
        const f = p.stats.fouls;
        const q = State.match.quarter;
        if (f >= 4) return 'foul-danger';
        if (f >= 3 && q <= 2) return 'foul-warn';
        return '';
      };
      const renderCard = (p) => {
        const sel = State.ui.sel === p.id ? 'active' : '',
          on = State.onCourt[p.team].includes(p.id) ? 'oncourt' : '',
          fat = getFatigue(p),
          foulCls = getFoulClass(p),
          mins = Math.round(p.stats.min / 60);
        // B3 : badge statut blessure
        let statusBadge = '';
        if (p.status === 'injured') {
          statusBadge =
            '<span style="position:absolute;top:3px;left:3px;width:8px;height:8px;border-radius:50%;background:#ef4444;" title="Blessé"></span>';
        } else if (p.status === 'doubtful') {
          statusBadge =
            '<span style="position:absolute;top:3px;left:3px;width:8px;height:8px;border-radius:50%;background:#f59e0b;" title="Douteux"></span>';
        } else if (p.status === 'rest') {
          statusBadge =
            '<span style="position:absolute;top:3px;left:3px;width:8px;height:8px;border-radius:50%;background:#94a3b8;" title="Repos"></span>';
        }
        return `<div class="p-card ${sel} ${on} ${fat} ${foulCls}" data-pid="${p.id}" onpointerdown="SwipeManager.start(${p.id},event)" onpointermove="SwipeManager.move(${p.id},event)" onpointerup="SwipeManager.end(${p.id},event)">${statusBadge}<span class="p-num">${p.number}</span><span class="p-name">${p.name}</span><div class="p-stats"><span class="p-pts">${p.stats.pts}p</span><span class="p-time">${mins}'</span></div><div class="p-fls">${Array(Math.min(5, p.stats.fouls)).fill('<div class="f-dot"></div>').join('')}</div></div>`;
      };
      const sortRoster = (team) =>
        Object.values(State.players)
          .filter((p) => p.team === team && !p.inactive)
          .sort((a, b) => {
            const aOn = State.onCourt[team].includes(a.id) ? 0 : 1;
            const bOn = State.onCourt[team].includes(b.id) ? 0 : 1;
            if (aOn !== bOn) return aOn - bOn;
            return parseInt(a.number) - parseInt(b.number);
          });
      document.getElementById('rosterHome').innerHTML = sortRoster('home')
        .map((p) => renderCard(p))
        .join('');
      document.getElementById('rosterAway').innerHTML = sortRoster('away')
        .map((p) => renderCard(p, true))
        .join('');
    },
    renderPBP() {
      const State = window.LiveState;
      const live = window._live || {};
      const list = document.getElementById('pbpList');
      document.getElementById('pbpCount').textContent = `${State.actions.length} actions`;
      if (!State.actions.length) {
        list.innerHTML =
          '<div style="text-align:center;padding:20px;color:var(--text-muted)">Aucune action</div>';
        if (live.QuickStats) live.QuickStats.render();
        return;
      }
      const N = State.actions.length;
      const insBtn = (at) =>
        `<div style="text-align:center;padding:2px 0;"><button style="background:none;border:1px dashed var(--border);border-radius:4px;color:var(--text-muted);font-size:0.55rem;padding:1px 8px;cursor:pointer;opacity:0.3;transition:0.2s;" onmouseover="this.style.opacity=1;this.style.color='var(--accent)';this.style.borderColor='var(--accent)'" onmouseout="this.style.opacity=0.3;this.style.color='var(--text-muted)';this.style.borderColor='var(--border)'" onclick="event.stopPropagation();GameEngine.showInsertAction(${at})">+ insérer</button></div>`;
      let html = insBtn(N);
      State.actions
        .slice()
        .reverse()
        .slice(0, 50)
        .forEach((a, ri) => {
          const idx = N - 1 - ri;
          const p = State.players[a.pid];
          if (!p) return;
          const t = `Q${a.q} ${Math.floor(a.time / 60)}:${(a.time % 60).toString().padStart(2, '0')}`;
          let icon = '📋',
            desc = a.type;
          if (a.type === 'SHOT') {
            icon = a.made ? '✅' : '❌';
            desc = `${a.val}pts ${a.made ? '' : 'raté'}${a.astId ? ` (🎯#${State.players[a.astId]?.number})` : ''}`;
          } else if (a.type === 'OREB') {
            icon = '🔄';
            desc = 'Reb Off';
          } else if (a.type === 'DREB') {
            icon = '🛡️';
            desc = 'Reb Def';
          } else if (a.type === 'STL') {
            icon = '⚡';
            desc = 'Interc';
          } else if (a.type === 'BLK') {
            icon = '✋';
            desc = `Contre${a.victim ? ` #${State.players[a.victim]?.number}` : ''}`;
          } else if (a.type === 'TOV') {
            icon = '💨';
            desc = 'Perte';
          } else if (a.type === 'FOUL') {
            const ft = a.foulType || 'personal';
            icon =
              ft === 'technical'
                ? '🟡'
                : ft === 'unsportsmanlike'
                  ? '🟥'
                  : ft === 'offensive'
                    ? '🔄'
                    : '🚨';
            if (ft === 'technical') {
              desc = 'Tech';
              if (a.ftShooterId && State.players[a.ftShooterId]) {
                desc += ' → LF #' + State.players[a.ftShooterId].number;
              }
            } else {
              const ftLabel =
                ft === 'unsportsmanlike'
                  ? 'Anti'
                  : ft === 'offensive'
                    ? 'Off'
                    : ft === 'shooting'
                      ? 'Faute tir'
                      : 'Faute';
              desc = `${ftLabel}${a.victim ? ` sur #${State.players[a.victim]?.number}` : ''}`;
            }
          } else if (a.type === 'FT') {
            icon = '🎯';
            desc = `LF ${a.ftMade}/${a.ftAtt}`;
          } else if (a.type === 'SUB') {
            icon = '🔁';
            desc = `→ #${State.players[a.inId]?.number}`;
          } else if (a.type === 'TIMEOUT') {
            icon = '⏸';
            desc = `Timeout ${a.team === 'home' ? 'Nous' : 'Eux'}`;
          } else if (a.type === 'STOPPAGE') {
            icon = '⏱';
            desc = `Arrêt chrono ${a.duration || 0}s`;
          }

          html += `<div class="pbp-item ${p.team}" onclick="UI.editAction(${idx})"><span class="pbp-time">${t}</span><span class="pbp-icon">${icon}</span><span class="pbp-player ${p.team}">#${p.number}</span><span class="pbp-desc">${desc}</span><span class="pbp-edit">✏️</span></div>`;
          html += insBtn(idx);
        });
      list.innerHTML = html;

      if (live.QuickStats) live.QuickStats.render();
    },
    editAction(idx) {
      const State = window.LiveState;
      const a = State.actions[idx];
      if (!a) return;
      const all = Object.values(State.players),
        types = ['SHOT', 'OREB', 'DREB', 'STL', 'BLK', 'TOV', 'FOUL', 'FT', 'STOPPAGE'];
      let html = `<div style="margin-bottom:8px;"><label style="font-size:0.65rem;color:var(--text-muted);">Joueur</label><select id="edP" class="inp">${all.map((x) => `<option value="${x.id}" ${x.id === a.pid ? 'selected' : ''}>#${x.number} ${x.name}</option>`).join('')}</select></div>`;
      html += `<div style="margin-bottom:8px;"><label style="font-size:0.65rem;color:var(--text-muted);">Type</label><select id="edT" class="inp">${types.map((t) => `<option value="${t}" ${t === a.type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
      if (a.type === 'SHOT') {
        html += `<div style="margin-bottom:8px;"><select id="edV" class="inp"><option value="2" ${a.val === 2 ? 'selected' : ''}>2pts</option><option value="3" ${a.val === 3 ? 'selected' : ''}>3pts</option></select></div><div style="margin-bottom:8px;"><select id="edM" class="inp"><option value="1" ${a.made ? 'selected' : ''}>✅</option><option value="0" ${!a.made ? 'selected' : ''}>❌</option></select></div>`;
        var shooterTeam = State.players[a.pid]?.team || 'home';
        var teammates = Object.values(State.players).filter(function(x) { return x.team === shooterTeam && x.id !== a.pid; });
        html += '<div style="margin-bottom:8px;"><label style="font-size:0.65rem;color:var(--text-muted);">Passe décisive</label><select id="edAst" class="inp"><option value="">— Aucune —</option>';
        teammates.forEach(function(x) {
          html += '<option value="' + x.id + '" ' + (a.astId === x.id ? 'selected' : '') + '>#' + x.number + ' ' + x.name + '</option>';
        });
        html += '</select></div>';
      }
      if (a.type === 'STL') {
        var stlTeam = State.players[a.pid]?.team;
        var oppTeam = stlTeam === 'home' ? 'away' : 'home';
        var opponents = Object.values(State.players).filter(function(x) { return x.team === oppTeam; });
        html += '<div style="margin-bottom:8px;"><label style="font-size:0.65rem;color:var(--text-muted);">Perte par</label><select id="edVictim" class="inp"><option value="">— Inconnu —</option>';
        opponents.forEach(function(x) {
          html += '<option value="' + x.id + '" ' + (a.victim === x.id ? 'selected' : '') + '>#' + x.number + ' ' + x.name + '</option>';
        });
        html += '</select></div>';
      }
      if (a.type === 'FOUL') {
        html += `<div style="margin-bottom:12px;"><label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">Type de faute</label><select id="edFoulType" class="inp"><option value="personal" ${(a.foulType || 'personal') === 'personal' ? 'selected' : ''}>🚨 Personnelle</option><option value="shooting" ${a.foulType === 'shooting' ? 'selected' : ''}>🎯 Sur tir</option><option value="technical" ${a.foulType === 'technical' ? 'selected' : ''}>🟡 Technique</option><option value="unsportsmanlike" ${a.foulType === 'unsportsmanlike' ? 'selected' : ''}>🟥 Antisportive</option><option value="offensive" ${a.foulType === 'offensive' ? 'selected' : ''}>🔄 Offensive</option></select></div>`;
      }
      if (a.type === 'STOPPAGE') {
        html += `<div style="margin-bottom:12px;"><label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">Durée (secondes)</label><input type="number" id="edDuration" class="inp" value="${a.duration || 0}" min="0" max="600"></div>`;
      }
      this.showModal(
        '✏️ Modifier',
        html,
        [
          { text: '🗑️', action: `UI.delAction(${idx})`, class: 'danger' },
          { text: '✔', action: `UI.saveAction(${idx})`, class: 'prim' },
        ],
        'g-2'
      );
    },
    saveAction(idx) {
      const State = window.LiveState;
      const live = window._live || {};
      const a = State.actions[idx];
      a.pid = parseInt(document.getElementById('edP').value);
      a.type = document.getElementById('edT').value;
      const vEl = document.getElementById('edV'),
        mEl = document.getElementById('edM');
      if (vEl) a.val = parseInt(vEl.value);
      if (mEl) a.made = mEl.value === '1';
      const ftEl = document.getElementById('edFoulType');
      if (ftEl) a.foulType = ftEl.value;
      const durEl = document.getElementById('edDuration');
      if (durEl) a.duration = parseInt(durEl.value) || 0;
      const astEl = document.getElementById('edAst');
      if (astEl) {
        if (astEl.value && a.made) a.astId = parseInt(astEl.value);
        else delete a.astId;
      }
      const victimEl = document.getElementById('edVictim');
      if (victimEl) {
        if (victimEl.value) a.victim = parseInt(victimEl.value);
        else delete a.victim;
      }
      if (live.GameEngine) live.GameEngine.recalc();
      this.closeModal();
      this.renderRoster();
      this.updateHeader();
      this.renderPBP();
      if (live.TimelineFloat) live.TimelineFloat.render();
      if (live.Court) live.Court.draw();
      if (live.WormChart) live.WormChart.draw();
    },
    delAction(idx) {
      const State = window.LiveState;
      const live = window._live || {};
      State.actions.splice(idx, 1);
      if (live.GameEngine) live.GameEngine.recalc();
      this.closeModal();
      this.renderRoster();
      this.updateHeader();
      this.renderPBP();
      if (live.TimelineFloat) live.TimelineFloat.render();
      if (live.Court) live.Court.draw();
      if (live.WormChart) live.WormChart.draw();
    },
    showModal(title, body, actions, grid = 'g-2') {
      document.getElementById('mTitle').textContent = title;
      document.getElementById('mBody').innerHTML = body;
      const div = document.getElementById('mActions');
      div.className = `modal-grid ${grid}`;
      div.innerHTML = actions
        .map(
          (a) => `<button class="btn-mod ${a.class}" onclick="${a.action}">${a.text}</button>`
        )
        .join('');
      document.getElementById('modalWrap').classList.add('show');
    },
    closeModal() {
      document.getElementById('modalWrap').classList.remove('show');
    },
    toast(msg, type = 'success') {
      const t = document.createElement('div');
      t.className =
        'toast' + (type === 'error' ? ' error' : type === 'warning' ? ' warning' : '');
      t.textContent = msg;
      document.getElementById('toastBox').appendChild(t);
      setTimeout(() => t.remove(), 1800);
    },
  };
}
