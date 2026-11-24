import { layoutSchemaUrl } from 'app-shared/cdn-paths';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ILayoutSettings } from 'app-shared/types/global';
import type { LayoutComponent, PageLayout, PageLayouts, TextsById } from '../types';

/** The ID new pages get, followed by a number. */
const newPageIdPrefix = 'side';

export const summaryPageName = 'oppsummering';

/**
 * Returns the names of the pages in the order the app shows them. Pages missing from the order in
 * the settings file come last, so a page is never hidden from the editor.
 */
export function getPageNames(layouts: PageLayouts, settings?: ILayoutSettings): string[] {
  const existingPages = Object.keys(layouts);
  const orderedPages = (settings?.pages?.order ?? []).filter((page) =>
    existingPages.includes(page),
  );
  const unorderedPages = existingPages.filter((page) => !orderedPages.includes(page));
  return [...orderedPages, ...unorderedPages];
}

/**
 * The page's readable name is the text resource with the page name as key, which is what the app's
 * navigation bar and summary show. Without one, the page name is shown.
 */
export function getPageTitle(pageName: string, texts: TextsById): string {
  return texts[pageName] || pageName;
}

/** The summary page shows the answers before the user submits them. */
export function isSummaryPage(layout: PageLayout | undefined): boolean {
  return Boolean(layout?.data.layout.some(({ type }) => type === ComponentType.Summary2));
}

/** The summary page comes last, so content pages are the ones before it. */
export function splitSummaryPage(
  pageNames: string[],
  layouts: PageLayouts,
): { contentPageNames: string[]; summaryPageName?: string } {
  const lastPageName = pageNames[pageNames.length - 1];
  if (lastPageName && isSummaryPage(layouts[lastPageName])) {
    return { contentPageNames: pageNames.slice(0, -1), summaryPageName: lastPageName };
  }
  return { contentPageNames: pageNames };
}

/**
 * Components the builder adds and maintains itself: the navigation buttons on every page, and the
 * summary and submit button on the summary page. The canvas shows them as a fixed part of the page
 * rather than as components the user edits.
 */
export function isManagedComponent(component: LayoutComponent, isOnSummaryPage: boolean): boolean {
  if (component.type === ComponentType.NavigationButtons) return true;
  return (
    isOnSummaryPage && (component.type === ComponentType.Summary2 || isSubmitButton(component))
  );
}

export function isSubmitButton(component: LayoutComponent): boolean {
  return component.type === ComponentType.Button;
}

/** The text key of the summary page's submit button, so its label can be edited in place. */
export function getSubmitButtonTextKey(layout: PageLayout): string | undefined {
  const button = layout.data.layout.find(isSubmitButton);
  const title = button?.textResourceBindings?.title;
  return typeof title === 'string' ? title : undefined;
}

const summaryTypes: string[] = [ComponentType.Summary2, ComponentType.Summary];

/** Whether any page sums up answers, so the app needs no summary page from the builder. */
export function hasSummary(layouts: PageLayouts): boolean {
  return Object.values(layouts).some((layout) =>
    layout.data.layout.some(({ type }) => summaryTypes.includes(type)),
  );
}

export function hasNavigationButtons(layout: PageLayout): boolean {
  return layout.data.layout.some(({ type }) => type === ComponentType.NavigationButtons);
}

/** Adds Previous and Next buttons at the bottom of the page, as on every page of a basic app. */
export function addNavigationButtons(layout: PageLayout, pageName: string): PageLayout {
  return {
    ...layout,
    data: {
      ...layout.data,
      layout: [...layout.data.layout, createNavigationButtons(pageName)],
    },
  };
}

/**
 * Previous and Next. Next checks the answers on the page first, so the user finds what is missing
 * where it is rather than when submitting.
 */
function createNavigationButtons(pageName: string): LayoutComponent {
  return {
    id: `${pageName}-navigation`,
    type: ComponentType.NavigationButtons,
    showBackButton: true,
    validateOnNext: { page: 'current', show: ['All'] },
  };
}

export function createContentPageLayout(pageName: string): PageLayout {
  return addNavigationButtons({ $schema: layoutSchemaUrl(), data: { layout: [] } }, pageName);
}

export type SummaryPageTexts = {
  heading: string;
  introduction: string;
  submitButton: string;
};

export type NewSummaryPage = {
  layout: PageLayout;
  texts: TextsById;
};

/**
 * A page with a heading, a short introduction, a summary of every page in the layout set and a
 * submit button.
 */
export function createSummaryPageLayout(pageName: string, texts: SummaryPageTexts): NewSummaryPage {
  const textKey = (componentId: string): string => `${pageName}.${componentId}.title`;
  const headingId = `${pageName}-heading`;
  const introductionId = `${pageName}-introduction`;
  const submitButtonId = `${pageName}-submit`;
  const layout: PageLayout = {
    $schema: layoutSchemaUrl(),
    data: {
      layout: [
        {
          id: headingId,
          type: ComponentType.Heading,
          size: 'L',
          textResourceBindings: { title: textKey(headingId) },
        },
        {
          id: introductionId,
          type: ComponentType.Paragraph,
          textResourceBindings: { title: textKey(introductionId) },
        },
        { id: `${pageName}-summary`, type: ComponentType.Summary2, target: { type: 'layoutSet' } },
        createNavigationButtons(pageName),
        {
          id: submitButtonId,
          type: ComponentType.Button,
          textResourceBindings: { title: textKey(submitButtonId) },
        },
      ],
    },
  };
  return {
    layout,
    texts: {
      [pageName]: texts.heading,
      [textKey(headingId)]: texts.heading,
      [textKey(introductionId)]: texts.introduction,
      [textKey(submitButtonId)]: texts.submitButton,
    },
  };
}

/** Returns a page name that no page has, such as `side3`. */
export function generatePageName(existingPageNames: string[]): string {
  let number = existingPageNames.length + 1;
  while (existingPageNames.includes(`${newPageIdPrefix}${number}`)) number++;
  return `${newPageIdPrefix}${number}`;
}

/** Returns the page's number among the content pages, counting from 1. */
export function getPageNumber(pageName: string, contentPageNames: string[]): number {
  return contentPageNames.indexOf(pageName) + 1;
}

/**
 * A readable name for a new page that no other page has, such as `Ny side 2`. The name does not
 * follow the page's place, since pages keep their names when others are added or moved.
 */
export function generatePageTitle(baseTitle: string, existingTitles: string[]): string {
  if (!existingTitles.includes(baseTitle)) return baseTitle;
  let number = 2;
  while (existingTitles.includes(`${baseTitle} ${number}`)) number++;
  return `${baseTitle} ${number}`;
}

/**
 * Leaves the page out of the PDF, as a summary page should be: the PDF already shows every answer.
 */
export function excludePageFromPdf(settings: ILayoutSettings, pageName: string): ILayoutSettings {
  const excluded = settings.pages?.excludeFromPdf ?? [];
  if (excluded.includes(pageName)) return settings;
  return { ...settings, pages: { ...settings.pages, excludeFromPdf: [...excluded, pageName] } };
}

/** Removes a deleted page from the pages left out of the PDF. */
export function forgetPageInPdfSettings(
  settings: ILayoutSettings,
  pageName: string,
): ILayoutSettings {
  const excluded = settings.pages?.excludeFromPdf;
  if (!excluded?.includes(pageName)) return settings;
  const remaining = excluded.filter((name) => name !== pageName);
  const { excludeFromPdf: _excluded, ...pages } = settings.pages;
  return {
    ...settings,
    pages: remaining.length > 0 ? { ...pages, excludeFromPdf: remaining } : pages,
  };
}
