import { describe, expect, it } from 'vitest';
import type { PageLayout, PageLayouts } from '../types';
import { getPageNames } from './pageUtils';

const emptyPage: PageLayout = { $schema: '', data: { layout: [] } };
const layouts: PageLayouts = { side1: emptyPage, side2: emptyPage, side3: emptyPage };

describe('getPageNames', () => {
  it('returns the pages in the order from the settings', () => {
    const settings = { pages: { order: ['side3', 'side1', 'side2'] } };
    expect(getPageNames(layouts, settings)).toEqual(['side3', 'side1', 'side2']);
  });

  it('puts pages that are missing from the order last', () => {
    const settings = { pages: { order: ['side2'] } };
    expect(getPageNames(layouts, settings)).toEqual(['side2', 'side1', 'side3']);
  });

  it('leaves out pages in the order that do not exist', () => {
    const settings = { pages: { order: ['deleted', 'side1'] } };
    expect(getPageNames(layouts, settings)).toEqual(['side1', 'side2', 'side3']);
  });

  it('returns the pages in file order when there are no settings', () => {
    expect(getPageNames(layouts, undefined)).toEqual(['side1', 'side2', 'side3']);
  });
});
