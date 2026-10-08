import type {
  ComponentCatalog,
  ComponentDefinition,
  LocalizedText,
  PropertyDefinition,
  PropertyValueDefinition,
} from '@app/layout-contract';

export type DocumentationLocale = 'en' | 'nb';

type PropertyRow = {
  path: string;
  definition: PropertyDefinition;
};

const propertiesRenderedFirst = ['type', 'readOnly', 'required', 'showValidations'] as const;
const propertyGroupMinimumRows = 3;

const labels = {
  en: {
    common: 'The component also supports the [common component properties](../common-properties/).',
    type: 'Type',
    required: 'Required',
    optional: 'Optional',
    defaultValue: 'Default',
    allowedValues: 'Allowed values',
    dataModelBinding: 'data model binding',
    dataModelBindingHref: '/en/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/',
    dataModelBindingLinkText: 'How to use data model bindings.',
  },
  nb: {
    common: 'Komponenten støtter også de [felles komponentegenskapene](../common-properties/).',
    type: 'Type',
    required: 'Påkrevd',
    optional: 'Valgfri',
    defaultValue: 'Standardverdi',
    allowedValues: 'Tillatte verdier',
    dataModelBinding: 'datamodellbinding',
    dataModelBindingHref: '/nb/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/',
    dataModelBindingLinkText: 'Slik bruker du datamodellbindinger.',
  },
} as const;

export function generateComponentDocumentation(
  catalog: ComponentCatalog,
  commonProperties: Readonly<Record<string, PropertyDefinition>>,
  locale: DocumentationLocale,
): ReadonlyMap<string, string> {
  const commonPropertyNames = new Set(Object.keys(commonProperties));
  const componentDocumentation = new Map(
    Object.entries(catalog).map(([componentType, component]) => [
      componentType,
      renderComponent(component, commonPropertyNames, locale),
    ]),
  );
  componentDocumentation.set('_common', renderProperties(commonProperties, locale));
  return componentDocumentation;
}

function renderComponent(
  component: ComponentDefinition,
  commonPropertyNames: ReadonlySet<string>,
  locale: DocumentationLocale,
): string {
  const properties = Object.fromEntries(
    Object.entries(component.properties).filter(([name]) => !commonPropertyNames.has(name)),
  );
  const renderedProperties = renderProperties(properties, locale);
  return commonPropertyNames.size ? `${labels[locale].common}\n\n${renderedProperties}` : renderedProperties;
}

function renderProperties(
  properties: Readonly<Record<string, PropertyDefinition>>,
  locale: DocumentationLocale,
): string {
  const rendered: string[] = [];
  for (const [name, definition] of sortTopLevelProperties(properties)) {
    const row = { path: name, definition };
    const nestedRows = collectNestedRows(definition, name);
    if (shouldGroupProperty(definition, nestedRows)) {
      rendered.push(renderPropertyGroup(row, nestedRows, locale));
    } else {
      rendered.push(renderProperty(row, locale), ...nestedRows.map((nestedRow) => renderProperty(nestedRow, locale)));
    }
  }
  return `${rendered.join('\n\n')}\n`;
}

function shouldGroupProperty(definition: PropertyValueDefinition, nestedRows: readonly PropertyRow[]): boolean {
  const isDataModelBindingCollection =
    nestedRows.length > 0 && nestedRows.every((row) => row.definition.semanticType === 'dataModelBinding');
  return isDataModelBindingCollection || countNestedRows(definition) >= propertyGroupMinimumRows;
}

function renderPropertyGroup(
  parent: PropertyRow,
  children: readonly PropertyRow[],
  locale: DocumentationLocale,
): string {
  return [
    `<details class="component-property-group" id="${escapeHtml(parent.path.toLowerCase())}">`,
    indent(renderPropertySummary(parent, locale, true)),
    '  <div class="component-property-group-content">',
    indent(renderPropertyDescription(parent.definition, locale), 4),
    '    <div class="component-property-list">',
    indent(children.map((row) => renderProperty(row, locale)).join('\n\n'), 6),
    '    </div>',
    '  </div>',
    '</details>',
  ]
    .filter(Boolean)
    .join('\n');
}

