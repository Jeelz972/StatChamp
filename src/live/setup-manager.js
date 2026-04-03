// src/live/setup-manager.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createSetupManager() {
  return {
    init() {
      const State = window.LiveState;
      const firebaseRoster = window.firebaseRoster || [];
      const firebasePhases = window.firebasePhases || [];
      const db = window.db;
      const dot = document.getElementById('fbDot'),
        status = document.getElementById('fbStatus');
      if (db && firebaseRoster.length > 0) {
        dot.classList.add('ok');
        status.textContent = `✅ ${firebaseRoster.length} joueurs`;
      } else {
        dot.classList.add('err');
        status.textContent = '❌ Erreur';
      }
      document.getElementById('phaseSelect').innerHTML = firebasePhases
        .map(
          (p, i) =>
            `<button class="phase-btn ${i === 0 ? 'active' : ''}" onclick="Setup.setPhase('${p.id}', this)">${p.name}</button>`
        )
        .join('');
      document.getElementById('matchDate').value = new Date().toISOString().split('T')[0];
      State.match.phase = firebasePhases[0]?.id || 'phase1';
      this.renderRoster();
      this.renderOpp();

      // >>> NOUVEAU : Vérifier si on reprend un match via URL <<<
      const urlParams = new URLSearchParams(window.location.search);
      const resumeId = urlParams.get('resume');
      if (resumeId) {
        if (this.resumeFromFirebase(resumeId)) return;
      }

      this.checkResume();
    },
    checkResume() {
      const State = window.LiveState;
      const live = window._live || {};
      const saved = live.OfflineManager ? live.OfflineManager.load() : null;
      if (saved && saved.actions?.length > 0) {
        if (confirm(`Match en cours (${saved.actions.length} actions). Reprendre ?`)) {
          Object.assign(State.match, saved.match);
          State.players = saved.players;
          State.actions = saved.actions;
          State.onCourt = saved.onCourt;
          State.starters = saved.starters;
          State.opponentStarters = saved.opponentStarters || { 1: [], 2: [], 3: [], 4: [] };
          State.teamFouls = saved.teamFouls;
          State.scoreHistory = saved.scoreHistory || [];
          State.specialFouls = saved.specialFouls || {
            technical: [],
            unsportsmanlike: [],
            offensive: [],
          };
          document.getElementById('setupScreen').classList.add('hidden');
          document.getElementById('app').style.display = 'flex';
          document.getElementById('lblAway').textContent = State.match.opponent;
          if (live.Court) live.Court.init();
          if (live.UI) live.UI.init();
          if (live.WormChart) live.WormChart.init();
          if (live.ContextManager) live.ContextManager.render();
          if (live.TimelineFloat) live.TimelineFloat.render();

          // Reprendre les timeouts sauvegardés
          if (saved.timeouts) State.timeouts = saved.timeouts;
          if (live.TimeoutManager) live.TimeoutManager.renderDots();
          if (live.QuickStats) live.QuickStats.render();
          if (live.KeyboardShortcuts) live.KeyboardShortcuts.init();
          if (live.GameEngine) live.GameEngine.startAutoSave();
          window.addEventListener('beforeunload', function(e) {
            if (State.match.running || State.actions.length > 0) {
              e.preventDefault();
              e.returnValue = '';
            }
          });
          return;
        } else {
          if (live.OfflineManager) live.OfflineManager.clear();
        }
      }
    },
    renderRoster() {
      const State = window.LiveState;
      const firebaseRoster = window.firebaseRoster || [];
      const div = document.getElementById('rosterList');
      if (!firebaseRoster.length) {
        div.innerHTML =
          '<div style="padding:12px;text-align:center;color:var(--text-muted)">Aucun joueur</div>';
        return;
      }
      div.innerHTML = firebaseRoster
        .map(
          (p) =>
            `<div class="player-check"><input type="checkbox" id="p${p.id}" checked onchange="Setup.toggle(${p.id})"><label for="p${p.id}"><b>#${p.number}</b> ${p.name}</label></div>`
        )
        .join('');
      State.selectedIds = firebaseRoster.map((p) => p.id);
      document.getElementById('startBtn').disabled = false;
    },
    resumeFromFirebase(gameId) {
      const State = window.LiveState;
      const live = window._live || {};
      const firebaseRoster = window.firebaseRoster || [];
      const firebasePhases = window.firebasePhases || [];
      const firebaseGames = window.firebaseGames || [];
      const game = firebaseGames.find((g) => g.id === gameId);
      if (!game) {
        alert('Match introuvable dans Firebase (id: ' + gameId + ')');
        history.replaceState(null, '', 'live.html');
        return false;
      }

      // --- Reconstruction du State.match ---
      State.match.id = game.id;
      State.match.date = game.date;
      State.match.opponent = game.opponent || 'Adversaire';
      State.match.phase = game.phase || firebasePhases[0]?.id || 'phase1';
      State.match.isHome = true;

      // Déterminer le dernier quarter joué et le temps restant
      if (game.actions?.length > 0) {
        const lastAction = game.actions[game.actions.length - 1];
        State.match.quarter = lastAction.q || 1;
        State.match.time = lastAction.time ?? 0;
      } else {
        State.match.quarter = 1;
        State.match.time = 600;
      }

      // --- Reconstruction des joueurs domicile ---
      State.players = {};
      if (game.playerStats) {
        Object.entries(game.playerStats).forEach(([id, stats]) => {
          const numId = parseInt(id);
          const rosterPlayer = firebaseRoster.find((p) => p.id === numId);
          if (!rosterPlayer) return;
          State.players[numId] = {
            id: numId,
            number: rosterPlayer.number,
            name: rosterPlayer.name,
            team: 'home',
            stats: {
              pts: stats.pts || 0,
              oreb: stats.oreb || 0,
              dreb: stats.dreb || 0,
              ast: stats.ast || 0,
              stl: stats.stl || 0,
              blk: stats.blk || 0,
              tov: stats.tov || 0,
              fouls: stats.pf || 0,
              foulDrawn: stats.foulDrawn || 0,
              fgm: stats.fgm || 0,
              fga: stats.fga || 0,
              fg3m: stats.threePM || 0,
              fg3a: stats.threePA || 0,
              ftm: stats.ftm || 0,
              fta: stats.fta || 0,
              min: (stats.minutes || 0) * 60,
              plusMinus: stats.plusMinus || 0,
            },
          };
        });
      }

      // --- Reconstruction des joueurs adverses ---
      if (game.opponentPlayerStats) {
        Object.entries(game.opponentPlayerStats).forEach(([id, stats]) => {
          const numId = parseInt(id);
          State.players[numId] = {
            id: numId,
            number: stats.number || '?',
            name: stats.name || `Adv #${stats.number || numId}`,
            team: 'away',
            stats: {
              pts: stats.pts || 0,
              oreb: stats.oreb || 0,
              dreb: stats.dreb || 0,
              ast: stats.ast || 0,
              stl: stats.stl || 0,
              blk: stats.blk || 0,
              tov: stats.tov || 0,
              fouls: stats.pf || 0,
              foulDrawn: stats.foulDrawn || 0,
              fgm: stats.fgm || 0,
              fga: stats.fga || 0,
              fg3m: stats.threePM || 0,
              fg3a: stats.threePA || 0,
              ftm: stats.ftm || 0,
              fta: stats.fta || 0,
              min: (stats.minutes || 0) * 60,
              plusMinus: stats.plusMinus || 0,
            },
          };
        });
      }

      // --- Reconstruction des actions ---
      State.actions = game.actions || [];

      // --- Reconstruction des starters par quarter ---
      State.starters = game.starters || {};

      // --- Reconstruction du onCourt depuis les dernières SUB ou starters ---
      const homePlayers = Object.values(State.players)
        .filter((p) => p.team === 'home')
        .map((p) => p.id);
      const awayPlayers = Object.values(State.players)
        .filter((p) => p.team === 'away')
        .map((p) => p.id);

      const currentQ = State.match.quarter;
      const qStarters =
        State.starters[currentQ] || State.starters[1] || homePlayers.slice(0, 5);
      let homeOnCourt = [...qStarters];

      State.actions
        .filter((a) => a.type === 'SUB' && (a.q || 1) === currentQ)
        .forEach((a) => {
          const pid = a.pid;
          const subOut = a.subOut;
          if (subOut && homeOnCourt.includes(subOut)) {
            homeOnCourt = homeOnCourt.filter((id) => id !== subOut);
            if (!homeOnCourt.includes(pid)) homeOnCourt.push(pid);
          }
        });

      State.onCourt.home = homeOnCourt.slice(0, 5);
      State.onCourt.away = awayPlayers.slice(0, 5);

      // --- Reconstruction des fautes d'équipe par quarter ---
      State.teamFouls = { home: [0, 0, 0, 0, 0], away: [0, 0, 0, 0, 0] };
      State.actions
        .filter((a) => a.type === 'FOUL')
        .forEach((a) => {
          const p = State.players[a.pid];
          if (!p) return;
          const q = (a.q || 1) - 1;
          if (q >= 0 && q < 5) {
            State.teamFouls[p.team][q]++;
          }
        });

      // --- Reconstruction du scoreHistory ---
      State.scoreHistory = game.scoreHistory || [];
      if (State.scoreHistory.length === 0) {
        State.scoreHistory.push({ time: 600, q: 1, home: 0, away: 0 });
      }

      // --- Reconstruction des fautes spéciales ---
      State.specialFouls = game.specialFouls || {
        technical: [],
        unsportsmanlike: [],
        offensive: [],
      };
      if (game.playTypes) State.playTypes = game.playTypes;

      // --- Lancement de l'interface ---
      document.getElementById('setupScreen').classList.add('hidden');
      document.getElementById('app').style.display = 'flex';
      document.getElementById('lblAway').textContent = State.match.opponent;

      if (live.Court) live.Court.init();
      if (live.UI) live.UI.init();
      if (live.WormChart) live.WormChart.init();
      if (live.ContextManager) live.ContextManager.render();
      if (live.TimelineFloat) live.TimelineFloat.render();

      if (live.OfflineManager) live.OfflineManager.save();
      if (live.GameEngine) live.GameEngine.startAutoSave();

      if (live.UI) live.UI.toast(`Match vs ${game.opponent} repris (${State.actions.length} actions)`);
      history.replaceState(null, '', 'live.html');
      return true;
    },
    toggle(id) {
      const State = window.LiveState;
      const i = State.selectedIds.indexOf(id);
      if (i >= 0) State.selectedIds.splice(i, 1);
      else State.selectedIds.push(id);
    },
    renderOpp() {
      const State = window.LiveState;
      document.getElementById('oppRosterList').innerHTML = State.oppPlayers
        .map(
          (p, i) =>
            `<div class="opp-row"><input value="${p.num}" placeholder="#" onchange="Setup.updateOpp(${i},'num',this.value)"><input value="${p.name}" placeholder="Nom" onchange="Setup.updateOpp(${i},'name',this.value)"><button class="del" onclick="Setup.delOpp(${i})">×</button></div>`
        )
        .join('');
    },
    updateOpp(i, k, v) {
      const State = window.LiveState;
      State.oppPlayers[i][k] = v;
    },
    addOpp() {
      const State = window.LiveState;
      State.oppPlayers.push({ num: '', name: '' });
      this.renderOpp();
    },
    delOpp(i) {
      const State = window.LiveState;
      if (State.oppPlayers.length > 1) {
        State.oppPlayers.splice(i, 1);
        this.renderOpp();
      }
    },
    setPhase(id, btn) {
      const State = window.LiveState;
      document.querySelectorAll('.phase-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      State.match.phase = id;
    },
    setLoc(loc) {
      const State = window.LiveState;
      State.match.isHome = loc === 'home';
      document.getElementById('btnHome').classList.toggle('active', loc === 'home');
      document.getElementById('btnAway').classList.toggle('active', loc === 'away');
    },
    startMatch() {
      const State = window.LiveState;
      const live = window._live || {};
      const firebaseRoster = window.firebaseRoster || [];
      const customDate = document.getElementById('matchDate').value;
      State.match.id = Date.now();
      localStorage.setItem('liveMatchActive', Date.now().toString());
      const dateParts = customDate.split('-');
      State.match.date =
        dateParts.length === 3
          ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          : new Date().toLocaleDateString('fr-FR');

      State.match.opponent = document.getElementById('oppName').value || 'Adversaire';
      document.getElementById('lblAway').textContent = State.match.opponent;
      State.selectedIds.forEach((id) => {
        const p = firebaseRoster.find((x) => x.id === id);
        if (p)
          State.players[p.id] = {
            id: p.id,
            number: p.number,
            name: p.name,
            team: 'home',
            status: p.status || 'available',
            stats: {
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
              min: 0,
              plusMinus: 0,
            },
          };
      });
      State.oppPlayers
        .filter((p) => p.num)
        .forEach((p, i) => {
          const id = 1000 + i;
          State.players[id] = {
            id,
            number: p.num,
            name: p.name || `Adv ${p.num}`,
            team: 'away',
            stats: {
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
              min: 0,
              plusMinus: 0,
            },
          };
        });
      State.onCourt.home = Object.values(State.players)
        .filter((p) => p.team === 'home')
        .slice(0, 5)
        .map((p) => p.id);
      State.onCourt.away = Object.values(State.players)
        .filter((p) => p.team === 'away')
        .slice(0, 5)
        .map((p) => p.id);
      State.scoreHistory.push({ time: 600, q: 1, home: 0, away: 0 });
      document.getElementById('setupScreen').classList.add('hidden');
      document.getElementById('app').style.display = 'flex';
      if (live.Court) live.Court.init();
      if (live.UI) live.UI.init();
      if (live.WormChart) live.WormChart.init();
      if (live.ContextManager) live.ContextManager.render();
      if (live.TimelineFloat) live.TimelineFloat.render();

      if (live.TimeoutManager) live.TimeoutManager.renderDots();
      if (live.QuickStats) live.QuickStats.render();
      if (live.KeyboardShortcuts) live.KeyboardShortcuts.init();
      if (live.GameEngine) live.GameEngine.startAutoSave();
      window.addEventListener('beforeunload', function(e) {
        if (State.match.running || State.actions.length > 0) {
          e.preventDefault();
          e.returnValue = '';
        }
      });
      if (live.StartersModal) live.StartersModal.show(1);
    },
  };
}
