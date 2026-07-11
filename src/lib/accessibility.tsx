'use client';

import React from 'react';

/**
 * Accessibility utilities for Drugucopia
 * Provides WCAG AA compliant patterns and helpers
 */

// ─── Focus Management ────────────────────────────────────────────────────────

/**
 * Trap focus within a container element
 * Returns cleanup function
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleTab(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }

  container.addEventListener('keydown', handleTab);
  firstElement?.focus();

  return () => {
    container.removeEventListener('keydown', handleTab);
  };
}

/**
 * Restore focus to a previously focused element
 */
export function restoreFocus(previousActiveElement: Element | null) {
  if (previousActiveElement && 'focus' in previousActiveElement) {
    (previousActiveElement as HTMLElement).focus();
  }
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    )
  ).filter((el) => el.offsetParent !== null); // Only visible elements
}

// ─── ARIA Helpers ────────────────────────────────────────────────────────────

/**
 * Generate unique IDs for ARIA relationships
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create ARIA live region announcer
 */
export function createLiveRegion(): HTMLElement {
  const region = document.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.className = 'sr-only absolute -left-9999';
  document.body.appendChild(region);
  return region;
}

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  let region = document.querySelector('[data-live-region]') as HTMLElement;
  if (!region) {
    region = createLiveRegion();
    region.setAttribute('data-live-region', 'true');
  }
  region.setAttribute('aria-live', priority);
  region.textContent = '';
  // Force re-read
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

// ─── Keyboard Navigation ────────────────────────────────────────────────────

/**
 * Handle arrow key navigation for a list of items
 */
export function handleArrowNavigation<T extends HTMLElement>(
  e: React.KeyboardEvent,
  items: T[],
  currentIndex: number,
  onSelect: (index: number) => void,
  options: { circular?: boolean; vertical?: boolean } = {}
): number | null {
  const { circular = true, vertical = true } = options;
  const isVertical = vertical && (e.key === 'ArrowDown' || e.key === 'ArrowUp');
  const isHorizontal = !vertical && (e.key === 'ArrowRight' || e.key === 'ArrowLeft');

  if (!isVertical && !isHorizontal) return null;

  e.preventDefault();

  let nextIndex = currentIndex;

  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    nextIndex = currentIndex + 1;
    if (nextIndex >= items.length) {
      nextIndex = circular ? 0 : currentIndex;
    }
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    nextIndex = currentIndex - 1;
    if (nextIndex < 0) {
      nextIndex = circular ? items.length - 1 : 0;
    }
  }

  if (nextIndex !== currentIndex) {
    onSelect(nextIndex);
    items[nextIndex]?.focus();
    return nextIndex;
  }

  return currentIndex;
}

/**
 * Handle Home/End keys
 */
export function handleHomeEnd<T extends HTMLElement>(
  e: React.KeyboardEvent,
  items: T[],
  currentIndex: number,
  onSelect: (index: number) => void
): number | null {
  if (e.key === 'Home') {
    e.preventDefault();
    onSelect(0);
    items[0]?.focus();
    return 0;
  }
  if (e.key === 'End') {
    e.preventDefault();
    const lastIndex = items.length - 1;
    onSelect(lastIndex);
    items[lastIndex]?.focus();
    return lastIndex;
  }
  return null;
}

// ─── Color Contrast ──────────────────────────────────────────────────────────

/**
 * Calculate relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Calculate contrast ratio between two colors
 * Returns ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) return 1;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse color string to RGB
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Hex
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
    };
  }

  // RGB
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }

  return null;
}

/**
 * Check if contrast meets WCAG AA (4.5:1 for normal, 3:1 for large text)
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if contrast meets WCAG AAA (7:1 for normal, 4.5:1 for large text)
 */
export function meetsWCAGAAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

// ─── Screen Reader Utilities ────────────────────────────────────────────────

/**
 * Visually hidden but accessible to screen readers
 */
