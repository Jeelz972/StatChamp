// src/live/game-engine.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createGameEngine() {
  return {
    timer: null,
    autoSaveTimer: null,
    toggleTimer() {
      const State = window.LiveState;
      const live = window._live || {};
      State.match.running = !State.match.running;
      if (State.match.running) {
        // --- STOPPAGE : calculer durée de pause et logger si > 2s ---
        if (State.match.pauseStartWall) {
          const pauseDuration = Math.round((Date.now() - State.match.pauseStartWall) / 1000);
          if (pauseDuration > 2) {
            this.log('STOPPAGE', 0, { duration: pauseDuration });
            if (live.UI) live.UI.renderPBP();
            if (live.TimelineFloat) live.TimelineFloat.render();
          }
          State.match.pauseStartWall = null;
        }
        this.timer = setInterval(() => {
          if (State.match.time > 0) {
            State.match.time--;
            [...State.onCourt.home, ...State.onCourt.away].forEach((id) => {
              if (State.players[id]) State.players[id].stats.min++;
            });
            if (live.UI) live.UI.updateHeader();
            if (State.match.time % 30 === 0 && live.OfflineManager) live.OfflineManager.save();
          } else {
            this.endQuarter();
          }
        }, 1000);
      } else {
        clearInterval(this.timer);
        // --- STOPPAGE : enregistrer le moment de la pause ---
        State.match.pauseStartWall = Date.now();
        if (live.OfflineManager) live.OfflineManager.save();
      }
      if (live.UI) live.UI.updateHeader();
    },
    endQuarter() {
      const State = window.LiveState;
      const live = window._live || {};
      clearInterval(this.timer);
      State.match.running = false;
      const q = State.match.quarter;
      const nextQ = q + 1;

      if (q === 2) {
        // Mi-temps — show coach report
        if (live.CoachReport) live.CoachReport.show('halftime');
      } else if (nextQ <= 4) {
        // Fin Q1 ou Q3 — simple modal
        if (live.UI) live.UI.showModal(
          `Fin Q${q}`,
          `<p style="text-align:center;">Score: ${this.getScore().home} - ${this.getScore().away}</p>`,
          [
            {
              text: `Démarrer Q${nextQ}`,
              action: `GameEngine.startNextQuarter(${nextQ})`,
              class: 'success',
            },
          ],
          'g-2'
        );
      } else {
        // Fin Q4+ — show coach report final
        if (live.CoachReport) live.CoachReport.show('final');
      }
    },
    startAutoSave() {
      const live = window._live || {};
      if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = setInterval(async () => {
        const State = window.LiveState;
        const db = window.db;
        if (!db || !State.actions.length) return;
        try {
          const scores = this.getScore();
          const playerStats = {};
          Object.values(State.players).filter((p) => p.team === 'home').forEach((p) => {
            playerStats[p.id] = { pts: p.stats.pts, reb: p.stats.oreb + p.stats.dreb, oreb: p.stats.oreb, dreb: p.stats.dreb, ast: p.stats.ast, stl: p.stats.stl, blk: p.stats.blk, tov: p.stats.tov, fga: p.stats.fga, fgm: p.stats.fgm, threePA: p.stats.fg3a, threePM: p.stats.fg3m, fta: p.stats.fta, ftm: p.stats.ftm, pf: p.stats.fouls, minutes: Math.round(p.stats.min / 60), plusMinus: p.stats.plusMinus, foulDrawn: p.stats.foulDrawn || 0 };
          });
          const opponentPlayerStats = {};
          const opponentStats = { pts: scores.away, reb: 0, oreb: 0, tov: 0, fouls: 0, fga: 0, fgm: 0 };
          Object.values(State.players).filter((p) => p.team === 'away').forEach((p) => {
            opponentStats.reb += p.stats.oreb + p.stats.dreb;
            opponentStats.oreb += p.stats.oreb;
            opponentStats.tov += p.stats.tov;
            opponentStats.fouls += p.stats.fouls;
            opponentStats.fga += p.stats.fga + p.stats.fg3a;
            opponentStats.fgm += p.stats.fgm + p.stats.fg3m;
            opponentPlayerStats[p.id] = { pts: p.stats.pts, oreb: p.stats.oreb, dreb: p.stats.dreb, ast: p.stats.ast, stl: p.stats.stl, blk: p.stats.blk, tov: p.stats.tov, fga: p.stats.fga, fgm: p.stats.fgm, threePA: p.stats.fg3a, threePM: p.stats.fg3m, fta: p.stats.fta, ftm: p.stats.ftm, pf: p.stats.fouls, minutes: Math.round(p.stats.min / 60), plusMinus: p.stats.plusMinus, number: p.number, name: p.name, foulDrawn: p.stats.foulDrawn || 0 };
          });
          const game = { id: State.match.id.toString(36), date: State.match.date, opponent: State.match.opponent, homeScore: scores.home, awayScore: scores.away, phase: State.match.phase, playerStats, opponentStats, opponentPlayerStats, opponentStarters: State.opponentStarters, actions: State.actions, starters: State.starters, specialFouls: State.specialFouls, scoreHistory: State.scoreHistory };
          var wk = sessionStorage.getItem('statchamp_wk') || '';
          await db.collection('games').doc(game.id).set(Object.assign({}, game, { _wk: wk, updatedAt: new Date().toISOString() }));
          const now = new Date();
          const hhmm = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
          const dot = document.getElementById('syncDot'), txt = document.getElementById('syncStatus');
          if (dot) dot.className = 'sync-dot';
          if (txt) txt.textContent = hhmm;
        } catch(e) {
          console.warn('auto-save failed', e);
        }
      }, 120000);
    },

    startOT() {
      const State = window.LiveState;
      const live = window._live || {};
      if (live.UI) live.UI.closeModal();
      const otQ = State.match.quarter + 1;
      State.match.quarter = otQ;
      State.match.time = 300; // 5 minutes FIBA OT
      State.teamFouls.home[otQ - 1] = 0;
      State.teamFouls.away[otQ - 1] = 0;
      if (live.UI) { live.UI.updateHeader(); live.UI.updateFoulsDisplay(); live.UI.toast(`Prolongation ${otQ > 5 ? (otQ - 4) + 'e' : ''} — 5 min`); }
      if (live.StartersModal) live.StartersModal.show(otQ);
    },

    startNextQuarter(q) {
      const State = window.LiveState;
      const live = window._live || {};
      if (live.UI) live.UI.closeModal();
      State.match.quarter = q;
      State.match.time = 600;
      State.teamFouls.home[q - 1] = 0;
      State.teamFouls.away[q - 1] = 0;
      if (live.UI) { live.UI.updateHeader(); live.UI.updateFoulsDisplay(); }
      if (live.StartersModal) live.StartersModal.show(q);
    },
    handlePlayerClick(id) {
      const State = window.LiveState;
      const live = window._live || {};
      const p = State.players[id];
      if (State.ui.pending === 'FOUL_WHO') {
        State.ui.ctx.fouler = id;
        State.ui.pending = 'FOUL_VICTIM';
        if (State.ui.ctx.foulType === 'technical') {
          if (live.UI) live.UI.toast('Qui tire les LF ?');
        } else {
          if (live.UI) live.UI.toast('Qui subit ?');
        }
        return;
      }
      if (State.ui.pending === 'FOUL_VICTIM') {
        var foulType = State.ui.ctx.foulType;
        if (foulType === 'technical') {
          State.ui.ctx.ftShooterId = id;
          if (live.FoulPanel) live.FoulPanel.showTech(State.ui.ctx.fouler, id);
          State.ui.pending = null;
          return;
        }
        if (p.team === State.players[State.ui.ctx.fouler]?.team)
          return live.UI && live.UI.toast('Autre équipe !', 'error');
        if (live.FoulPanel) live.FoulPanel.show(State.ui.ctx.fouler, id);
        State.ui.pending = null;
        return;
      }
      if (State.ui.pending === 'BLK_WHO') {
        State.ui.ctx.blocker = id;
        State.ui.pending = 'BLK_VICTIM';
        if (live.UI) live.UI.toast('Qui contré ?');
        return;
      }
      if (State.ui.pending === 'BLK_VICTIM') {
        if (p.team === State.players[State.ui.ctx.blocker]?.team)
          return live.UI && live.UI.toast('Autre équipe !', 'error');
        State.ui.ctx.shooter = id;
        State.ui.pending = 'BLK_LOC';
        if (live.Court) live.Court.showMsg('Zone du tir ?');
        return;
      }
      State.ui.sel = State.ui.sel === id ? null : id;
      if (live.UI) live.UI.renderRoster();
    },
    handleCourtClick(x, y, val, screenX, screenY) {
      const State = window.LiveState;
      const live = window._live || {};
      if (State.ui.pending === 'BLK_LOC') {
        if (live.Court) live.Court.hideMsg();
        this.finishBlock(x, y, val);
        return;
      }
      if (live.CourtFirst) live.CourtFirst.show(x, y, val, screenX, screenY);
    },
    recordShot(pid, val, made, x, y, astId = null) {
      const State = window.LiveState;
      const live = window._live || {};
      if (!this.checkConflict()) return;
      const p = State.players[pid];
      if (!p) return;
      if (val === 3) {
        p.stats.fg3a++;
        if (made) {
          p.stats.fg3m++;
          p.stats.pts += 3;
        }
      } else {
        p.stats.fga++;
        if (made) {
          p.stats.fgm++;
          p.stats.pts += val;
        }
      }
      if (astId && made) State.players[astId].stats.ast++;
      if (made) {
        if (live.UI) live.UI.animScore(p.team);
        this.updatePlusMinus(p.team, val);
        if (live.ContextManager) live.ContextManager.update('SHOT_MADE', p.team);
        this.log('SHOT', pid, { val, made, x, y, astId });
        this.addScorePoint(p.team, val);
        if (live.UI) { live.UI.renderRoster(); live.UI.updateHeader(); live.UI.renderPBP(); }
        if (live.Court) live.Court.draw();
        if (live.WormChart) live.WormChart.draw();
        if (live.TimelineFloat) live.TimelineFloat.render();
        if (live.RunDetector) live.RunDetector.check();
        if (live.AssistPopup) live.AssistPopup.show(pid, p.team, { val, x, y });
      } else {
        if (live.ContextManager) live.ContextManager.update('SHOT_MISS', p.team);
        this.log('SHOT', pid, { val, made, x, y });
        if (live.UI) { live.UI.renderRoster(); live.UI.updateHeader(); live.UI.renderPBP(); }
        if (live.Court) live.Court.draw();
        if (live.TimelineFloat) live.TimelineFloat.render();
        setTimeout(() => { if (live.ReboundBanner) live.ReboundBanner.show(p.team); }, 300);
      }
    },
    checkConflict() {
      const State = window.LiveState;
      const now = Date.now();
      if (now - State.ui.lastActionTime < 600) {
        document.getElementById('conflictAlert').classList.add('show');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setTimeout(
          () => document.getElementById('conflictAlert').classList.remove('show'),
          1200
        );
        return false;
      }
      State.ui.lastActionTime = now;
      return true;
    },
    addScorePoint(team, pts) {
      const State = window.LiveState;
      const sc = this.getScore();
      State.scoreHistory.push({
        time: State.match.time,
        q: State.match.quarter,
        home: sc.home,
        away: sc.away,
      });
    },

    updatePlusMinus(scoringTeam, points) {
      const State = window.LiveState;
      State.onCourt.home.forEach((id) => {
        if (State.players[id])
          State.players[id].stats.plusMinus += scoringTeam === 'home' ? points : -points;
      });
      State.onCourt.away.forEach((id) => {
        if (State.players[id])
          State.players[id].stats.plusMinus += scoringTeam === 'away' ? points : -points;
      });
    },

    action(type) {
      const State = window.LiveState;
      const live = window._live || {};
      if (!State.ui.sel) {
        if (live.PendingAction) live.PendingAction.set(type);
        return;
      }
      if (!this.checkConflict()) return;
      const p = State.players[State.ui.sel];
      if (type === 'TOV') {
        p.stats.tov++;
        this.log('TOV', State.ui.sel);
        if (live.UI) live.UI.toast('Perte de balle');
        this.askForConsequence('STL', p.team === 'home' ? 'away' : 'home');
        if (live.UI) live.UI.renderRoster();
        return;
      }

      if (type === 'STL') {
        p.stats.stl++;
        this.log('STL', State.ui.sel);
        if (live.UI) live.UI.toast('Interception');
        this.askForConsequence('TOV', p.team === 'home' ? 'away' : 'home');
        if (live.UI) live.UI.renderRoster();
        return;
      }
      const map = { OREB: 'oreb', DREB: 'dreb', STL: 'stl', TOV: 'tov' };
      if (map[type]) {
        p.stats[map[type]]++;
        this.log(type, State.ui.sel);
        if (live.ContextManager) live.ContextManager.update(type, p.team);
        if (live.UI) { live.UI.renderRoster(); live.UI.renderPBP(); live.UI.toast(type); }
        if (live.TimelineFloat) live.TimelineFloat.render();
      }
    },
    askForConsequence(type, team) {
      const State = window.LiveState;
      const live = window._live || {};
      const teamPlayers = Object.values(State.players).filter((p) => p.team === team);
      const title = type === 'STL' ? 'Qui a intercepté ?' : 'Qui a perdu la balle ?';

      let html = `<div class="player-select-grid">`;
      teamPlayers.forEach((p) => {
        const onCourt = State.onCourt[team].includes(p.id) ? 'oncourt' : '';
        html += `<div class="player-select-btn ${team} ${onCourt}" onclick="GameEngine.confirmChainAction('${type}', ${p.id})">
                    <div class="num">${p.number}</div>
                    <div class="name">${p.name}</div>
                </div>`;
      });
      html += `</div>`;

      if (live.UI) live.UI.showModal(
        title,
        html,
        [{ text: 'Passer', action: 'UI.closeModal()', class: '' }],
        'g-1'
      );
    },

    confirmChainAction(type, pid) {
      const State = window.LiveState;
      const live = window._live || {};
      const p = State.players[pid];
      if (type === 'STL') p.stats.stl++;
      else p.stats.tov++;

      this.log(type, pid);
      if (live.UI) { live.UI.closeModal(); live.UI.renderRoster(); live.UI.toast(type + ' #' + p.number); }
    },
    startFoul(foulType = 'personal') {
      const State = window.LiveState;
      const live = window._live || {};
      if (State.match.running) {
        this.toggleTimer();
        if (live.UI) live.UI.toast('⏸️ Timer stoppé');
      }
      State.ui.pending = 'FOUL_WHO';
      State.ui.ctx = { foulType };
      if (live.UI) live.UI.toast(
        foulType === 'technical'
          ? 'Qui fait la tech ?'
          : foulType === 'unsportsmanlike'
            ? "Qui fait l'anti ?"
            : 'Qui fait la faute ?'
      );
    },
    startBlock() {
      const State = window.LiveState;
      const live = window._live || {};
      if (live.UI) live.UI.toast('Qui a contré ?');
      State.ui.pending = 'BLK_WHO';
      State.ui.ctx = {};
    },

    finishBlock(x, y, val) {
      const State = window.LiveState;
      const live = window._live || {};
      const blocker = State.players[State.ui.ctx.blocker],
        shooter = State.players[State.ui.ctx.shooter];
      blocker.stats.blk++;
      shooter.stats.blkAgainst++;
      if (val === 3) shooter.stats.fg3a++;
      else shooter.stats.fga++;
      this.log('BLK', State.ui.ctx.blocker, { victim: State.ui.ctx.shooter, x, y, val });
      State.ui.ctx = {};
      State.ui.pending = null;
      setTimeout(() => { if (live.ReboundBanner) live.ReboundBanner.show(shooter.team); }, 300);
      if (live.UI) { live.UI.renderRoster(); live.UI.renderPBP(); live.UI.toast(`Contre #${blocker.number}`); }
      if (live.TimelineFloat) live.TimelineFloat.render();
      if (live.Court) live.Court.draw();
    },

    log(type, pid, data = {}) {
      const State = window.LiveState;
      const live = window._live || {};
      const action = {
        id: Date.now(),
        type,
        pid,
        time: State.match.time,
        q: State.match.quarter,
        onCourt: [...State.onCourt.home, ...State.onCourt.away],
        ...data,
      };
      if (State.currentPlay && type !== 'SUB') action.play = State.currentPlay;
      State.actions.push(action);
      if (live.OfflineManager) live.OfflineManager.save();
    },
    undo() {
      const State = window.LiveState;
      const live = window._live || {};
      if (!State.actions.length) { if (live.UI) live.UI.toast('Rien', 'error'); return; }
      State.actions.pop();
      this.recalc();
      if (live.UI) { live.UI.renderRoster(); live.UI.updateHeader(); live.UI.renderPBP(); live.UI.toast('Annulé'); }
      if (live.TimelineFloat) live.TimelineFloat.render();
      if (live.Court) live.Court.draw();
      if (live.WormChart) live.WormChart.draw();
    },

    recalc() {
      const State = window.LiveState;
      const live = window._live || {};
      Object.values(State.players).forEach((p) => {
        p.stats = {
          pts: 0,
          oreb: 0,
          dreb: 0,
          ast: 0,
          stl: 0,
          blk: 0,
          tov: 0,
          fouls: 0,
          foulDrawn: 0,
          fgm: 0,
          fga: 0,
          fg3m: 0,
          fg3a: 0,
          ftm: 0,
          fta: 0,
          min: p.stats.min,
          plusMinus: 0,
          blkAgainst: 0,
          shotChart: [],
        };
      });
      State.teamFouls = { home: [0, 0, 0, 0], away: [0, 0, 0, 0] };
      State.scoreHistory = [{ time: 600, q: 1, home: 0, away: 0 }];

      State.timeouts = { home: [], away: [] };
      State.actions.forEach((a) => {
        if (a.type === 'STOPPAGE') return;
        if (a.type === 'TIMEOUT') {
          if (a.team) State.timeouts[a.team].push({ q: a.q, time: a.time });
          return;
        }

        const p = State.players[a.pid];
        if (!p) return;
        if (a.type === 'SHOT') {
          if (a.val === 3) {
            p.stats.fg3a++;
            if (a.made) {
              p.stats.fg3m++;
              p.stats.pts += 3;
            }
          } else {
            p.stats.fga++;
            if (a.made) {
              p.stats.fgm++;
              p.stats.pts += a.val;
            }
          }
          if (a.astId && a.made && State.players[a.astId]) State.players[a.astId].stats.ast++;
          if (a.made && a.onCourt) {
            a.onCourt.forEach((id) => {
              if (State.players[id])
                State.players[id].stats.plusMinus +=
                  State.players[id].team === p.team ? a.val : -a.val;
            });
            const sc = this.getScoreFromActions(State.actions.indexOf(a));
            State.scoreHistory.push({ time: a.time, q: a.q, ...sc });
          }
        }
        if (a.type === 'OREB') p.stats.oreb++;
        if (a.type === 'DREB') p.stats.dreb++;
        if (a.type === 'STL') p.stats.stl++;
        if (a.type === 'BLK') {
          p.stats.blk++;
          if (a.victim && State.players[a.victim]) {
            State.players[a.victim].stats.blkAgainst++;
            if (a.val === 3) State.players[a.victim].stats.fg3a++;
            else State.players[a.victim].stats.fga++;
          }
        }
        if (a.type === 'TOV') p.stats.tov++;
        if (a.type === 'AST') {
          const alreadyCounted = State.actions.some(
            (s) =>
              s.type === 'SHOT' &&
              s.made &&
              s.astId === a.pid &&
              s.pid === a.scorerId &&
              s.q === a.q
          );
          if (!alreadyCounted) p.stats.ast++;
        }
        if (a.type === 'FOUL') {
          p.stats.fouls++;
          State.teamFouls[p.team][a.q - 1]++;
          if (a.victim && State.players[a.victim]) State.players[a.victim].stats.foulDrawn++;
        }
        if (a.type === 'FT') {
          p.stats.ftm += a.ftMade || 0;
          p.stats.fta += a.ftAtt || 0;
          p.stats.pts += a.ftMade || 0;
          if (a.ftMade > 0 && a.onCourt) {
            a.onCourt.forEach((id) => {
              if (State.players[id])
                State.players[id].stats.plusMinus +=
                  State.players[id].team === p.team ? a.ftMade : -a.ftMade;
            });
            const sc = this.getScoreFromActions(State.actions.indexOf(a));
            State.scoreHistory.push({ time: a.time, q: a.q, ...sc });
          }
        }
      });
      // --- Recalcul des minutes depuis starters + SUBs (joueurs home uniquement) ---
      // time = countdown (secondes restantes). min stocké en secondes.
      // Away players : conserver la valeur accumulée par le timer (pas de starters par QT).
      const _actions = State.actions;
      const _maxQ = _actions.reduce(function(m, a) { return Math.max(m, a.q || 1); }, State.match.quarter || 1);

      Object.keys(State.players).forEach(function(pid) {
        const _p = State.players[pid];
        if (!_p || _p.team !== 'home') return;

        let totalSeconds = 0;

        for (let q = 1; q <= _maxQ; q++) {
          const qLength = q > 4 ? 300 : 600; // OT FIBA = 5min, QT normal = 10min
          const starters = State.starters[q] || State.starters[1] || [];
          let isOnCourt = starters.map(String).includes(String(pid));
          let enteredAt = isOnCourt ? qLength : -1;

          const isCurrentQ = q === (State.match.quarter || 1);
          const endTime = (isCurrentQ && State.match.status !== 'final') ? (State.match.time || 0) : 0;

          // SUBs de ce QT triés par temps décroissant = ordre chronologique (plus de temps restant = plus tôt)
          const qSubs = _actions
            .filter(function(a) { return a.type === 'SUB' && (a.q || 1) === q; })
            .sort(function(a, b) { return (b.time || 0) - (a.time || 0); });

          qSubs.forEach(function(a) {
            // Convention canonique : pid = SORTANT, inId = ENTRANT
            const playerOut = (a.inId != null && a.inId !== '') ? String(a.pid) : String(a.subOut || '');
            const playerIn  = (a.inId != null && a.inId !== '') ? String(a.inId) : String(a.pid);
            const subTime = a.time || 0;

            if (playerOut === String(pid) && isOnCourt) {
              totalSeconds += enteredAt - subTime;
              isOnCourt = false;
            }
            if (playerIn === String(pid) && !isOnCourt) {
              isOnCourt = true;
              enteredAt = subTime;
            }
          });

          if (isOnCourt && enteredAt >= 0) {
            totalSeconds += enteredAt - endTime;
          }
        }

        _p.stats.min = Math.max(0, totalSeconds);
      });

      if (live.UI) live.UI.updateFoulsDisplay();
    },
    // === PATCH: Timer Edit ===
    showTimerEdit() {
      const State = window.LiveState;
      const live = window._live || {};
      if (State.match.running) { if (live.UI) live.UI.toast("Pausez le timer d'abord", 'warning'); return; }
      const m = Math.floor(State.match.time / 60);
      const s = State.match.time % 60;
      const html = `
        <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;">Temps actuel: ${m}:${s < 10 ? '0' + s : s}</div>
            <div style="display:flex;gap:8px;justify-content:center;align-items:center;">
                <input type="number" id="editMin" class="inp" value="${m}" min="0" max="10" style="width:70px;text-align:center;font-size:1.2rem;">
                <span style="font-size:1.5rem;font-weight:800;">:</span>
                <input type="number" id="editSec" class="inp" value="${s}" min="0" max="59" style="width:70px;text-align:center;font-size:1.2rem;">
            </div>
        </div>
    `;
      if (live.UI) live.UI.showModal(
        '⏱️ Modifier Chrono',
        html,
        [
          { text: 'Annuler', action: 'UI.closeModal()', class: '' },
          { text: '✔ Appliquer', action: 'GameEngine.applyTimerChange()', class: 'prim' },
        ],
        'g-2'
      );
    },

    applyTimerChange() {
      const State = window.LiveState;
      const live = window._live || {};
      const newMin = parseInt(document.getElementById('editMin').value) || 0;
      const newSec = parseInt(document.getElementById('editSec').value) || 0;
      const newTime = Math.max(0, Math.min(600, newMin * 60 + newSec));
      const oldTime = State.match.time;
      const delta = oldTime - newTime;
      if (delta !== 0) {
        [...State.onCourt.home, ...State.onCourt.away].forEach((id) => {
          if (State.players[id]) {
            State.players[id].stats.min += delta;
            if (State.players[id].stats.min < 0) State.players[id].stats.min = 0;
          }
        });
      }
      State.match.time = newTime;
      if (live.UI) { live.UI.closeModal(); live.UI.updateHeader(); live.UI.renderRoster(); live.UI.toast(`Chrono → ${newMin}:${newSec < 10 ? '0' + newSec : newSec}`); }
      if (live.OfflineManager) live.OfflineManager.save();
    },

    // === PATCH: Export CSV ===
    exportCSV() {
      const State = window.LiveState;
      const live = window._live || {};
      if (!State.actions.length) { if (live.UI) live.UI.toast('Aucune action', 'error'); return; }
      const teamHome = window.teamHome || 'Domicile';
      const quarterDuration = 600;
      const descMap = (a) => {
        const p = State.players[a.pid];
        const num = p ? `#${p.number}` : '#?';
        switch (a.type) {
          case 'SHOT':
            if (a.made) return `Tir ${a.val}pts ${num}`;
            return `Tir Rate ${a.val}pts ${num}`;
          case 'OREB':
            return `Rebond Off ${num}`;
          case 'DREB':
            return `Rebond Def ${num}`;
          case 'STL':
            return `Interception ${num}`;
          case 'BLK':
            return `Contre ${num}`;
          case 'TOV':
            return `Ballon Perdu ${num}`;
          case 'FOUL':
            return `Faute ${num}`;
          case 'FT':
            return `Tir Rate ${a.ftMade || 0}/${a.ftAtt || 0} ${num}`;
          case 'SUB':
            return `Chgmt ${num} -> #${State.players[a.inId]?.number || '?'}`;
          case 'TIMEOUT':
            return `Timeout  ${a.team === 'home' ? teamHome : State.match.opponent}`;
          case 'STOPPAGE':
            return `Arret Chrono ${a.duration || 0}s`;
          default:
            return `${a.type} ${num}`;
        }
      };
      const toElapsed = (a) => {
        const qOffset = ((a.q || 1) - 1) * quarterDuration;
        const elapsed = qOffset + (quarterDuration - (a.time || 0));
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };
      let csv = 'Temps,Action\n';
      State.actions.forEach((a) => {
        const time = toElapsed(a);
        const desc = descMap(a).replace(/,/g, ';');
        csv += `${time},${desc}\n`;
      });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `match_logs_${State.match.opponent}_${State.match.date || 'live'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      if (live.UI) live.UI.toast('CSV exporté');
    },

    getScoreFromActions(upToIndex) {
      const State = window.LiveState;
      let home = 0, away = 0;
      for (let i = 0; i <= upToIndex; i++) {
        const a = State.actions[i], p = State.players[a.pid];
        if (!p) continue;
        if (a.type === 'SHOT' && a.made) {
          if (p.team === 'home') home += a.val;
          else away += a.val;
        }
        if (a.type === 'FT' && a.ftMade > 0) {
          if (p.team === 'home') home += a.ftMade;
          else away += a.ftMade;
        }
      }
      return { home, away };
    },

    getScore() {
      const State = window.LiveState;
      let home = 0, away = 0;
      State.actions.forEach((a) => {
        const p = State.players[a.pid];
        if (!p) return;
        if (a.type === 'SHOT' && a.made) {
          if (p.team === 'home') home += a.val;
          else away += a.val;
        }
        if (a.type === 'FT' && a.ftMade > 0) {
          if (p.team === 'home') home += a.ftMade;
          else away += a.ftMade;
        }
      });
      return { home, away };
    },

    showQuarterModal() {
      const State = window.LiveState;
      const live = window._live || {};
      if (live.UI) live.UI.showModal(
        'Période',
        '',
        [1, 2, 3, 4, 5].map((q) => ({
          text: q < 5 ? `Q${q}` : 'OT',
          action: `GameEngine.setQ(${q})`,
          class: State.match.quarter === q ? 'prim' : '',
        })),
        'g-5'
      );
    },
    setQ(q) {
      const State = window.LiveState;
      const live = window._live || {};
      State.match.quarter = q;
      if (live.UI) { live.UI.closeModal(); live.UI.updateHeader(); live.UI.updateFoulsDisplay(); }
    },
    showInsertAction(insertIdx) {
      const State = window.LiveState;
      const live = window._live || {};
      const all = Object.values(State.players);
      let defTime = State.match.time, defQ = State.match.quarter;
      if (insertIdx < State.actions.length) {
        defTime = State.actions[insertIdx].time;
        defQ = State.actions[insertIdx].q;
      } else if (State.actions.length > 0) {
        defTime = State.actions[State.actions.length - 1].time;
        defQ = State.actions[State.actions.length - 1].q;
      }
      const defM = Math.floor(defTime / 60), defS = defTime % 60;
      let html = `<div style="margin-bottom:10px;"><label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">Joueur</label><select id="insP" class="inp">${all.map((x) => `<option value="${x.id}">#${x.number} ${x.name}</option>`).join('')}</select></div>`;
      html += `<div style="margin-bottom:10px;"><label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">Type</label><select id="insT" class="inp" onchange="GameEngine.toggleInsertFields()"><option value="SHOT">Tir</option><option value="OREB">Reb Off</option><option value="DREB">Reb Def</option><option value="STL">Interception</option><option value="TOV">Perte</option><option value="FOUL">Faute</option><option value="FT">Lancers Francs</option><option value="BLK">Contre</option><option value="STOPPAGE">Arrêt Chrono</option></select></div>`;
      html += `<div id="insShot" style="margin-bottom:10px;"><div style="display:flex;gap:8px;"><div style="flex:1;"><label style="font-size:0.75rem;color:var(--text-muted);">Valeur</label><select id="insV" class="inp"><option value="2">2pts</option><option value="3">3pts</option></select></div><div style="flex:1;"><label style="font-size:0.75rem;color:var(--text-muted);">Résultat</label><select id="insM" class="inp"><option value="1">Réussi</option><option value="0">Raté</option></select></div></div></div>`;
      html += `<div id="insFT" style="margin-bottom:10px;display:none;"><div style="display:flex;gap:8px;"><div style="flex:1;"><label style="font-size:0.75rem;color:var(--text-muted);">Réussis</label><input type="number" id="insFTM" class="inp" value="0" min="0" max="3"></div><div style="flex:1;"><label style="font-size:0.75rem;color:var(--text-muted);">Tentés</label><input type="number" id="insFTA" class="inp" value="2" min="0" max="3"></div></div></div>`;
      html += `<div id="insFoulVic" style="margin-bottom:10px;display:none;"><label style="font-size:0.75rem;color:var(--text-muted);">Type de faute</label><select id="insFoulType" class="inp"><option value="personal">🚨 Personnelle</option><option value="shooting">🎯 Sur tir</option><option value="technical">🟡 Technique</option><option value="unsportsmanlike">🟥 Antisportive</option><option value="offensive">🔄 Offensive</option></select>`;
      html += `<div id="insStoppage" style="margin-bottom:10px;display:none;"><label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">Durée arrêt (secondes)</label><input type="number" id="insDuration" class="inp" value="30" min="1" max="600"></div>`;
      html += `<div style="margin-bottom:10px;"><label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">Temps (Q${defQ})</label><div style="display:flex;gap:8px;align-items:center;"><input type="number" id="insMin" class="inp" value="${defM}" min="0" max="10" style="width:60px;text-align:center;"><span style="font-weight:800;">:</span><input type="number" id="insSec" class="inp" value="${defS}" min="0" max="59" style="width:60px;text-align:center;"></div></div>`;
      html += `<input type="hidden" id="insQ" value="${defQ}">`;
      if (live.UI) live.UI.showModal(
        '➕ Insérer action',
        html,
        [
          { text: 'Annuler', action: 'UI.closeModal()', class: '' },
          { text: '✔ Insérer', action: `GameEngine.confirmInsert(${insertIdx})`, class: 'prim' },
        ],
        'g-2'
      );
    },

    toggleInsertFields() {
      const type = document.getElementById('insT').value;
      document.getElementById('insShot').style.display = type === 'SHOT' ? 'block' : 'none';
      document.getElementById('insFT').style.display = type === 'FT' ? 'block' : 'none';
      document.getElementById('insStoppage').style.display =
        type === 'STOPPAGE' ? 'block' : 'none';
    },

    confirmInsert(insertIdx) {
      const State = window.LiveState;
      const live = window._live || {};
      const pid = parseInt(document.getElementById('insP').value);
      const type = document.getElementById('insT').value;
      const q = parseInt(document.getElementById('insQ').value);
      const time = Math.max(
        0,
        (parseInt(document.getElementById('insMin').value) || 0) * 60 +
          (parseInt(document.getElementById('insSec').value) || 0)
      );
      const action = {
        id: Date.now(),
        type,
        pid,
        time,
        q,
        onCourt: [...State.onCourt.home, ...State.onCourt.away],
      };
      if (type === 'SHOT') {
        action.val = parseInt(document.getElementById('insV').value);
        action.made = document.getElementById('insM').value === '1';
      }
      if (type === 'FT') {
        action.ftMade = parseInt(document.getElementById('insFTM').value) || 0;
        action.ftAtt = parseInt(document.getElementById('insFTA').value) || 0;
      }
      if (type === 'STOPPAGE') {
        action.duration = parseInt(document.getElementById('insDuration').value) || 30;
        action.pid = 0;
      }
      State.actions.splice(insertIdx, 0, action);
      this.recalc();
      if (live.UI) { live.UI.closeModal(); live.UI.renderRoster(); live.UI.updateHeader(); live.UI.renderPBP(); live.UI.toast('Action insérée'); }
      if (live.Court) live.Court.draw();
      if (live.WormChart) live.WormChart.draw();
    },

    async saveToFirebase() {
      const State = window.LiveState;
      const live = window._live || {};
      const db = window.db;
      const firebaseGames = window.firebaseGames;
      if (!db) { if (live.UI) live.UI.toast('Non connecté', 'error'); return; }
      if (live.UI) live.UI.setSyncStatus('syncing');
      const scores = this.getScore();
      const playerStats = {};
      Object.values(State.players)
        .filter((p) => p.team === 'home')
        .forEach((p) => {
          playerStats[p.id] = {
            pts: p.stats.pts,
            reb: p.stats.oreb + p.stats.dreb,
            oreb: p.stats.oreb,
            dreb: p.stats.dreb,
            ast: p.stats.ast,
            stl: p.stats.stl,
            blk: p.stats.blk,
            tov: p.stats.tov,
            fga: p.stats.fga,
            fgm: p.stats.fgm,
            threePA: p.stats.fg3a,
            threePM: p.stats.fg3m,
            fta: p.stats.fta,
            ftm: p.stats.ftm,
            pf: p.stats.fouls,
            minutes: Math.round(p.stats.min / 60),
            plusMinus: p.stats.plusMinus,
            foulDrawn: p.stats.foulDrawn || 0,
            blkAgainst: p.stats.blkAgainst || 0,
          };
        });
      const opponentStats = {
        pts: scores.away,
        reb: 0,
        oreb: 0,
        tov: 0,
        fouls: 0,
        fga: 0,
        fgm: 0,
      };
      const opponentPlayerStats = {};
      Object.values(State.players)
        .filter((p) => p.team === 'away')
        .forEach((p) => {
          opponentStats.reb += p.stats.oreb + p.stats.dreb;
          opponentStats.oreb += p.stats.oreb;
          opponentStats.tov += p.stats.tov;
          opponentStats.fouls += p.stats.fouls;
          opponentStats.fga += p.stats.fga + p.stats.fg3a;
          opponentStats.fgm += p.stats.fgm + p.stats.fg3m;
          opponentPlayerStats[p.id] = {
            pts: p.stats.pts,
            reb: p.stats.oreb + p.stats.dreb,
            oreb: p.stats.oreb,
            dreb: p.stats.dreb,
            ast: p.stats.ast,
            stl: p.stats.stl,
            blk: p.stats.blk,
            tov: p.stats.tov,
            fga: p.stats.fga,
            fgm: p.stats.fgm,
            threePA: p.stats.fg3a,
            threePM: p.stats.fg3m,
            fta: p.stats.fta,
            ftm: p.stats.ftm,
            pf: p.stats.fouls,
            minutes: Math.round(p.stats.min / 60),
            plusMinus: p.stats.plusMinus,
            number: p.number,
            name: p.name,
            foulDrawn: p.stats.foulDrawn || 0,
            blkAgainst: p.stats.blkAgainst || 0,
          };
        });
      const game = {
        id: State.match.id.toString(36),
        date: State.match.date,
        opponent: State.match.opponent,
        homeScore: scores.home,
        awayScore: scores.away,
        phase: State.match.phase,
        playerStats,
        opponentStats,
        opponentPlayerStats,
        starters: State.starters,
        opponentStarters: State.opponentStarters,
        actions: State.actions,
        specialFouls: State.specialFouls,
        scoreHistory: State.scoreHistory || [],
      };
      if (live.CoachReport && live.CoachReport.getLastReport()) {
        game.coachReport = live.CoachReport.getLastReport();
      }
      if (firebaseGames) {
        const idx = firebaseGames.findIndex(function(g) { return g.id === game.id; });
        if (idx >= 0) firebaseGames[idx] = game;
        else firebaseGames.unshift(game);
      }
      try {
        var wk = sessionStorage.getItem('statchamp_wk') || '';
        console.log('wk au moment du save:', JSON.stringify(wk));
        await db
          .collection('games')
          .doc(game.id)
          .set(Object.assign({}, game, { _wk: wk, updatedAt: new Date().toISOString() }));
        if (live.UI) { live.UI.toast('✅ Sauvegardé !'); live.UI.setSyncStatus('online'); }
        if (live.OfflineManager) live.OfflineManager.clear();
        localStorage.removeItem('liveMatchActive');
      } catch (e) {
        console.error('saveToFirebase error:', e);
        if (live.UI) { live.UI.toast('Erreur sauvegarde', 'error'); live.UI.setSyncStatus('error'); }
      }
    },
  };
}
