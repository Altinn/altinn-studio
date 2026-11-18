import { describe, expect, it } from 'vitest';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { PageLayouts } from '../types';
import { countMissing, getTextRows } from './textRowUtils';

const layouts: PageLayouts = {
  side1: {
    $schema: '',
    data: {
      layout: [
        {
          id: 'choice',
          type: ComponentType.Checkboxes,
          textResourceBindings: { title: 'choice.title' },
          options: [{ value: '1', label: 'choice.option1' }],
        },
      ],
    },
  },
};

describe('getTextRows', () => {
  it('lists the page name, then the texts of each component', () => {
    expect(getTextRows(layouts, ['side1']).map(({ textKey }) => textKey)).toEqual([
      'side1',
      'choice.title',
      'choice.option1',
    ]);
  });
});

describe('countMissing', () => {
  it('counts the texts that are only in the main language', () => {
    const rows = getTextRows(layouts, ['side1']);
    const nb = { side1: 'Side 1', 'choice.title': 'Velg' };
    expect(countMissing(rows, nb, { side1: 'Side 1' })).toBe(1);
  });
});