function renderProperty({ path, definition }: PropertyRow, locale: DocumentationLocale): string {
  const description = formatDescription(definition, locale);
  const anchor = path.toLowerCase();
  const summaryTag = description ? 'summary' : 'div';
  const containerTag = description ? 'details' : 'div';

  return [
    `<${containerTag} class="card adocs-expand adocs-expand-small component-property${description ? '' : ' component-property--static'}" id="${escapeHtml(anchor)}">`,
    indent(renderPropertySummary({ path, definition }, locale, description !== undefined, summaryTag)),
    indent(renderPropertyDescription(definition, locale)),
    `</${containerTag}>`,
  ]
    .filter(Boolean)
    .join('\n');
}

function renderPropertySummary(
  { path, definition }: PropertyRow,
  locale: DocumentationLocale,
  expandable: boolean,
  tag = 'summary',
): string {
  const text = labels[locale];
  const type = formatType(definition, locale);
  const renderedType =
    definition.semanticType === 'dataModelBinding'
      ? `<a href="${text.dataModelBindingHref}">${escapeHtml(type)}</a>`
      : escapeHtml(type);
  const defaultValue = hasMeaningfulDefault(definition) ? JSON.stringify(definition.default) : undefined;
  const renderedDefault =
    defaultValue === undefined
      ? ''
      : `<span class="component-property-default">${text.defaultValue}: <span class="component-property-value">${escapeHtml(defaultValue)}</span></span>`;

  return [
    `<${tag} class="component-property-summary">`,
    expandable ? '  <span class="component-property-chevron" aria-hidden="true"></span>' : '',
    `  <span class="component-property-name" title="${escapeHtml(path)}">${escapeHtml(path)}</span>`,
    '  <span class="component-property-summary-meta">',
    `    <span class="component-property-required${definition.required ? ' is-required' : ''}">${definition.required ? text.required : text.optional}</span>`,
    indent(renderedDefault, 4),
    `    <span class="component-property-type" title="${escapeHtml(type)}">${text.type}: <span class="component-property-value">${renderedType}</span></span>`,
    '  </span>',
    `</${tag}>`,
  ]
    .filter(Boolean)
    .join('\n');
}

function renderPropertyDescription(definition: PropertyDefinition, locale: DocumentationLocale): string {
  const description = formatDescription(definition, locale);
  return description
    ? `<div class="a-collapseContent-inside component-property-details"><div class="component-property-description">${description}</div></div>`
    : '';
}

function sortTopLevelProperties(
  properties: Readonly<Record<string, PropertyDefinition>>,
): [string, PropertyDefinition][] {
  const priority = new Map<string, number>(propertiesRenderedFirst.map((name, index) => [name, index]));
  return Object.entries(properties)
    .map(([name, definition], index) => ({ name, definition, index }))
    .sort((left, right) => {
      const leftPriority = priority.get(left.name) ?? propertiesRenderedFirst.length;
      const rightPriority = priority.get(right.name) ?? propertiesRenderedFirst.length;
      return leftPriority - rightPriority || left.index - right.index;
    })
    .map(({ name, definition }) => [name, definition]);
}

function collectNestedRows(definition: PropertyValueDefinition, path: string): PropertyRow[] {
  const rows: PropertyRow[] = [];
  if (definition.semanticType === 'dataModelBinding') {
    return rows;
  }
  if (definition.type === 'object') {
    for (const [name, nestedDefinition] of Object.entries(definition.properties)) {
      const nestedPath = `${path}.${name}`;
      rows.push({ path: nestedPath, definition: nestedDefinition });
      rows.push(...collectNestedRows(nestedDefinition, nestedPath));
    }
  } else if (definition.type === 'array') {
    rows.push(...collectNestedRows(definition.items, `${path}[]`));
  } else if (definition.type === 'union') {
    for (const variant of definition.variants) {
      rows.push(...collectNestedRows(variant, pathForVariant(path, variant)));
    }
  } else if (definition.type === 'intersection') {
    for (const part of definition.parts) {
      rows.push(...collectNestedRows(part, path));
    }
  }
  return rows;
}

