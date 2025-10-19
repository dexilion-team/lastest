/**
 * Tracks and deduplicates user interactions during recording
 * Filters out noise (rapid hovers, redundant scrolls) while preserving intent
 */

export type InteractionType =
  | 'click'
  | 'fill'
  | 'navigate'
  | 'scroll'
  | 'hover'
  | 'press'
  | 'select'
  | 'screenshot';

export interface RecordedInteraction {
  type: InteractionType;
  selector?: string;
  value?: string;
  url?: string;
  timestamp: number;
  description: string;
  scrollPosition?: { x: number; y: number };
  key?: string;
  screenshotName?: string;
}

export interface InteractionTrackerOptions {
  scrollDebounceMs?: number;
  hoverDebounceMs?: number;
  deduplicateWindow?: number;
}

export class InteractionTracker {
  private interactions: RecordedInteraction[] = [];
  private lastScrollTime = 0;
  private lastHoverTarget: string | null = null;
  private lastHoverTime = 0;
  private scrollDebounceMs: number;
  private hoverDebounceMs: number;
  private deduplicateWindow: number;

  constructor(options: InteractionTrackerOptions = {}) {
    this.scrollDebounceMs = options.scrollDebounceMs || 500;
    this.hoverDebounceMs = options.hoverDebounceMs || 300;
    this.deduplicateWindow = options.deduplicateWindow || 100;
  }

  /**
   * Records a click interaction
   */
  recordClick(selector: string, description?: string): void {
    this.addInteraction({
      type: 'click',
      selector,
      timestamp: Date.now(),
      description: description || `Click: ${selector}`,
    });
  }

  /**
   * Records a fill/input interaction
   * Deduplicates rapid typing on same field
   */
  recordFill(selector: string, value: string, description?: string): void {
    // Check if we're still typing in the same field
    const lastInteraction = this.getLastInteraction();
    if (
      lastInteraction &&
      lastInteraction.type === 'fill' &&
      lastInteraction.selector === selector &&
      Date.now() - lastInteraction.timestamp < 1000
    ) {
      // Update the existing interaction instead of creating new one
      lastInteraction.value = value;
      lastInteraction.timestamp = Date.now();
      lastInteraction.description = description || `Fill: ${selector} = "${value}"`;
      return;
    }

    this.addInteraction({
      type: 'fill',
      selector,
      value,
      timestamp: Date.now(),
      description: description || `Fill: ${selector} = "${value}"`,
    });
  }

  /**
   * Records a navigation event
   */
  recordNavigation(url: string, description?: string): void {
    this.addInteraction({
      type: 'navigate',
      url,
      timestamp: Date.now(),
      description: description || `Navigate to: ${url}`,
    });
  }

  /**
   * Records a scroll event (debounced)
   */
  recordScroll(x: number, y: number, description?: string): void {
    const now = Date.now();
    if (now - this.lastScrollTime < this.scrollDebounceMs) {
      // Update last scroll position instead of adding new interaction
      const lastInteraction = this.getLastInteraction();
      if (lastInteraction && lastInteraction.type === 'scroll') {
        lastInteraction.scrollPosition = { x, y };
        lastInteraction.timestamp = now;
        return;
      }
    }

    this.lastScrollTime = now;
    this.addInteraction({
      type: 'scroll',
      scrollPosition: { x, y },
      timestamp: now,
      description: description || `Scroll to: (${x}, ${y})`,
    });
  }

  /**
   * Records a hover event (debounced and filtered)
   */
  recordHover(selector: string, description?: string): void {
    const now = Date.now();

    // Ignore hover if on same element or too soon
    if (
      this.lastHoverTarget === selector ||
      now - this.lastHoverTime < this.hoverDebounceMs
    ) {
      return;
    }

    this.lastHoverTarget = selector;
    this.lastHoverTime = now;

    this.addInteraction({
      type: 'hover',
      selector,
      timestamp: now,
      description: description || `Hover: ${selector}`,
    });
  }

  /**
   * Records a key press event
   */
  recordPress(selector: string, key: string, description?: string): void {
    this.addInteraction({
      type: 'press',
      selector,
      key,
      timestamp: Date.now(),
      description: description || `Press: ${key} on ${selector}`,
    });
  }

  /**
   * Records a select/dropdown interaction
   */
  recordSelect(selector: string, value: string, description?: string): void {
    this.addInteraction({
      type: 'select',
      selector,
      value,
      timestamp: Date.now(),
      description: description || `Select: ${selector} = "${value}"`,
    });
  }

  /**
   * Records a manual screenshot
   */
  recordScreenshot(name: string, description?: string): void {
    this.addInteraction({
      type: 'screenshot',
      screenshotName: name,
      timestamp: Date.now(),
      description: description || `Screenshot: ${name}`,
    });
  }

  /**
   * Gets all recorded interactions
   */
  getInteractions(): RecordedInteraction[] {
    return [...this.interactions];
  }

  /**
   * Gets the last recorded interaction
   */
  getLastInteraction(): RecordedInteraction | undefined {
    return this.interactions[this.interactions.length - 1];
  }

  /**
   * Clears all recorded interactions
   */
  clear(): void {
    this.interactions = [];
    this.lastScrollTime = 0;
    this.lastHoverTarget = null;
    this.lastHoverTime = 0;
  }

  /**
   * Gets interaction count
   */
  getCount(): number {
    return this.interactions.length;
  }

  /**
   * Adds an interaction, checking for duplicates
   */
  private addInteraction(interaction: RecordedInteraction): void {
    // Check for duplicate interaction within time window
    const lastInteraction = this.getLastInteraction();
    if (
      lastInteraction &&
      lastInteraction.type === interaction.type &&
      lastInteraction.selector === interaction.selector &&
      lastInteraction.value === interaction.value &&
      interaction.timestamp - lastInteraction.timestamp < this.deduplicateWindow
    ) {
      // Skip duplicate
      return;
    }

    this.interactions.push(interaction);
  }

  /**
   * Filters interactions to remove noise
   * Returns a cleaned list suitable for test generation
   */
  getFilteredInteractions(): RecordedInteraction[] {
    const filtered: RecordedInteraction[] = [];

    for (let i = 0; i < this.interactions.length; i++) {
      const current = this.interactions[i];

      // Always keep: clicks, fills, navigation, screenshots, selects, presses
      if (['click', 'fill', 'navigate', 'screenshot', 'select', 'press'].includes(current.type)) {
        filtered.push(current);
        continue;
      }

      // Keep hovers only if followed by a meaningful action
      if (current.type === 'hover') {
        const next = this.interactions[i + 1];
        if (next && next.type === 'click' && next.selector === current.selector) {
          // Hover followed by click on same element - keep it
          filtered.push(current);
        }
        // Otherwise skip hover (noise)
        continue;
      }

      // Keep significant scrolls (more than 100px from last position)
      if (current.type === 'scroll') {
        const lastScroll = filtered.reverse().find(int => int.type === 'scroll');
        filtered.reverse(); // Restore order

        if (!lastScroll) {
          filtered.push(current);
        } else if (lastScroll.scrollPosition && current.scrollPosition) {
          const deltaY = Math.abs(current.scrollPosition.y - lastScroll.scrollPosition.y);
          const deltaX = Math.abs(current.scrollPosition.x - lastScroll.scrollPosition.x);
          if (deltaY > 100 || deltaX > 100) {
            filtered.push(current);
          }
        }
      }
    }

    return filtered;
  }
}
