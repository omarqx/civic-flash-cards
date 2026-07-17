/**
 * <civic-celebration> — confetti + flags canvas burst.
 * Call blast() to fire. Respects prefers-reduced-motion (no-op).
 * Removes its canvas automatically when particles settle (~4s).
 */
interface Particle {
  x: number; y: number; vx: number; vy: number;
  rot: number; vrot: number; size: number;
  kind: 'rect' | 'star' | 'flag';
  color: string;
}

const COLORS = ['#9E2B25', '#20345C', '#B08D3E', '#FFFDF7'];

export class CivicCelebration extends HTMLElement {
  private raf = 0;

  blast() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'celebration-canvas';
    canvas.width = innerWidth; canvas.height = innerHeight;
    this.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    const parts: Particle[] = [];
    const spawn = (cx: number, angle: number) => {
      for (let i = 0; i < 90; i++) {
        const speed = 8 + Math.random() * 9;
        const a = angle + (Math.random() - 0.5) * 0.9;
        const r = Math.random();
        parts.push({
          x: cx, y: innerHeight + 10,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.3,
          size: r > 0.9 ? 22 : 6 + Math.random() * 8,
          kind: r > 0.9 ? 'flag' : r > 0.72 ? 'star' : 'rect',
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    };
    spawn(innerWidth * 0.22, -Math.PI / 2 - 0.35);
    spawn(innerWidth * 0.78, -Math.PI / 2 + 0.35);
    setTimeout(() => spawn(innerWidth * 0.5, -Math.PI / 2), 350);

    const start = performance.now();
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of parts) {
        p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
        if (p.y < innerHeight + 40) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        if (p.kind === 'flag') {
          ctx.font = `${p.size}px serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('🇺🇸', 0, 0);
        } else if (p.kind === 'star') {
          ctx.font = `${p.size * 1.6}px serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = p.color;
          ctx.fillText('★', 0, 0);
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
      if (alive && performance.now() - start < 6000) {
        this.raf = requestAnimationFrame(tick);
      } else {
        canvas.remove();
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  disconnectedCallback() { cancelAnimationFrame(this.raf); }
}

customElements.define('civic-celebration', CivicCelebration);
