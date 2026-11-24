import { describe, expect, it } from 'vitest';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { PageLayout, PageLayouts } from '../types';
import {
  addNavigationButtons,
  createSummaryPageLayout,
  excludePageFromPdf,
  forgetPageInPdfSettings,
  generatePageName,
  generatePageTitle,
  getPageNames,
  isManagedComponent,
  splitSummaryPage,
} from './pageUtils';

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

describe('splitSummaryPage', () => {
  it('takes the last page as the summary page when it has a summary', () => {
    const { layout } = createSummaryPageLayout('oppsummering', {
      heading: 'Oppsummering',
      introduction: 'Se over svarene.',
      submitButton: 'Send inn',
    });
    const withSummary: PageLayouts = { ...layouts, oppsummering: layout };
    expect(splitSummaryPage(['side1', 'side2', 'oppsummering'], withSummary)).toEqual({
      contentPageNames: ['side1', 'side2'],
      summaryPageName: 'oppsummering',
    });
  });

  it('has no summary page when the last page has no summary', () => {
    expect(splitSummaryPage(['side1', 'side2'], layouts)).toEqual({
      contentPageNames: ['side1', 'side2'],
    });
  });
});

describe('isManagedComponent', () => {
  it('manages the navigation buttons on every page, and buttons only on the summary page', () => {
    const navigation = { id: 'nav', type: ComponentType.NavigationButtons };
    const button = { id: 'button', type: ComponentType.Button };
    expect(isManagedComponent(navigation, false)).toBe(true);
    expect(isManagedComponent(button, false)).toBe(false);
    expect(isManagedComponent(button, true)).toBe(true);
  });
});

describe('addNavigationButtons', () => {
  it('adds the buttons last on the page', () => {
    const updated = addNavigationButtons(emptyPage, 'side1');
    expect(updated.data.layout).toEqual([
      {
        id: 'side1-navigation',
        type: ComponentType.NavigationButtons,
        showBackButton: true,
        validateOnNext: { page: 'current', show: ['All'] },
      },
    ]);
  });
});

describe('generatePageName', () => {
  it('returns a name after the existing pages that no page has', () => {
    expect(generatePageName(['side1', 'side3'])).toBe('side4');
    expect(generatePageName(['side1', 'oppsummering'])).toBe('side3');
  });
});

describe('generatePageTitle', () => {
  it('adds a number when another page has the name', () => {
    expect(generatePageTitle('Ny side', ['Søknaden'])).toBe('Ny side');
    expect(generatePageTitle('Ny side', ['Ny side', 'Ny side 2'])).toBe('Ny side 3');
  });
});

describe('excluding a page from the PDF', () => {
  it('adds the page once and keeps the rest of the settings', () => {
    const settings = { pages: { order: ['side1', 'oppsummering'] } };
    const updated = excludePageFromPdf(settings, 'oppsummering');
    expect(updated).toEqual({
      pages: { order: ['side1', 'oppsummering'], excludeFromPdf: ['oppsummering'] },
    });
    expect(excludePageFromPdf(updated, 'oppsummering')).toBe(updated);
  });

  it('forgets a deleted page, and changes nothing when it was not excluded', () => {
    const settings = { pages: { order: ['side1'], excludeFromPdf: ['oppsummering'] } };
    expect(forgetPageInPdfSettings(settings, 'oppsummering')).toEqual({
      pages: { order: ['side1'] },
    });
    expect(forgetPageInPdfSettings(settings, 'side1')).toBe(settings);
  });
});
