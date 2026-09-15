import { describe, expect, it } from 'vitest';
import type { ComponentCatalog } from '@app/layout-contract';

import { generateComponentDocumentation } from 'src/codegen/ComponentDocumentation';

const exampleComponent = {
  kind: 'component',
  category: 'Presentation',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInTabs: false,
    renderInCards: false,
    renderInCardsMedia: false,
  },
  behaviors: {
    isSummarizable: false,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
  metadata: { name: { nb: 'Eksempel', en: 'Example' } },
} as const;

describe('generateComponentDocumentation', () => {
  it.each(['en', 'nb'] as const)('links components to one common-property page in %s', (locale) => {
    const property = { type: 'string', required: false } as const;
    const catalog = { Example: { ...exampleComponent, properties: { value: property } } } satisfies ComponentCatalog;
    const documentation = generateComponentDocumentation(catalog, { id: property, grid: property }, locale);

    expect(documentation.get('Example')?.split('\n')[0]).toBe(
      locale === 'en'
        ? 'The component also supports the [common component properties](../common-properties/).'
        : 'Komponenten støtter også de [felles komponentegenskapene](../common-properties/).',
    );
    expect(documentation.get('Example')).not.toContain('id="id"');
    expect(documentation.get('Example')).not.toContain('../grid/');
  });

  it('renders small nested properties as collapsed disclosure elements', () => {
    const catalog = {
      Example: {
        ...exampleComponent,
        properties: {
          rows: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              properties: {
                label: {
                  type: 'string',
                  expression: true,
                  required: false,
                  description: { nb: 'Vist ledetekst.', en: 'Displayed label.' },
                  default: 'Label',
                },
              },
            },
          },
        },
      },
    } as const satisfies ComponentCatalog;

    const documentation = generateComponentDocumentation(catalog, {}, 'nb').get('Example')!;

    expect(documentation).toContain('<details class="card adocs-expand adocs-expand-small component-property"');
    expect(documentation).not.toContain('<details open');
    expect(documentation).toContain('id="rows[].label"');
    expect(documentation).toContain('string | expression&lt;string&gt;');
    expect(documentation).toContain('Standardverdi: <span class="component-property-value">&quot;Label&quot;</span>');
    expect(documentation).toContain('<div class="component-property-description">Vist ledetekst.</div>');
    expect(documentation).not.toContain('<dl>');
  });

  it('groups properties with at least three nested rows', () => {
    const catalog = {
      Example: {
        ...exampleComponent,
        properties: {
          settings: {
            type: 'object',
            required: true,
            description: { en: 'Controls the example.', nb: 'Styrer eksempelet.' },
            properties: {
              first: { type: 'string', required: false },
              second: { type: 'string', required: false },
              third: { type: 'string', required: false },
            },
          },
          queryParameters: {
            type: 'object',
            required: false,
            properties: {
              value: { type: 'string', required: false },
            },
          },
        },
      },
    } as const satisfies ComponentCatalog;

    const documentation = generateComponentDocumentation(catalog, {}, 'en').get('Example')!;

    expect(documentation).toContain('<details class="component-property-group" id="settings">');
    expect(documentation).toContain('Controls the example.');
    expect(documentation).toContain('id="settings.first"');
    expect(documentation).not.toContain('class="component-property-group" id="queryparameters"');
    expect(documentation).toContain('id="queryparameters.value"');
  });

  it('renders data model bindings as a semantic type without internal normalized fields', () => {
    const catalog = {
      Example: {
        ...exampleComponent,
        properties: {
          dataModelBindings: {
            type: 'object',
            required: true,
            properties: {
              simpleBinding: {
                type: 'object',
                semanticType: 'dataModelBinding',
                required: true,
                properties: {
                  dataType: { type: 'string', required: true },
                  field: { type: 'string', required: true },
                },
              },
            },
          },
        },
      },
    } as const satisfies ComponentCatalog;

    const documentation = generateComponentDocumentation(catalog, {}, 'nb').get('Example')!;

    expect(documentation).toContain(
      'href="/nb/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">datamodellbinding</a>',
    );
    expect(documentation).toContain(
      'href="/nb/altinn-studio/v9/develop-a-service/reference/data/data-model-bindings/">Slik bruker du datamodellbindinger.</a>',
    );
    expect(documentation).not.toContain('dataModelBindings.simpleBinding.dataType');
    expect(documentation).not.toContain('dataModelBindings.simpleBinding.field');
  });

  it('moves selected top-level properties first and preserves the order of all other properties', () => {
    const property = { type: 'boolean', required: false } as const;
    const catalog = {
      Example: {
        ...exampleComponent,
        properties: {
          alpha: property,
          required: property,
          beta: property,
          type: { type: 'constant', value: 'Example', required: true },
          showValidations: property,
          readOnly: property,
          gamma: property,
        },
      },
    } as const satisfies ComponentCatalog;

    const documentation = generateComponentDocumentation(catalog, {}, 'en').get('Example')!;
    const renderedNames = [...documentation.matchAll(/component-property-name" title="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(renderedNames).toEqual(['type', 'readOnly', 'required', 'showValidations', 'alpha', 'beta', 'gamma']);
  });

  it('renders properties without descriptions as static rows', () => {
    const catalog = {
      Example: {
        ...exampleComponent,
        properties: {
          value: { type: 'string', required: false },
        },
      },
    } as const satisfies ComponentCatalog;

    const documentation = generateComponentDocumentation(catalog, {}, 'en').get('Example')!;

    expect(documentation).toContain(
      '<div class="card adocs-expand adocs-expand-small component-property component-property--static"',
    );
    expect(documentation).not.toContain('<details');
    expect(documentation).not.toContain('component-property-chevron');
  });

  it('separates generated HTML blocks with blank lines', () => {
    const property = { type: 'string', required: false } as const;
    const catalog = {
      Example: { ...exampleComponent, properties: { first: property, second: property } },
    } satisfies ComponentCatalog;

    const documentation = generateComponentDocumentation(catalog, {}, 'en').get('Example')!;

    expect(documentation).toContain('</div>\n\n<div class="card');
  });

  it('distinguishes discriminated object variants in nested paths', () => {
    const catalog = {
      Example: {
        ...exampleComponent,
        properties: {
          items: {
            type: 'array',
            required: false,
            items: {
              type: 'union',
              variants: [
                {
                  type: 'object',
                  properties: {
                    type: { type: 'constant', value: 'Text', required: true },
                    value: { type: 'string', required: true },
                  },
                },
                {
                  type: 'object',
                  properties: {
                    type: { type: 'constant', value: 'Number', required: true },
                    value: { type: 'number', required: true },
                  },
                },
              ],
            },
          },
        },
      },
    } as const satisfies ComponentCatalog;

    const documentation = generateComponentDocumentation(catalog, {}, 'en').get('Example');

    expect(documentation).toContain('id="items[type=text].value"');
    expect(documentation).toContain('title="items[type=Text].value"');
    expect(documentation).toContain('id="items[type=number].value"');
    expect(documentation).toContain('title="items[type=Number].value"');
  });

  it('inlines nested common properties without inferred links or separate documents', () => {
    const commonProperties = {
      grid: {
        type: 'object',
        required: false,
        description: { en: 'Controls the layout.', nb: 'Styrer plasseringen.' },
        properties: {
          xs: { type: 'integer', required: false, minimum: 1, maximum: 12 },
        },
      },
      pageBreak: {
        type: 'object',
        required: false,
        properties: {
          before: { type: 'boolean', required: false, default: false },
        },
      },
    } as const;

    const documentation = generateComponentDocumentation({}, commonProperties, 'en');
    const common = documentation.get('_common')!;

    expect([...documentation.keys()]).toEqual(['_common']);
    expect(common).not.toContain('component-property-group');
    expect(common).toContain('id="grid.xs"');
    expect(common).toContain('integer (1–12)');
    expect(common).toContain('id="pagebreak.before"');
    expect(common).not.toContain('href=');
  });

  it('omits empty defaults and preserves meaningful falsy defaults', () => {
    const property = { type: 'string', required: false } as const;
    const catalog = {
      Example: {
        ...exampleComponent,
        properties: {
          missing: property,
          empty: { ...property, default: '' },
          nullValue: { ...property, default: null },
          disabled: { type: 'boolean', required: false, default: false },
          zero: { type: 'number', required: false, default: 0 },
        },
      },
    } as const satisfies ComponentCatalog;

    const documentation = generateComponentDocumentation(catalog, {}, 'en').get('Example')!;
    expect(documentation.match(/component-property-default/g)).toHaveLength(2);
    expect(documentation).toContain('Default: <span class="component-property-value">false</span>');
    expect(documentation).toContain('Default: <span class="component-property-value">0</span>');
  });
});
