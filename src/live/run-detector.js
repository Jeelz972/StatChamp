// src/live/run-detector.js
// Extrait de live.html -- lit window.LiveState au moment de l'appel

export function createRunDetector() {
  return {
    threshold: 8,
    check() {
      const State = window.LiveState;
      const recent = State.scoreHistory.slice(-20);
      if (recent.length < 2) return;
      const last = recent[recent.length - 1];
      let homeRun = 0, awayRun = 0;
      for (let i = recent.length - 2; i >= 0; i--) {
        const pt = recent[i],
          hG = last.home - pt.home,
          aG = last.away - pt.away;
        if (aG === 0 && hG > homeRun) homeRun = hG;
        if (hG === 0 && aG > awayRun) awayRun = aG;
      }
      const alertH = document.getElementById('runAlertHome'),
        alertA = document.getElementById('runAlertAway');
      if (homeRun >= this.threshold) {
        alertH.textContent = `🔥 Run ${homeRun}-0`;
        alertH.classList.add('show');
      } else {
        alertH.classList.remove('show');
      }
      if (awayRun >= this.threshold) {
        alertA.textContent = `⚠️ Run ${awayRun}-0`;
        alertA.classList.add('show');
      } else {
        alertA.classList.remove('show');
      }
    },
  };
}
