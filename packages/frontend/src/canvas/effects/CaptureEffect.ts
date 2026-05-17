/**
 * @file CaptureEffect - 棋子捕获爆炸动画
 * 棋子被吃时渲染粒子爆炸效果。
 */

import { BaseAnimation } from '../animations/BaseAnimation';
import { BoardMetrics } from '../types/canvas';
import { Side } from '@chess/types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

/**
 * 棋子被捕获时的爆炸效果。
 * 创建向外扩散并渐隐的粒子。
 */
export class CaptureEffect extends BaseAnimation {
  readonly id: string;
  private particles: Particle[] = [];
  private x: number;
  private y: number;
  private side: Side;
  private duration: number = 800; // 毫秒

  constructor(x: number, y: number, side: Side, uniqueId: string) {
    super(`capture-${uniqueId}`);
    this.id = `capture-${uniqueId}`;
    this.x = x;
    this.y = y;
    this.side = side;
    this.initParticles();
  }

  private initParticles(): void {
    const particleCount = 20;
    const colors = this.side === Side.RED 
      ? ['#00f0ff', '#80f8ff', '#ffffff']
      : ['#ff00ff', '#ff80ff', '#ffffff'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 3;
      
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: this.duration,
        maxLife: this.duration,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  update(deltaTime: number): void {
    super.update(deltaTime);

    let allDead = true;
    
    for (const particle of this.particles) {
      if (particle.life > 0) {
        allDead = false;
        particle.x += particle.vx * deltaTime * 0.1;
        particle.y += particle.vy * deltaTime * 0.1;
        particle.vx *= 0.98; // 摩擦力
        particle.vy *= 0.98;
        particle.life -= deltaTime;
      }
    }

    if (allDead || this.elapsedTime > this.duration) {
      this.complete();
    }
  }

  render(ctx: CanvasRenderingContext2D, _metrics: BoardMetrics): void {
    for (const particle of this.particles) {
      if (particle.life <= 0) continue;

      const alpha = particle.life / particle.maxLife;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 6 * alpha;
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }
}
