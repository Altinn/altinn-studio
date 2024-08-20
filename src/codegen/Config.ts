import type { CompCategory } from 'src/layout/common';

export interface RequiredComponentConfig {
  category: CompCategory;
  directRendering?: boolean;
  capabilities: CompCapabilities;
  functionality: FunctionalityConfig;
}

export interface FunctionalityConfig {
  /**
   * If true, the component must implement its own evalExpressions() method, otherwise it will use the default
   * implementation.
   */
  customExpressions: boolean;
}

/**
 * Capabilities are configured directly when setting up a component config. You have to fill out each of the
 * properties in the object.
 * @see CompWithCap
 * @see getComponentCapabilities
 */
export interface CompCapabilities {
  renderInTable: boolean;
  renderInButtonGroup: boolean;
  renderInAccordion: boolean;
  renderInAccordionGroup: boolean;
  renderInTabs: boolean;
  renderInCards: boolean;
  renderInCardsMedia: boolean;
}

/**
 * Behaviors are more implicit, and are derived from the component config. I.e. when making a component summarizable,
 * the behavior is set to true.
 * @see CompWithBehavior
 * @see getComponentBehavior
 */
export interface CompBehaviors {
  isSummarizable: boolean;
  canHaveLabel: boolean;
  canHaveOptions: boolean;
  canHaveAttachments: boolean;
}
