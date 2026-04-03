// src/live/lineup-tracker.js
// Extrait de live.html -- lit window.LiveState au moment de l'appel

export function createLineupTracker() {
  return {
    render() {
      const State = window.LiveState;
      const el = document.getElementById('lineupPM');
      if (!el) return;
      // Trouver le dernier SUB ou le début du quart courant
      let startIdx = 0;
      const currentQ = State.match.quarter;
      for (let i = State.actions.length - 1; i >= 0; i--) {
        const a = State.actions[i];
        if (a.type === 'SUB' && (a.q || 1) === currentQ) { startIdx = i + 1; break; }
        if ((a.q || 1) < currentQ) { startIdx = i + 1; break; }
      }
      // Calculer le +/- home depuis startIdx
      let pm = 0;
      for (let i = startIdx; i < State.actions.length; i++) {
        const a = State.actions[i];
        const p = State.players[a.pid];
        if (!p) continue;
        if (a.type === 'SHOT' && a.made) pm += p.team === 'home' ? a.val : -a.val;
        if (a.type === 'FT' && (a.ftMade || 0) > 0) pm += p.team === 'home' ? a.ftMade : -a.ftMade;
      }
      if (State.actions.length === 0) { el.style.display = 'none'; return; }
      el.style.display = 'inline-block';
      if (pm > 0) {
        el.textContent = '+' + pm;
        el.style.background = 'rgba(34,197,94,0.2)';
        el.style.color = '#4ade80';
      } else if (pm < 0) {
        el.textContent = '' + pm;
        el.style.background = 'rgba(239,68,68,0.2)';
        el.style.color = '#f87171';
      } else {
        el.textContent = '0';
        el.style.background = 'rgba(100,116,139,0.2)';
        el.style.color = '#94a3b8';
      }
    },
  };
}
