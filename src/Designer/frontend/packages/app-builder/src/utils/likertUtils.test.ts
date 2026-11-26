import { describe, expect, it } from 'vitest';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { PageLayouts } from '../types';
import {
  createLikert,
  getLikertCategories,
  hasLikertModel,
  LIKERT_MODEL_FIELD,
  suggestCategory,
  withLikertModel,
} from './likertUtils';

const schema: JsonSchema = { type: 'object', properties: { navn: { type: 'string' } } };

const layoutsWith = (categories: string[]): PageLayouts =>
  ({
    side1: {
      data: {
        layout: categories.map((category, i) => ({ id: `t${i}`, type: 'LikertStatic', category })),
      },
    },
  }) as unknown as PageLayouts;

describe('withLikertModel', () => {
  it('adds the shared list and its types, and keeps the fields already there', () => {
    const result = withLikertModel(schema);
    expect(result.properties?.navn).toEqual({ type: 'string' });
    expect(result.properties?.[LIKERT_MODEL_FIELD]).toEqual({
      type: 'array',
      items: { $ref: '#/$defs/Likert' },
    });
    expect(Object.keys(result.$defs ?? {})).toEqual(['Likert', 'LikertQuestion']);
  });

  it('leaves a schema that has the list as it is', () => {
    const once = withLikertModel(schema);
    expect(withLikertModel(once)).toBe(once);
    expect(hasLikertModel(once)).toBe(true);
  });
});

describe('suggestCategory', () => {
  it('makes a category from the heading', () => {
    expect(suggestCategory('Hvor fornøyd er du med tjenesten?', [])).toBe('hvor-fornoyd-er-du-med');
  });

  it('adds a number when the category is taken', () => {
    expect(suggestCategory('Tilfredshet', ['tilfredshet', 'tilfredshet-2'])).toBe('tilfredshet-3');
  });

  it('has a fallback for a heading without letters', () => {
    expect(suggestCategory('???', [])).toBe('skala');
  });
});

describe('createLikert', () => {
  const values = {
    title: 'Tilfredshet',
    scale: 'agree' as const,
    ownOptions: [],
    includeDontKnow: true,
    questions: ['Lett å forstå', 'Fikk svar'],
    required: [true, false],
  };

  it('binds the table to the shared list and names it by a free category', () => {
    const { parent } = createLikert({
      values,
      pageName: 'side1',
      layouts: layoutsWith(['tilfredshet']),
      dataType: 'model',
    });
    expect(parent.category).toBe('tilfredshet-2');
    expect(parent.dataModelBindings).toEqual({
      group: { field: LIKERT_MODEL_FIELD, dataType: 'model' },
    });
  });

  it('gives the questions no fields of their own', () => {
    const { children } = createLikert({ values, pageName: 'side1', layouts: layoutsWith([]) });
    expect(children.map((c) => c.dataModelBindings)).toEqual([undefined, undefined]);
    expect(children.map((c) => c.required)).toEqual([true, undefined]);
  });
});

describe('getLikertCategories', () => {
  it('lists the categories of every table in the app', () => {
    expect(getLikertCategories(layoutsWith(['a', 'b']))).toEqual(['a', 'b']);
  });
});
