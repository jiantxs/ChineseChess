/**
 * 中国象棋棋盘预设布局的注册表。
 *
 * 使用方法：导入 {@link getLayout}、{@link getAllLayouts} 等来访问棋盘配置。
 * 默认布局是 "standard" - 经典 32 子象棋初始设置。
 *
 * @packageDocumentation
 */
import { PieceLayout, PieceLayoutData } from '@chess/core';
import { standardLayout, standardLayoutData } from './layouts/standard.js';
import { soldierLayout } from './layouts/soldier.js';

/**
 * 表示带有元数据的单个棋盘布局记录。
 */
export interface GameRecord {
  id: string;
  name: string;
  description: string;
  layout: PieceLayout;
  createdAt: number;
  tags: string[];
}

/**
 * 所有已注册布局的名称到 GameRecord 的映射。
 */
export interface LayoutRegistry {
  [key: string]: GameRecord;
}

const registry: LayoutRegistry = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Standard Xiangqi initial setup with 32 pieces',
    layout: standardLayout,
    createdAt: Date.now(),
    tags: ['official', 'classic', 'full-set'],
  },
  soldier:{
    id: 'soldier',
    name: 'Soldier',
    description: 'A custom layout with only soldier',
    layout: soldierLayout,
    createdAt: Date.now(),
    tags: ['custom', 'soldier-only'],
  }
};

/**
 * 根据名称获取布局。
 * @param name - 要获取的布局名称
 * @returns 请求的布局的 PieceLayout
 * @throws 如果布局未找到则抛出错误
 */
export function getLayout(name: string): PieceLayout {
  const record = registry[name];
  if (!record) {
    throw new Error(`Layout "${name}" not found. Available: ${getAllLayoutNames().join(', ')}`);
  }
  return record.layout;
}

/**
 * 返回给定布局名称的序列化布局数据（JSON）。
 * @param name - 布局名称
 * @returns 包含序列化棋盘配置的 PieceLayoutData
 * @throws 如果布局未找到则抛出错误
 */
export function getLayoutData(name: string): PieceLayoutData {
  const layout = getLayout(name);
  return layout.toJSON();
}

/**
 * 返回所有已注册布局名称的数组。
 * @returns 布局名称字符串数组
 */
export function getAllLayoutNames(): string[] {
  return Object.keys(registry);
}

/**
 * 返回注册表中所有 GameRecord 条目。
 * @returns 所有 GameRecord 对象的数组
 */
export function getAllLayouts(): GameRecord[] {
  return Object.values(registry);
}

/**
 * 按特定标签筛选布局。
 * @param tag - 要筛选的标签
 * @returns 具有指定标签的 GameRecord 对象数组
 */
export function getLayoutsByTag(tag: string): GameRecord[] {
  return Object.values(registry).filter(record => record.tags.includes(tag));
}

/**
 * 检查给定名称的布局是否存在。
 * @param name - 要检查的布局名称
 * @returns 如果布局存在则返回 true，否则返回 false
 */
export function hasLayout(name: string): boolean {
  return name in registry;
}

/**
 * 在注册表中注册新布局。
 * @param name - 新布局的名称
 * @param record - 要注册的 GameRecord
 * @throws 如果已存在同名布局则抛出错误
 */
export function registerLayout(name: string, record: GameRecord): void {
  if (name in registry) {
    throw new Error(`Layout "${name}" already exists`);
  }
  registry[name] = record;
}

export { standardLayout, standardLayoutData };
export * from './layouts/standard.js';
