// src/live/court.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createCourt() {
  return {
    cvs: null,
    ctx: null,
    scale: 1,
    offset: { x: 0, y: 0 },
    init() {
      const live = window._live || {};
      this.cvs = document.getElementById('courtCanvas');
      this.ctx = this.cvs.getContext('2d');
      window.addEventListener('resize', () => this.resize());

      if (window.matchMedia) {
        window.matchMedia('(orientation: portrait)').addEventListener('change', () => {
          setTimeout(() => {
            this.resize();
            if (live.WormChart) live.WormChart.resize();
          }, 100);
        });
      }
      const handler = (e) => {
        if (e.target.closest('.foul-panel') || e.target.closest('.court-popup')) return;
        e.preventDefault();
        const r = this.cvs.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX,
          cy = e.touches ? e.touches[0].clientY : e.clientY;
        const canvasX = (cx - r.left) * (this.cvs.width / r.width),
          canvasY = (cy - r.top) * (this.cvs.height / r.height);
        const mx = (canvasX - this.offset.x) / this.scale,
          my = (canvasY - this.offset.y) / this.scale;
        if (mx < -0.5 || mx > 28.5 || my < -0.5 || my > 15.5) return;
        const d1 = Math.sqrt(Math.pow(mx - 1.575, 2) + Math.pow(my - 7.5, 2)),
          d2 = Math.sqrt(Math.pow(mx - 26.425, 2) + Math.pow(my - 7.5, 2));
        const val = Math.min(d1, d2) > 6.75 ? 3 : 2;
        if (live.GameEngine) live.GameEngine.handleCourtClick(mx, my, val, cx, cy);
      };
      this.cvs.addEventListener('mousedown', handler);
      this.cvs.addEventListener('touchstart', handler);
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.court-popup') && !e.target.closest('#courtCanvas'))
          if (live.CourtFirst) live.CourtFirst.hide();
      });
      this.resize();
    },
    resize() {
      const p = this.cvs.parentElement;
      if (!p) return;
      this.cvs.width = p.clientWidth * 2;
      this.cvs.height = p.clientHeight * 2;
      const sW = this.cvs.width / 28,
        sH = this.cvs.height / 15;
      this.scale = Math.min(sW, sH) * 0.95;
      this.offset = {
        x: (this.cvs.width - 28 * this.scale) / 2,
        y: (this.cvs.height - 15 * this.scale) / 2,
      };
      this.draw();
    },
    draw() {
      const State = window.LiveState;
      const ctx = this.ctx,
        s = this.scale,
        ox = this.offset.x,
        oy = this.offset.y;
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, 28 * s, 15 * s);
      ctx.clip();
      ctx.fillStyle = '#c9a66b';
      ctx.fillRect(ox, oy, 28 * s, 15 * s);
      ctx.restore();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = Math.max(2, 0.05 * s);
      ctx.strokeRect(ox, oy, 28 * s, 15 * s);
      ctx.beginPath();
      ctx.moveTo(ox + 14 * s, oy);
      ctx.lineTo(ox + 14 * s, oy + 15 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ox + 14 * s, oy + 7.5 * s, 1.8 * s, 0, Math.PI * 2);
      ctx.stroke();
      this.drawHalf(ctx, s, ox, oy, true);
      this.drawHalf(ctx, s, ox, oy, false);
      this.drawShots(ctx, s, ox, oy);
    },
    drawHalf(ctx, s, ox, oy, left) {
      const bx = left ? 1.575 : 26.425,
        px = left ? 0 : 28 - 5.8,
        pe = left ? 5.8 : 28 - 5.8;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = Math.max(2, 0.05 * s);
      ctx.strokeRect(ox + px * s, oy + 5.05 * s, 5.8 * s, 4.9 * s);
      ctx.beginPath();
      if (left) ctx.arc(ox + pe * s, oy + 7.5 * s, 1.8 * s, -Math.PI / 2, Math.PI / 2);
      else ctx.arc(ox + pe * s, oy + 7.5 * s, 1.8 * s, Math.PI / 2, -Math.PI / 2);
      ctx.stroke();
      const r = 6.75,
        cy = 0.9,
        dy = 7.5 - cy,
        dx = Math.sqrt(r * r - dy * dy);
      ctx.beginPath();
      if (left) {
        ctx.moveTo(ox, oy + cy * s);
        ctx.lineTo(ox + (bx + dx) * s, oy + cy * s);
        ctx.arc(ox + bx * s, oy + 7.5 * s, r * s, -Math.acos(dx / r), Math.acos(dx / r));
        ctx.lineTo(ox, oy + (15 - cy) * s);
      } else {
        ctx.moveTo(ox + 28 * s, oy + cy * s);
        ctx.lineTo(ox + (bx - dx) * s, oy + cy * s);
        ctx.arc(
          ox + bx * s,
          oy + 7.5 * s,
          r * s,
          Math.PI + Math.acos(dx / r),
          Math.PI - Math.acos(dx / r),
          true
        );
        ctx.lineTo(ox + 28 * s, oy + (15 - cy) * s);
      }
      ctx.stroke();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = Math.max(2, 0.04 * s);
      ctx.beginPath();
      ctx.arc(ox + bx * s, oy + 7.5 * s, 0.225 * s, 0, Math.PI * 2);
      ctx.stroke();
    },
    drawShots(ctx, s, ox, oy) {
      const State = window.LiveState;
      State.actions
        .filter((a) => a.type === 'SHOT' && a.x != null)
        .forEach((a) => {
          const cx = ox + a.x * s,
            cy = oy + a.y * s;
          ctx.beginPath();
          ctx.arc(cx, cy, 0.3 * s, 0, Math.PI * 2);
          ctx.fillStyle = a.made ? '#22c55e' : '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${0.25 * s}px Inter`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(a.val, cx, cy);
        });
    },
    showMsg(txt) {
      const el = document.getElementById('overlayMsg');
      el.textContent = txt;
      el.classList.add('show');
    },
    hideMsg() {
      document.getElementById('overlayMsg').classList.remove('show');
    },
  };
}
