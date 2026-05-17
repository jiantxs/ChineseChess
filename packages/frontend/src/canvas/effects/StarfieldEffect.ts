/**
 * @file StarfieldEffect - 动态星空背景
 * 渲染带随机发光效果（条形或圆形）的移动星星。
 */

import { BaseAnimation } from '../animations/BaseAnimation';
import { BoardMetrics, Star } from '../types/canvas';

/**
 * 带移动星星和随机发光效果的动态星空。
 * 星星以一致的方向移动，具有不同的速度和亮度。
 */
export class StarfieldEffect extends BaseAnimation {
  readonly id = 'starfield';
  private stars: Star[] = [];
  private starCount: number = 80;
  private moveDirection: { x: number; y: number } = { x: 0.3, y: 0.8 }; // 右下方向

  constructor() {
    super('starfield');
  }

  /**
   * 首次渲染时使用度量初始化星星。
   */
  private initStars(metrics: BoardMetrics): void {
    if (this.stars.length > 0) return;

    for (let i = 0; i < this.starCount; i++) {
      this.stars.push(this.createStar(metrics, true));
    }
  }

  /**
   * 创建具有随机属性的单个星星。
   * @param metrics - 用于定位的棋盘度量
   * @param randomPosition - 随机放置星星还是在生成边缘放置
   */
  private createStar(metrics: BoardMetrics, randomPosition: boolean = false): Star {
    const { width, height } = metrics;

    let x: number;
    let y: number;

    if (randomPosition) {
      x = Math.random() * width;
      y = Math.random() * height;
    } else {
      // 在背向移动方向边缘生成
      if (Math.abs(this.moveDirection.x) > Math.abs(this.moveDirection.y)) {
        x = this.moveDirection.x > 0 ? 0 : width;
        y = Math.random() * height;
      } else {
        x = Math.random() * width;
        y = this.moveDirection.y > 0 ? 0 : height;
      }
    }

    // 随机发光类型：50% 无，25% 条形，25% 圆形
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

    // 更新星星位置
    for (const star of this.stars) {
      star.x += this.moveDirection.x * star.speed * deltaTime * 0.015;
      star.y += this.moveDirection.y * star.speed * deltaTime * 0.015;

      // 更新闪烁相位
      star.twinklePhase += star.twinkleSpeed * deltaTime;
    }
  }

  render(ctx: CanvasRenderingContext2D, metrics: BoardMetrics): void {
    this.initStars(metrics);

    const { width, height } = metrics;

    // 移除移出屏幕的星星并生成新的
    this.stars = this.stars.filter(star => {
      const margin = 20;
      const onScreen =
        star.x > -margin &&
        star.x < width + margin &&
        star.y > -margin &&
        star.y < height + margin;

      if (!onScreen) {
        // 用新的边缘星星替换
        return false;
      }
      return true;
    });

    // 添加新星星以维持数量
    while (this.stars.length < this.starCount) {
      this.stars.push(this.createStar(metrics, false));
    }

    // 渲染每个星星
    for (const star of this.stars) {
      this.renderStar(ctx, star);
    }
  }

  /**
   * 使用其发光效果渲染单个星星。
   */
  private renderStar(ctx: CanvasRenderingContext2D, star: Star): void {
    // 计算闪烁亮度
    const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7; // 0.4 - 1.0
    const alpha = star.brightness * twinkle;

    // 根据类型绘制发光效果
    if (star.glowType === 'bar') {
      this.renderBarGlow(ctx, star, alpha);
    } else if (star.glowType === 'circle') {
      this.renderCircleGlow(ctx, star, alpha);
    }

    // 绘制星星核心
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();

    // 为更亮的星星添加闪光
    if (alpha > 0.8) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * 在星星后方渲染条形发光。
   */
  private renderBarGlow(ctx: CanvasRenderingContext2D, star: Star, alpha: number): void {
    const barLength = star.size * 8;
    const barWidth = star.size * 1.5;

    // 根据移动方向计算条形角度
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
   * 在星星周围渲染圆形发光。
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
