/**
 * Layout Registry for pre-defined Chinese Chess board setups.
 *
 * Usage: Import {@link getLayout}, {@link getAllLayouts}, etc. to access board configurations.
 * Default layout is "standard" - the classic 32-piece Xiangqi initial setup.
 *
 * @packageDocumentation
 */
import { PieceLayout, PieceLayoutData } from '@chess/core';
import { standardLayout, standardLayoutData } from './layouts/standard.js';

/**
 * Represents a single board layout record with metadata.
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
 * Map of layout name to GameRecord for all registered layouts.
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
};

/**
 * Retrieves a layout by name.
 * @param name - The name of the layout to retrieve
 * @returns The PieceLayout for the requested layout
 * @throws Error if the layout is not found
 */
export function getLayout(name: string): PieceLayout {
  const record = registry[name];
  if (!record) {
    throw new Error(`Layout "${name}" not found. Available: ${getAllLayoutNames().join(', ')}`);
  }
  return record.layout;
}

/**
 * Returns the serialized layout data (JSON) for a given layout name.
 * @param name - The name of the layout
 * @returns PieceLayoutData containing the serialized board configuration
 * @throws Error if the layout is not found
 */
export function getLayoutData(name: string): PieceLayoutData {
  const layout = getLayout(name);
  return layout.toJSON();
}

/**
 * Returns an array of all registered layout names.
 * @returns Array of layout name strings
 */
export function getAllLayoutNames(): string[] {
  return Object.keys(registry);
}

/**
 * Returns all GameRecord entries in the registry.
 * @returns Array of all GameRecord objects
 */
export function getAllLayouts(): GameRecord[] {
  return Object.values(registry);
}

/**
 * Filters layouts by a specific tag.
 * @param tag - The tag to filter by
 * @returns Array of GameRecord objects that have the specified tag
 */
export function getLayoutsByTag(tag: string): GameRecord[] {
  return Object.values(registry).filter(record => record.tags.includes(tag));
}

/**
 * Checks if a layout with the given name exists.
 * @param name - The layout name to check
 * @returns true if the layout exists, false otherwise
 */
export function hasLayout(name: string): boolean {
  return name in registry;
}

/**
 * Registers a new layout in the registry.
 * @param name - The name for the new layout
 * @param record - The GameRecord to register
 * @throws Error if a layout with this name already exists
 */
export function registerLayout(name: string, record: GameRecord): void {
  if (name in registry) {
    throw new Error(`Layout "${name}" already exists`);
  }
  registry[name] = record;
}

export { standardLayout, standardLayoutData };
export * from './layouts/standard.js';
