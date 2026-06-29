'use client';

import { useEffect, useRef } from 'react';

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const nodes = [
      { x: 0.16, y: 0.28, label: 'UI' },
      { x: 0.36, y: 0.2, label: 'Hook' },
      { x: 0.58, y: 0.34, label: 'Worker' },
      { x: 0.82, y: 0.22, label: 'CPU' },
      { x: 0.72, y: 0.68, label: 'Result' },
      { x: 0.3, y: 0.72, label: 'Paint' },
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [4, 5],
      [5, 0],
    ];

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
      ctx.fillRect(0, 0, width, height);

      const t = time / 1000;
      ctx.lineWidth = 1;

      edges.forEach(([from, to], index) => {
        const start = nodes[from];
        const end = nodes[to];
        const sx = start.x * width;
        const sy = start.y * height;
        const ex = end.x * width;
        const ey = end.y * height;
        const pulse = reduceMotion ? 0.5 : (Math.sin(t * 1.8 + index) + 1) / 2;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = `rgba(31, 122, 77, ${0.18 + pulse * 0.22})`;
        ctx.stroke();

        if (!reduceMotion) {
          const px = sx + (ex - sx) * ((t * 0.18 + index * 0.17) % 1);
          const py = sy + (ey - sy) * ((t * 0.18 + index * 0.17) % 1);
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(31, 122, 77, 0.85)';
          ctx.fill();
        }
      });

      nodes.forEach((node, index) => {
        const x = node.x * width;
        const y = node.y * height;
        const lift = reduceMotion ? 0 : Math.sin(t * 1.4 + index) * 3;

        ctx.beginPath();
        ctx.roundRect(x - 34, y - 20 + lift, 68, 40, 10);
        ctx.fillStyle = index === 2 ? '#1f7a4d' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = index === 2 ? '#135c39' : '#cfd8cc';
        ctx.stroke();

        ctx.fillStyle = index === 2 ? '#ffffff' : '#253027';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, x, y + lift);
      });

      if (!reduceMotion) {
        animationFrame = requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    draw(0);
    if (!reduceMotion) {
      animationFrame = requestAnimationFrame(draw);
    }

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />;
}
