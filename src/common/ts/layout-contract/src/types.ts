export type LocalizedText = Readonly<{
  nb: string;
  en: string;
}>;

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
  title?: string;
  description?: string;
  default?: unknown;
  deprecated?: boolean;
}>;

export type PropertyValueDefinition =
  | Readonly<{ type: 'string'; expression?: true; allowedValues?: readonly string[] }>
  | Readonly<{ type: 'date'; expression?: true }>
  | Readonly<{ type: 'number'; expression?: true; allowedValues?: readonly number[] }>
  | Readonly<{ type: 'integer'; expression?: true; allowedValues?: readonly number[] }>
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
  metadata: ComponentMetadata;
  properties: Readonly<Record<string, PropertyDefinition>>;
}>;

export type ComponentCatalog = Readonly<Record<string, ComponentDefinition>>;