function countNestedRows(definition: PropertyValueDefinition): number {
  if (definition.semanticType === 'dataModelBinding') {
    return 0;
  }
  if (definition.type === 'object') {
    return Object.values(definition.properties).reduce(
      (count, nestedDefinition) => count + 1 + countNestedRows(nestedDefinition),
      0,
    );
  }
  if (definition.type === 'array') {
    return countNestedRows(definition.items);
  }
  if (definition.type === 'union') {
    return definition.variants.reduce((count, variant) => count + countNestedRows(variant), 0);
  }
  if (definition.type === 'intersection') {
    return definition.parts.reduce((count, part) => count + countNestedRows(part), 0);
  }
  return 0;
}

function pathForVariant(path: string, variant: PropertyValueDefinition): string {
  if (variant.type !== 'object') {
    return path;
  }
  const discriminator = variant.properties.type;
  if (discriminator?.type !== 'constant') {
    return path;
  }
  const suffix = `[type=${String(discriminator.value)}]`;
  return path.endsWith('[]') ? `${path.slice(0, -2)}${suffix}` : `${path}${suffix}`;
}

function formatType(definition: PropertyValueDefinition, locale: DocumentationLocale): string {
  if (definition.semanticType === 'dataModelBinding') {
    return labels[locale].dataModelBinding;
  }
  let type: string;
  if ('allowedValues' in definition && definition.allowedValues?.length) {
    type = formatAllowedValues(definition.allowedValues);
  } else if (definition.type === 'array') {
    const itemType = formatType(definition.items, locale);
    type =
      definition.items.type === 'union' || definition.items.type === 'intersection'
        ? `(${itemType})[]`
        : `${itemType}[]`;
  } else if (definition.type === 'union') {
    type = definition.variants.map((variant) => formatType(variant, locale)).join(' | ');
  } else if (definition.type === 'intersection') {
    type = definition.parts.map((part) => formatType(part, locale)).join(' & ');
  } else if (definition.type === 'constant') {
    type = JSON.stringify(definition.value);
  } else {
    type = definition.type;
  }
  if (
    (definition.type === 'number' || definition.type === 'integer') &&
    (definition.minimum !== undefined || definition.maximum !== undefined)
  ) {
    type = `${type} (${definition.minimum ?? '−∞'}–${definition.maximum ?? '∞'})`;
  }
  if (definition.type === 'array' && (definition.minItems !== undefined || definition.maxItems !== undefined)) {
    type = `${type} (minItems: ${definition.minItems ?? 0}, maxItems: ${definition.maxItems ?? '∞'})`;
  }
  return 'expression' in definition && definition.expression ? `${type} | expression<${type}>` : type;
}

function formatAllowedValues(values: readonly (string | number)[]): string {
  if (
    values.length > 2 &&
    values.every((value): value is number => typeof value === 'number') &&
    values.every((value, index) => index === 0 || value === values[index - 1] + 1)
  ) {
    return `${values[0]}–${values.at(-1)}`;
  }
  return values.map((value) => JSON.stringify(value)).join(' | ');
}

function formatDescription(definition: PropertyDefinition, locale: DocumentationLocale): string | undefined {
  const details = [getLocalizedText(definition.description, locale)];
  if ('allowedValues' in definition && definition.allowedValues) {
    details.push(
      `${labels[locale].allowedValues}: ${definition.allowedValues.map((value) => JSON.stringify(value)).join(', ')}.`,
    );
  }
  if (definition.semanticType === 'dataModelBinding') {
    details.push(`<a href="${labels[locale].dataModelBindingHref}">${labels[locale].dataModelBindingLinkText}</a>`);
  }
  return details.filter(Boolean).join(' ') || undefined;
}

function hasMeaningfulDefault(definition: PropertyDefinition): boolean {
  return definition.default !== undefined && definition.default !== null && definition.default !== '';
}

function getLocalizedText(value: LocalizedText | undefined, locale: DocumentationLocale): string | undefined {
  return value?.[locale];
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function indent(value: string, spaces = 2): string {
  const indentation = ' '.repeat(spaces);
  return value
    .split('\n')
    .map((line) => (line ? `${indentation}${line}` : line))
    .join('\n');
}
