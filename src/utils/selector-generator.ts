/**
 * Selector Generator Utility
 * Generates robust, maintainable selectors for recorded interactions
 * Priority: data-testid > id > aria-label > text > css path
 * Similar to Playwright Codegen's selector strategy
 *
 * Note: This module only exports a function to inject browser-side code.
 * The actual selector generation logic runs in the browser context.
 */

/**
 * Injectable script for browser context
 * Creates a global selectorGenerator instance
 */
export function getInjectedSelectorScript(): string {
  return `
    class SelectorGenerator {
      constructor() {
        this.testIdAttribute = 'data-testid';
      }

      generateSelector(element) {
        // 1. Check for test ID attribute
        const testId = element.getAttribute(this.testIdAttribute);
        if (testId) {
          return '[' + this.testIdAttribute + '="' + testId + '"]';
        }

        // 2. Check for ID attribute
        const id = element.getAttribute('id');
        if (id && this.isUniqueId(element, id)) {
          return '#' + CSS.escape(id);
        }

        // 3. Check for aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) {
          return '[aria-label="' + ariaLabel + '"]';
        }

        // 4. Check for name attribute (forms)
        const name = element.getAttribute('name');
        if (name && (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA')) {
          return '[name="' + name + '"]';
        }

        // 5. Check for text content (buttons, links)
        if (element.tagName === 'BUTTON' || element.tagName === 'A') {
          const text = this.getElementText(element);
          if (text && text.length < 50) {
            const role = element.tagName === 'BUTTON' ? 'button' : 'link';
            return role + ':has-text("' + this.escapeText(text) + '")';
          }
        }

        // 6. Check for placeholder (inputs)
        const placeholder = element.getAttribute('placeholder');
        if (placeholder && element.tagName === 'INPUT') {
          return 'input[placeholder="' + placeholder + '"]';
        }

        // 7. Fall back to CSS path with context
        return this.generateCssPath(element);
      }

      isUniqueId(element, id) {
        const doc = element.ownerDocument || document;
        const matches = doc.querySelectorAll('#' + CSS.escape(id));
        return matches.length === 1 && matches[0] === element;
      }

      getElementText(element) {
        const text = element.textContent || '';
        return text.trim().replace(/\\s+/g, ' ');
      }

      escapeText(text) {
        return text.replace(/"/g, '\\\\"');
      }

      generateCssPath(element) {
        const parts = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let selector = current.tagName.toLowerCase();

          // Add class if meaningful (not generated/random)
          const classes = Array.from(current.classList).filter(cls =>
            !cls.match(/^(css-|sc-|styles-|_)/) && cls.length < 30
          );

          if (classes.length > 0 && classes.length < 4) {
            selector += '.' + classes.join('.');
          }

          // Add nth-child if needed for uniqueness
          if (current.parentElement) {
            const siblings = Array.from(current.parentElement.children);
            const sameTag = siblings.filter(s => s.tagName === current.tagName);
            if (sameTag.length > 1) {
              const index = sameTag.indexOf(current) + 1;
              selector += ':nth-child(' + index + ')';
            }
          }

          parts.unshift(selector);

          // Stop if we have a unique enough selector (ID or 3 levels deep)
          if (current.id || parts.length >= 3) {
            break;
          }

          current = current.parentElement;
        }

        return parts.join(' > ');
      }
    }

    window.__selectorGenerator = new SelectorGenerator();

    window.__generateSelector = function(element) {
      return window.__selectorGenerator.generateSelector(element);
    };
  `;
}
