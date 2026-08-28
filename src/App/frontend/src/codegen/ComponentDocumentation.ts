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

type PropertyLink = Readonly<{
  path: string;
  target: 'common-properties' | 'grid' | 'page-break';
}>;

const labels = {
  en: {
    property: 'Property',
    type: 'Type',
    required: 'Required',
    description: 'Description',
    yes: 'Yes',
    no: 'No',
    defaultValue: 'Default',
    allowedValues: 'Allowed values',
  },
  nb: {
    property: 'Egenskap',
    type: 'Type',
    required: 'Påkrevd',
    description: 'Beskrivelse',
    yes: 'Ja',
    no: 'Nei',
    defaultValue: 'Standardverdi',
    allowedValues: 'Tillatte verdier',
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
  const grid = commonProperties.grid;
  const pageBreak = commonProperties.pageBreak;
  componentDocumentation.set('_common', renderTable(commonProperties, locale, false));
  if (grid?.type === 'object') {
    componentDocumentation.set('_grid', renderTable(grid.properties, locale));
  }
  if (pageBreak?.type === 'object') {
    componentDocumentation.set('_pageBreak', renderTable(pageBreak.properties, locale));
  }
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
  const commonPropertiesText =
    locale === 'nb'
      ? `Komponenten støtter også de felles egenskapene ${renderCommonPropertyLinks(locale)}.`
      : `The component also supports the common properties ${renderCommonPropertyLinks(locale)}.`;
  return [commonPropertiesText, '', renderTable(properties, locale)].join('\n');
}

function renderCommonPropertyLinks(locale: DocumentationLocale): string {
  const links: PropertyLink[] = [
    { path: 'id', target: 'common-properties' },
    { path: 'hidden', target: 'common-properties' },
    { path: 'grid', target: 'grid' },
    { path: 'pageBreak', target: 'page-break' },
  ];
  const rendered = links.map(({ path, target }) => renderPropertyLink(path, target, locale));
  return locale === 'nb'
    ? `${rendered.slice(0, -1).join(', ')} og ${rendered.at(-1)}`
    : `${rendered.slice(0, -1).join(', ')}, and ${rendered.at(-1)}`;
}

function renderTable(
  properties: Readonly<Record<string, PropertyDefinition>>,
  locale: DocumentationLocale,
  includeNestedProperties = true,
): string {
  const text = labels[locale];
  const rows = collectRows(properties, '', includeNestedProperties);
  const header = `| ${text.property} | ${text.type} | ${text.required} | ${text.defaultValue} | ${text.description} |`;
  const separator = '| --- | --- | --- | --- | --- |';
  const tableRows = rows.map(({ path, definition }) =>
    [
      formatPropertyPath(path, locale),
      `\`${escapeTableCell(formatType(definition))}\``,
      definition.required ? text.yes : text.no,
      formatDefaultValue(definition),
      escapeTableCell(formatDescription(definition, locale)),
    ].join(' | '),
  );

  return [header, separator, ...tableRows.map((row) => `| ${row} |`), ''].join('\n');
}

function collectRows(
  properties: Readonly<Record<string, PropertyDefinition>>,
  parentPath = '',
  includeNestedProperties = true,
): PropertyRow[] {
  const rows: PropertyRow[] = [];
  for (const [name, definition] of Object.entries(properties)) {
    const path = parentPath ? `${parentPath}.${name}` : name;
    rows.push({ path, definition });
    if (includeNestedProperties) {
      collectNestedRows(definition, path, rows);
    }
  }
  return rows;
}

function collectNestedRows(definition: PropertyValueDefinition, path: string, rows: PropertyRow[]): void {
  if (definition.type === 'object') {
    rows.push(...collectRows(definition.properties, path));
  } else if (definition.type === 'array') {
    collectNestedRows(definition.items, `${path}[]`, rows);
  } else if (definition.type === 'union') {
    for (const variant of definition.variants) {
      collectNestedRows(variant, pathForVariant(path, variant), rows);
    }
  } else if (definition.type === 'intersection') {
    for (const part of definition.parts) {
      collectNestedRows(part, path, rows);
    }
  }
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

function formatType(definition: PropertyValueDefinition): string {
  let type: string;
  if ('allowedValues' in definition && definition.allowedValues?.length) {
    type = formatAllowedValues(definition.allowedValues);
  } else if (definition.type === 'array') {
    const itemType = formatType(definition.items);
    type =
      definition.items.type === 'union' || definition.items.type === 'intersection'
        ? `(${itemType})[]`
        : `${itemType}[]`;
  } else if (definition.type === 'union') {
    type = definition.variants.map(formatType).join(' | ');
  } else if (definition.type === 'intersection') {
    type = definition.parts.map(formatType).join(' & ');
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

function formatDescription(definition: PropertyDefinition, locale: DocumentationLocale): string {
  const text = labels[locale];
  const details = [getLocalizedText(definition.description, locale)];
  if ('allowedValues' in definition && definition.allowedValues) {
    details.push(
      `${text.allowedValues}: ${definition.allowedValues.map((value) => JSON.stringify(value)).join(', ')}.`,
    );
  }
  return details.filter(Boolean).join(' ');
}

function formatDefaultValue(definition: PropertyDefinition): string {
  return definition.default === undefined ? '' : `\`${escapeTableCell(JSON.stringify(definition.default))}\``;
}

function formatPropertyPath(path: string, locale: DocumentationLocale): string {
  if (path === 'grid') {
    return renderPropertyLink(path, 'grid', locale);
  }
  if (path === 'pageBreak') {
    return renderPropertyLink(path, 'page-break', locale);
  }
  return `\`${path}\``;
}

function renderPropertyLink(path: string, target: PropertyLink['target'], _locale: DocumentationLocale): string {
  const anchor = target === 'common-properties' ? `#${path.toLowerCase()}` : '';
  return `[\`${path}\`](../${target}/${anchor})`;
}

function getLocalizedText(value: LocalizedText | undefined, locale: DocumentationLocale): string | undefined {
  return value?.[locale];
}

function escapeTableCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}
