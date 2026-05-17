/**
 * 中国象棋棋盘布局辅助类
 *
 * 用法：创建 PieceLayout 实例来表示初始棋盘设置
 * 支持用于持久化的 JSON 序列化/反序列化
 * 由 game-records 包用于布局注册表
 *
 * @module PieceLayout
 * @fileoverview Board layout helper for Chinese Chess
 */

import { Piece, Side } from './types';

/**
 * 用于序列化/反序列化棋子布局的数据结构
 */
export interface PieceLayoutData {
  /** 棋盘上的棋子数组 */
  pieces: Piece[];
  /** 先手方（RED 或 BLACK） */
  firstPlayer: Side;
  /** 可选的布局名称 */
  name?: string;
  /** 可选的布局描述 */
  description?: string;
}

/**
 * 代表中国象棋的棋盘布局配置
 *
 * 用于定义初始棋子位置、先手方，
 * 以及布局的元数据（名称、描述）。
 */
export class PieceLayout {
  /**
   * 创建新的 PieceLayout 实例
   * @param pieces - 定义初始棋盘布局的棋子数组
   * @param firstPlayer - 先手方（RED 或 BLACK）
   * @param name - 布局名称（默认：'custom'）
   * @param description - 布局描述（默认：''）
   */
  constructor(
    private pieces: Piece[],
    private firstPlayer: Side,
    private name: string = 'custom',
    private description: string = ''
  ) {}

  /**
   * 从 PieceLayoutData 对象创建 PieceLayout
   * @param json - 要反序列化的 PieceLayoutData 对象
   * @returns 新的 PieceLayout 实例
   */
  static fromJSON(json: PieceLayoutData): PieceLayout {
    return new PieceLayout(
      json.pieces,
      json.firstPlayer,
      json.name,
      json.description
    );
  }

  /**
   * 从 JSON 字符串创建 PieceLayout
   * @param jsonString - 要解析的 JSON 字符串
   * @returns 新的 PieceLayout 实例
   */
  static fromJSONString(jsonString: string): PieceLayout {
    const data = JSON.parse(jsonString) as PieceLayoutData;
    return PieceLayout.fromJSON(data);
  }

  /**
   * 返回初始棋子数组的副本
   * @returns 深拷贝位置的棋子数组
   */
  getInitialPieces(): Piece[] {
    return this.pieces.map(p => ({ ...p, position: { ...p.position } }));
  }

  /**
   * 返回先手方
   * @returns 先手方（RED 或 BLACK）
   */
  getFirstPlayer(): Side {
    return this.firstPlayer;
  }

  /**
   * 返回布局名称
   * @returns 此布局的名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 返回布局描述
   * @returns 此布局的描述
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * 将布局序列化为 PieceLayoutData 对象
   * @returns 此布局的纯对象表示
   */
  toJSON(): PieceLayoutData {
    return {
      pieces: this.pieces,
      firstPlayer: this.firstPlayer,
      name: this.name,
      description: this.description,
    };
  }

  /**
   * 将布局序列化为格式化的 JSON 字符串
   * @returns 此布局的 JSON 字符串表示
   */
  toJSONString(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}
