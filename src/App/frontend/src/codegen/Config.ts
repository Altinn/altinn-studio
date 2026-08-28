import type { CompCategory, ComponentBehaviors, ComponentCapabilities, ComponentMetadata } from '@app/layout-contract';

export interface RequiredComponentConfig {
  category: CompCategory;
  directRendering?: boolean;
  /** Whether app developers may configure this component, or it only exists inside the runtime. */
  availability: 'configurable' | 'internal';
  metadata: ComponentMetadata;
  capabilities: CompCapabilities;
  functionality: FunctionalityConfig;
}

export interface FunctionalityConfig {
  /**
   * If true, the component must implement its own evalExpressions() method, otherwise it will use the default
   * implementation.
   */
  customExpressions: boolean;

  /**
   * If set to false, the component will not support display data. This is useful for components otherwise would
   * be required to support display data (when having data model bindings, and being a form component), but where
   * display data is not relevant (i.e. when binding to a group or array of objects).
   */
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