export const srOnly = 'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';
export const srOnlyFocusable = 'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 focus:static focus:w-auto focus:h-auto focus:p-4 focus:m-0';

/**
 * Create accessible label for form fields
 */
export function createLabelId(id: string): string {
  return `${id}-label`;
}

export function createDescriptionId(id: string): string {
  return `${id}-description`;
}

export function createErrorId(id: string): string {
  return `${id}-error`;
}

/**
 * Build ARIA attributes for a form field
 */
export interface AriaFieldProps {
  id: string;
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  invalid?: boolean;
}

export function getAriaFieldProps(props: AriaFieldProps) {
  const { id, label, description, error, required, invalid } = props;
  const describedBy: string[] = [];

  if (description) describedBy.push(createDescriptionId(id));
  if (error) describedBy.push(createErrorId(id));

  return {
    id,
    'aria-label': label,
    'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
    'aria-required': required,
    'aria-invalid': invalid ?? !!error,
    'aria-errormessage': error ? createErrorId(id) : undefined,
  };
}

// ─── Motion & Animation ──────────────────────────────────────────────────────

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook for reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

/**
 * Get transition duration respecting reduced motion
 */
export function getTransitionDuration(normalDuration: number): number {
  return prefersReducedMotion() ? 0 : normalDuration;
}

// ─── Touch Target Sizing ────────────────────────────────────────────────────

/**
 * Minimum touch target size (48x48px per WCAG)
 */
export const MIN_TOUCH_TARGET = 48;

/**
 * Ensure element meets minimum touch target size
 * Returns CSS class or inline styles
 */
export function ensureTouchTarget(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  if (rect.width < MIN_TOUCH_TARGET || rect.height < MIN_TOUCH_TARGET) {
    element.style.minWidth = `${MIN_TOUCH_TARGET}px`;
    element.style.minHeight = `${MIN_TOUCH_TARGET}px`;
  }
}

// ─── Language & Direction ────────────────────────────────────────────────────

/**
 * Get current document language
 */
export function getDocumentLanguage(): string {
  if (typeof document === 'undefined') return 'en';
  return document.documentElement.lang || 'en';
}

/**
 * Set document language
 */
export function setDocumentLanguage(lang: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
}

// ─── Testing Helpers ─────────────────────────────────────────────────────────

/**
 * Check if element is visible to screen readers
 */
export function isAccessible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

/**
 * Audit element for common accessibility issues
 */
export interface A11yAuditResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
}

export function auditElement(element: HTMLElement): A11yAuditResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check for missing alt on images
  if (element.tagName === 'IMG' && !element.hasAttribute('alt')) {
    issues.push('Image missing alt attribute');
  }

  // Check for missing labels on inputs
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
    const id = element.id;
    const hasLabel = id && document.querySelector(`label[for="${id}"]`);
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledby = element.hasAttribute('aria-labelledby');
    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby) {
      issues.push('Form field missing accessible label');
    }
  }

  // Check contrast
  const style = window.getComputedStyle(element);
  const color = style.color;
  const bgColor = style.backgroundColor;
  if (color && bgColor && color !== 'rgba(0, 0, 0, 0)' && bgColor !== 'rgba(0, 0, 0, 0)') {
    if (!meetsWCAGAA(color, bgColor)) {
      warnings.push('Color contrast may not meet WCAG AA');
    }
  }

  // Check touch target size
  const rect = element.getBoundingClientRect();
  if (rect.width < MIN_TOUCH_TARGET || rect.height < MIN_TOUCH_TARGET) {
    if (['BUTTON', 'A', 'INPUT'].includes(element.tagName)) {
      warnings.push(`Touch target smaller than ${MIN_TOUCH_TARGET}px (${Math.round(rect.width)}x${Math.round(rect.height)})`);
    }
  }

  // Check for duplicate IDs
  if (element.id) {
    const duplicates = document.querySelectorAll(`#${element.id}`);
    if (duplicates.length > 1) {
      issues.push(`Duplicate ID: ${element.id}`);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
  };
}