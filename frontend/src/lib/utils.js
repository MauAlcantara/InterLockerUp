// src/lib/utils.js

/**
 * Concatenate class names conditionally.
 * @param  {...(string|boolean|undefined|null)} classes
 * @returns {string} concatenated class string
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}