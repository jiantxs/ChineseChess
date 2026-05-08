import { PieceLayout, PieceLayoutData } from '@chess/core';
import { standardLayout, standardLayoutData } from './layouts/standard.js';

export interface GameRecord {
  id: string;
  name: string;
  description: string;
  layout: PieceLayout;
  createdAt: number;
  tags: string[];
}

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
};

export function getLayout(name: string): PieceLayout {
  const record = registry[name];
  if (!record) {
    throw new Error(`Layout "${name}" not found. Available: ${getAllLayoutNames().join(', ')}`);
  }
  return record.layout;
}

export function getLayoutData(name: string): PieceLayoutData {
  const layout = getLayout(name);
  return layout.toJSON();
}

export function getAllLayoutNames(): string[] {
  return Object.keys(registry);
}

export function getAllLayouts(): GameRecord[] {
  return Object.values(registry);
}

export function getLayoutsByTag(tag: string): GameRecord[] {
  return Object.values(registry).filter(record => record.tags.includes(tag));
}

export function hasLayout(name: string): boolean {
  return name in registry;
}

export function registerLayout(name: string, record: GameRecord): void {
  if (name in registry) {
    throw new Error(`Layout "${name}" already exists`);
  }
  registry[name] = record;
}

export { standardLayout, standardLayoutData };
export * from './layouts/standard.js';
