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
  it('renders nested object and array properties with expression result types', () => {
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

    const documentation = generateComponentDocumentation(catalog, {}, 'nb').get('Example');

    expect(documentation).not.toContain('### Eksempel');
    expect(documentation).toContain('| `rows` | `object[]` | Ja |');
    expect(documentation).toContain(
      '| `rows[].label` | `string \\| expression<string>` | Nei | `"Label"` | Vist ledetekst. |',
    );
  });

  it('parenthesizes union array item types', () => {
    const catalog = {
      Example: {
        ...exampleComponent,
        properties: {
          values: {
            type: 'array',
            required: false,
            items: {
              type: 'union',
              variants: [
                { type: 'constant', value: 'one' },
                { type: 'constant', value: 'two' },
              ],
            },
          },
        },
      },
    } as const satisfies ComponentCatalog;

    expect(generateComponentDocumentation(catalog, {}, 'en').get('Example')).toContain(
      '| `values` | `("one" \\| "two")[]` | No |  |',
    );
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

    expect(documentation).toContain('| `items[type=Text].value` | `string` | Yes |  |');
    expect(documentation).toContain('| `items[type=Number].value` | `number` | Yes |  |');
  });

  it('separates common properties and renders numeric constraints', () => {
    const constrainedNumber = {
      type: 'number',
      minimum: 1,
      maximum: 12,
      default: 6,
      required: false,
    } as const;
    const catalog = {
      Example: {
        ...exampleComponent,
        properties: { id: constrainedNumber, value: constrainedNumber },
      },
    } as const satisfies ComponentCatalog;

    const documentation = generateComponentDocumentation(catalog, { id: constrainedNumber }, 'en');

    expect(documentation.get('Example')).toContain(
      'common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/)',
    );
    expect(documentation.get('Example')).not.toContain('| `id` |');
    expect(documentation.get('Example')).toContain('| `value` | `number (1–12)` | No | `6` |  |');
    expect(documentation.get('_common')).toContain('| `id` | `number (1–12)` | No | `6` |  |');
  });
});
