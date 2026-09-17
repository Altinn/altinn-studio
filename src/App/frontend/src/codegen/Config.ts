import type { CompCategory, ComponentBehaviors, ComponentCapabilities, ComponentMetadata } from '@app/layout-contract';

export interface RequiredComponentConfig {
  category: CompCategory;
  directRendering?: boolean;
  /** Whether app developers may configure this component, or it only exists inside the runtime. */
  availability: 'configurable' | 'internal';
  metadata: ComponentMetadata;
  capabilities: CompCapabilities;
  /** Disable display data for form components bound to groups rather than scalar values. */
  displayData?: false;
}

/**
 * Capabilities are configured directly when setting up a component config. You have to fill out each of the
 * properties in the object.
 * @see CompWithCap
 * @see getComponentCapabilities
 */
export type CompCapabilities = ComponentCapabilities;

/**
 * Behaviors are more implicit, and are derived from the component config. I.e. when making a component summarizable,
 * the behavior is set to true.
 * @see CompWithBehavior
 * @see getComponentBehavior
 */
export type CompBehaviors = ComponentBehaviors;
