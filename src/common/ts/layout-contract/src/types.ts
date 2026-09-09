export type LocalizedText = Readonly<{
  nb: string;
  en: string;
}>;

/** Broad component categories shared by layout tooling and the App renderer. */
export enum CompCategory {
  Presentation = 'Presentation',
  Form = 'Form',
  Action = 'Action',
  Container = 'Container',
}

export type ComponentCapabilities = {
  renderInTable: boolean;
  renderInButtonGroup: boolean;
  renderInAccordion: boolean;
  renderInAccordionGroup: boolean;
  renderInTabs: boolean;
  renderInCards: boolean;
  renderInCardsMedia: boolean;
};

export type ComponentBehaviors = {
  isSummarizable: boolean;
  canHaveLabel: boolean;
  canHaveOptions: boolean;
  canHaveAttachments: boolean;
};

export type ComponentAvailability = 'configurable' | 'internal';

export type ComponentLifecycle = Readonly<{
  status: 'stable' | 'beta' | 'deprecated';
  replacedBy?: string;
}>;

export type ComponentMetadata = Readonly<{
  name: LocalizedText;
  description?: LocalizedText;
  lifecycle?: ComponentLifecycle;
}>;

export type PropertyMetadata = Readonly<{
  title?: LocalizedText;
  description?: LocalizedText;
  default?: unknown;
  examples?: readonly unknown[];
  deprecated?: boolean;
}>;

export type PropertyValueDefinition =
  | Readonly<{
      type: 'string';
      expression?: true;
      allowedValues?: readonly string[];
      pattern?: string;
    }>
  | Readonly<{ type: 'date'; expression?: true }>
  | Readonly<{
      type: 'number';
      expression?: true;
      allowedValues?: readonly number[];
      minimum?: number;
      maximum?: number;
    }>
  | Readonly<{
      type: 'integer';
      expression?: true;
      allowedValues?: readonly number[];
      minimum?: number;
      maximum?: number;
    }>
  | Readonly<{ type: 'boolean'; expression?: true }>
  | Readonly<{ type: 'null' }>
  | Readonly<{ type: 'any'; expression?: true }>
  | Readonly<{ type: 'constant'; value: string | number | boolean | null }>
  | Readonly<{ type: 'array'; expression?: true; items: PropertyValueDefinition }>
  | Readonly<{
      type: 'object';
      expression?: true;
      properties: Readonly<Record<string, PropertyDefinition>>;
      additionalProperties?: false | PropertyValueDefinition;
    }>
  | Readonly<{ type: 'union'; variants: readonly PropertyValueDefinition[] }>
  | Readonly<{ type: 'intersection'; parts: readonly PropertyValueDefinition[] }>;

export type PropertyDefinition = Readonly<
  PropertyMetadata &
    PropertyValueDefinition & {
      required: boolean;
    }
>;

export type ComponentDefinition = Readonly<{
  kind: 'component' | 'container';
  category: `${CompCategory}`;
  capabilities: Readonly<ComponentCapabilities>;
  behaviors: Readonly<ComponentBehaviors>;
  metadata: ComponentMetadata;
  properties: Readonly<Record<string, PropertyDefinition>>;
}>;

export type ComponentCatalog = Readonly<Record<string, ComponentDefinition>>;
