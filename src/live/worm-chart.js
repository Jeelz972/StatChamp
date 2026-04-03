// src/live/worm-chart.js
// Extrait de live.html -- lit window.LiveState au moment de l'appel

export function createWormChart() {
  return {
    canvas: null,
    ctx: null,
    init() {
      this.canvas = document.getElementById('wormCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    },
    resize() {
      const p = this.canvas.parentElement;
      this.canvas.width = p.clientWidth * 2;
      this.canvas.height = p.clientHeight * 2;
      this.draw();
    },
    draw() {
      const State = window.LiveState;
      const ctx = this.ctx,
        w = this.canvas.width,
        h = this.canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (State.scoreHistory.length < 2) return;
      const data = State.scoreHistory,
        maxDiff = Math.max(10, ...data.map((d) => Math.abs(d.home - d.away))),
        midY = h / 2;
      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = 'var(--home-color)';
      ctx.lineWidth = 3;
      data.forEach((d, i) => {
        const x = (i / (data.length - 1)) * w,
          diff = d.home - d.away,
          y = midY - (diff / maxDiff) * (h / 2 - 6);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      const last = data[data.length - 1],
        lastDiff = last.home - last.away,
        lastY = midY - (lastDiff / maxDiff) * (h / 2 - 6);
      ctx.fillStyle = lastDiff >= 0 ? 'var(--home-color)' : 'var(--away-color)';
      ctx.beginPath();
      ctx.arc(w - 3, lastY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(lastDiff > 0 ? `+${lastDiff}` : lastDiff.toString(), w - 10, lastY + 4);
    },
  };
}
