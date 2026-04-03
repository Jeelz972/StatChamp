// src/live/foul-panel.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel
// Fix : guard explicite victim null pour les fautes techniques/antisportives

export function createFoulPanel() {
  return {
    ctx: {},
    show(foulerId, victimId) {
      const State = window.LiveState;
      const presetType = State.ui.ctx.foulType || null;
      this.ctx = {
        foulerId,
        victimId,
        foulType: presetType,
        ftResults: [],
        ftCount: 0,
        currentFt: 0,
      };
      const fouler = State.players[foulerId],
        victim = State.players[victimId];
      const typeLabel =
        presetType === 'technical'
          ? '🟡 Tech'
          : presetType === 'unsportsmanlike'
            ? '🟥 Anti'
            : null;
      if (presetType && presetType !== 'personal') {
        document.getElementById('foulTitle').textContent =
          `${typeLabel} #${fouler.number} sur #${victim.number}`;
        document.getElementById('foulTypes').style.display = 'flex';
        if (presetType === 'technical') {
          document.getElementById('foulTypes').innerHTML = `
                <button class="foul-type-btn" onclick="FoulPanel.selectType('technical')">🎯 1 Lancer + Possession</button>
            `;
        } else {
          document.getElementById('foulTypes').innerHTML = `
                <button class="foul-type-btn shooting" onclick="FoulPanel.selectType('unsportsmanlike')">🎯 2 Lancers + Possession</button>
            `;
        }
        document.getElementById('ftSequence').innerHTML = '';
        document.getElementById('foulPanel').classList.add('show');
      } else {
        document.getElementById('foulTitle').textContent =
          `Faute #${fouler.number} sur #${victim.number}`;
        document.getElementById('foulTypes').innerHTML = `
            <button class="foul-type-btn" onclick="FoulPanel.selectType('normal')">🏃 Normale</button>
            <button class="foul-type-btn shooting" onclick="FoulPanel.selectType('shooting')">🎯 Sur Tir</button>
            <button class="foul-type-btn tech" onclick="FoulPanel.selectType('technical')">📋 Technique</button>
            <button class="foul-type-btn unsport" onclick="FoulPanel.selectType('unsportsmanlike')">⚠️ Antisportive</button>
            <button class="foul-type-btn offensive" onclick="FoulPanel.selectType('offensive')">🔄 Offensive</button>
        `;
        document.getElementById('foulTypes').style.display = 'flex';
        document.getElementById('ftSequence').innerHTML = '';
        document.getElementById('foulPanel').classList.add('show');
      }
    },
    selectType(type) {
      if (!this.ctx.foulType) this.ctx.foulType = type;
      document.getElementById('foulTypes').style.display = 'none';
      if (type === 'technical') {
        this.ctx.ftCount = 1;
        this.showFtSequence();
      } else if (type === 'unsportsmanlike') {
        this.ctx.ftCount = 2;
        this.showFtSequence();
      } else if (type === 'offensive') {
        this.finalize();
      } else if (type === 'normal') {
        document.getElementById('foulTitle').textContent = 'Lancers francs ?';
        document.getElementById('ftSequence').innerHTML =
          `<div style="display:flex;gap:10px;"><button class="btn-mod" onclick="FoulPanel.setFtCount(0)">0 LF</button><button class="btn-mod" onclick="FoulPanel.setFtCount(2)">2 LF</button></div>`;
      } else if (type === 'shooting') {
        document.getElementById('foulTitle').textContent = 'Tir marqué (And-1) ?';
        document.getElementById('ftSequence').innerHTML =
          `<div style="display:flex;gap:10px;"><button class="btn-mod success" onclick="FoulPanel.and1(true)">✓ Marqué (1 LF)</button><button class="btn-mod danger" onclick="FoulPanel.and1(false)">✗ Raté</button></div>`;
      }
    },
    and1(made) {
      if (made) {
        this.ctx.and1 = true;
        this.ctx.ftCount = 1;
        this.showFtSequence();
      } else {
        document.getElementById('foulTitle').textContent = 'Type de tir ?';
        document.getElementById('ftSequence').innerHTML =
          `<div style="display:flex;gap:10px;"><button class="btn-mod" onclick="FoulPanel.setFtCount(2)">2 pts (2 LF)</button><button class="btn-mod" onclick="FoulPanel.setFtCount(3)">3 pts (3 LF)</button></div>`;
      }
    },
    setFtCount(count) {
      this.ctx.ftCount = count;
      if (count === 0) { this.finalize(); return; }
      this.showFtSequence();
    },
    showFtSequence() {
      this.ctx.ftResults = [];
      this.ctx.currentFt = 0;
      this.renderFtAttempt();
    },
    renderFtAttempt() {
      const n = this.ctx.currentFt + 1,
        total = this.ctx.ftCount;
      document.getElementById('foulTitle').textContent = `LF ${n}/${total}`;
      document.getElementById('ftSequence').innerHTML =
        `<div class="ft-attempt"><span class="ft-attempt-label">LF ${n}</span><button class="ft-attempt made" onclick="FoulPanel.ftResult(true)">✓</button><button class="ft-attempt miss" onclick="FoulPanel.ftResult(false)">✗</button></div>`;
    },
    ftResult(made) {
      this.ctx.ftResults.push(made);
      this.ctx.currentFt++;
      if (this.ctx.currentFt < this.ctx.ftCount) {
        this.renderFtAttempt();
      } else {
        this.finalize();
      }
    },
    showTech(foulerId, ftShooterId) {
      const State = window.LiveState;
      var fouler = State.players[foulerId];
      this.ctx = {
        foulerId: foulerId,
        victimId: null,
        ftShooterId: ftShooterId,
        foulType: 'technical',
        ftResults: [],
        ftCount: 1,
        currentFt: 0,
      };
      document.getElementById('foulTitle').textContent = '🟡 Tech #' + fouler.number + ' — LF: #' + State.players[ftShooterId].number;
      document.getElementById('foulTypes').style.display = 'none';
      document.getElementById('ftSequence').innerHTML = '';
      document.getElementById('foulPanel').classList.add('show');
      this.showFtSequence();
    },
    finalize() {
      const State = window.LiveState;
      const live = window._live || {};
      const { foulerId, victimId, foulType, ftResults, and1, ftShooterId } = this.ctx;
      const fouler = State.players[foulerId];

      // Guard : technical et unsportsmanlike n'ont pas de victim obligatoire
      let victim = null;
      if (foulType === 'technical' || foulType === 'unsportsmanlike') {
        victim = victimId ? State.players[victimId] : null;
      } else {
        // Personal/Offensive/Shooting : victim est obligatoire
        victim = victimId ? State.players[victimId] : null;
        if (!victim && foulType !== 'offensive') {
          console.error('FoulPanel: victim null pour foul type', foulType);
          this.cancel();
          return;
        }
      }

      fouler.stats.fouls++;
      if (victim) victim.stats.foulDrawn++;
      State.teamFouls[fouler.team][State.match.quarter - 1]++;

      if (foulType === 'technical')
        State.specialFouls.technical.push({ playerId: foulerId, quarter: State.match.quarter, time: State.match.time });
      else if (foulType === 'unsportsmanlike')
        State.specialFouls.unsportsmanlike.push({ playerId: foulerId, quarter: State.match.quarter, time: State.match.time, victimId });
      else if (foulType === 'offensive')
        State.specialFouls.offensive.push({ playerId: foulerId, quarter: State.match.quarter, time: State.match.time });

      var logData = { foulType: foulType || 'personal' };
      if (victimId) logData.victim = victimId;
      if (ftShooterId) logData.ftShooterId = ftShooterId;
      if (live.GameEngine) live.GameEngine.log('FOUL', this.ctx.foulerId, logData);

      if (and1 && victim) {
        const x = victim.team === 'home' ? 26.425 : 1.575;
        victim.stats.fgm++;
        victim.stats.fga++;
        victim.stats.pts += 2;
        if (live.GameEngine) {
          live.GameEngine.log('SHOT', victimId, { val: 2, made: true, x, y: 7.5, and1: true });
          live.GameEngine.updatePlusMinus(victim.team, 2);
          live.GameEngine.addScorePoint(victim.team, 2);
        }
      }

      const ftMade = ftResults.filter((r) => r).length,
        ftAtt = ftResults.length;
      if (ftAtt > 0) {
        var ftShooter = ftShooterId ? State.players[ftShooterId] : victim;
        if (ftShooter) {
          ftShooter.stats.ftm += ftMade;
          ftShooter.stats.fta += ftAtt;
          ftShooter.stats.pts += ftMade;
          ftResults.forEach((made, i) => {
            if (live.GameEngine) live.GameEngine.log('FT', ftShooter.id, {
              ftMade: made ? 1 : 0,
              ftAtt: 1,
              ftNum: i + 1,
              ftTotal: ftAtt,
            });
          });
          if (ftMade > 0 && live.GameEngine) {
            if (live.UI) live.UI.animScore(ftShooter.team);
            live.GameEngine.updatePlusMinus(ftShooter.team, ftMade);
            live.GameEngine.addScorePoint(ftShooter.team, ftMade);
          }
        }
      }

      document.getElementById('foulPanel').classList.remove('show');
      if (live.UI) {
        live.UI.renderRoster();
        live.UI.updateHeader();
        live.UI.updateFoulsDisplay();
        live.UI.renderPBP();
      }
      if (live.TimelineFloat) live.TimelineFloat.render();
      if (live.WormChart) live.WormChart.draw();
      this.ctx = {};
    },
    cancel() {
      const State = window.LiveState;
      document.getElementById('foulPanel').classList.remove('show');
      this.ctx = {};
      State.ui.pending = null;
    },
  };
}
