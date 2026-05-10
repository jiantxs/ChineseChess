/**
 * @file StarfieldEffect - Animated starfield background
 * Renders moving stars with random glow effects (bar or circle).
 */

import { BaseAnimation } from '../animations/BaseAnimation';
import { BoardMetrics, Star } from '../types/canvas';

/**
 * Animated starfield with moving stars and random glow effects.
 * Stars move in a consistent direction with varying speeds and brightness.
 */
export class StarfieldEffect extends BaseAnimation {
  readonly id = 'starfield';
  private stars: Star[] = [];
  private starCount: number = 80;
  private moveDirection: { x: number; y: number } = { x: 0.3, y: 0.8 }; // Down-right direction

  constructor() {
    super('starfield');
  }

  /**
   * Initialize stars when first rendered with metrics.
   */
  private initStars(metrics: BoardMetrics): void {
    if (this.stars.length > 0) return;

    for (let i = 0; i < this.starCount; i++) {
      this.stars.push(this.createStar(metrics, true));
    }
  }

  /**
   * Create a single star with random properties.
   * @param metrics - Board metrics for positioning
   * @param randomPosition - Whether to place star randomly or at spawn edge
   */
  private createStar(metrics: BoardMetrics, randomPosition: boolean = false): Star {
    const { width, height } = metrics;

    let x: number;
    let y: number;

    if (randomPosition) {
      x = Math.random() * width;
      y = Math.random() * height;
    } else {
      // Spawn at the edge opposite to movement direction
      if (Math.abs(this.moveDirection.x) > Math.abs(this.moveDirection.y)) {
        x = this.moveDirection.x > 0 ? 0 : width;
        y = Math.random() * height;
      } else {
        x = Math.random() * width;
        y = this.moveDirection.y > 0 ? 0 : height;
      }
    }

    // Random glow type: 50% none, 25% bar, 25% circle
    const glowRoll = Math.random();
    let glowType: 'none' | 'bar' | 'circle';
    if (glowRoll < 0.5) {
      glowType = 'none';
    } else if (glowRoll < 0.75) {
      glowType = 'bar';
    } else {
      glowType = 'circle';
    }

    return {
      x,
      y,
      size: 0.5 + Math.random() * 1.5, // 0.5 - 2.0 px
      speed: 0.3 + Math.random() * 0.7, // 0.3 - 1.0 speed multiplier
      brightness: 0.5 + Math.random() * 0.5, // 0.5 - 1.0
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.00075 + Math.random() * 0.0015,
      glowType,
      glowColor: this.getRandomGlowColor(),
    };
  }

  /**
   * Get a random cool-toned glow color.
   */
  private getRandomGlowColor(): string {
    const colors = [
      'rgba(200, 220, 255, ', // Cool blue-white
      'rgba(255, 255, 240, ', // Warm white
      'rgba(220, 240, 255, ', // Light blue
      'rgba(255, 250, 220, ', // Soft yellow-white
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  update(deltaTime: number): void {
    super.update(deltaTime);

    // Update star positions
    for (const star of this.stars) {
      star.x += this.moveDirection.x * star.speed * deltaTime * 0.015;
      star.y += this.moveDirection.y * star.speed * deltaTime * 0.015;

      // Update twinkle phase
      star.twinklePhase += star.twinkleSpeed * deltaTime;
    }
  }

  render(ctx: CanvasRenderingContext2D, metrics: BoardMetrics): void {
    this.initStars(metrics);

    const { width, height } = metrics;

    // Remove stars that moved off-screen and spawn new ones
    this.stars = this.stars.filter(star => {
      const margin = 20;
      const onScreen =
        star.x > -margin &&
        star.x < width + margin &&
        star.y > -margin &&
        star.y < height + margin;

      if (!onScreen) {
        // Replace with new star at spawn edge
        return false;
      }
      return true;
    });

    // Add new stars to maintain count
    while (this.stars.length < this.starCount) {
      this.stars.push(this.createStar(metrics, false));
    }

    // Render each star
    for (const star of this.stars) {
      this.renderStar(ctx, star);
    }
  }

  /**
   * Render a single star with its glow effect.
   */
  private renderStar(ctx: CanvasRenderingContext2D, star: Star): void {
    // Calculate twinkle brightness
    const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7; // 0.4 - 1.0
    const alpha = star.brightness * twinkle;

    // Draw glow effect based on type
    if (star.glowType === 'bar') {
      this.renderBarGlow(ctx, star, alpha);
    } else if (star.glowType === 'circle') {
      this.renderCircleGlow(ctx, star, alpha);
    }

    // Draw star core
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();

    // Add sparkle for brighter stars
    if (alpha > 0.8) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Render a bar-shaped glow behind the star.
   */
  private renderBarGlow(ctx: CanvasRenderingContext2D, star: Star, alpha: number): void {
    const barLength = star.size * 8;
    const barWidth = star.size * 1.5;

    // Calculate bar angle based on movement direction
    const angle = Math.atan2(this.moveDirection.y, this.moveDirection.x);

    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(angle);

    // Draw gradient bar
    const gradient = ctx.createLinearGradient(-barLength / 2, 0, barLength / 2, 0);
    gradient.addColorStop(0, `${star.glowColor}0)`);
    gradient.addColorStop(0.5, `${star.glowColor}${alpha * 0.6})`);
    gradient.addColorStop(1, `${star.glowColor}0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(-barLength / 2, -barWidth / 2, barLength, barWidth);

    ctx.restore();
  }

  /**
   * Render a circular glow around the star.
   */
  private renderCircleGlow(ctx: CanvasRenderingContext2D, star: Star, alpha: number): void {
    const glowRadius = star.size * 6;

    const gradient = ctx.createRadialGradient(
      star.x, star.y, 0,
      star.x, star.y, glowRadius
    );
    gradient.addColorStop(0, `${star.glowColor}${alpha * 0.5})`);
    gradient.addColorStop(0.5, `${star.glowColor}${alpha * 0.2})`);
    gradient.addColorStop(1, `${star.glowColor}0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
