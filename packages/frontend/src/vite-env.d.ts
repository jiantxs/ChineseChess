/**
 * Vite Type Declarations
 *
 * Provides TypeScript support for Vite-specific globals and CSS module imports.
 * This file is automatically included by Vite during development and build.
 */

/// <reference types="vite/client" />

/**
 * CSS Module Declaration Pattern
 *
 * Allows TypeScript to understand .css imports as modules.
 * In Vite, CSS files can be imported and used as strings containing
 * the compiled CSS content. This declaration enables type checking
 * for default exports from CSS files.
 */
declare module '*.css' {
  const content: string;
  export default content;
}
