import { useTranslation } from 'react-i18next';
import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations/useUpsertTextResourcesMutation';
import { EDITOR_LANGUAGE } from '../constants';
import { useAppBuilder } from '../contexts/AppBuilderContext';
import {
  addNavigationButtons,
  createContentPageLayout,
  createSummaryPageLayout,
  excludePageFromPdf,
  generatePageName,
  generatePageTitle,
  getPageTitle,
  hasNavigationButtons,
  summaryPageName as defaultSummaryPageName,
} from '../utils/pageUtils';
import { useChangePageOrderMutation, useCreatePageMutation } from './usePageMutations';
import { useSaveLayoutSettingsMutation } from './useSaveLayoutSettingsMutation';
import { useSavePageLayoutMutation } from './useSavePageLayoutMutation';

export type PageActions = {
  /**
   * Adds a page after the given content page, or last before the summary page, and returns its name,
   * or undefined if it failed.
   */
  addPage: (afterPageName?: string) => Promise<string | undefined>;
  movePage: (pageName: string, offset: number) => void;
  /** Adds Previous and Next to the given pages that do not have them. */
  addNavigationButtonsTo: (pageNames: string[]) => void;
  /** Adds a last page that sums up the answers, and returns its name, or undefined if it failed. */
  addSummaryPage: () => Promise<string | undefined>;
};

export const usePageActions = (): PageActions => {
  const { t } = useTranslation();
  const { org, app, layoutSetName, layouts, contentPageNames, summaryPageName, texts } =
    useAppBuilder();
  const { mutateAsync: createPage } = useCreatePageMutation(org, app, layoutSetName);
  const { mutateAsync: changePageOrder, mutate: changePageOrderInBackground } =
    useChangePageOrderMutation(org, app, layoutSetName);
  const { mutateAsync: upsertTextResources } = useUpsertTextResourcesMutation(org, app);
  const { mutate: savePageLayout, mutateAsync: savePageLayoutAsync } = useSavePageLayoutMutation(
    org,
    app,
    layoutSetName,
  );
  const { mutateAsync: saveLayoutSettings } = useSaveLayoutSettingsMutation(
    org,
    app,
    layoutSetName,
  );
  const withSummary = (pageNames: string[]): string[] =>
    summaryPageName ? [...pageNames, summaryPageName] : pageNames;

  const addPage = async (afterPageName?: string): Promise<string | undefined> => {
    const pageName = generatePageName(Object.keys(layouts));
    const afterIndex = contentPageNames.indexOf(afterPageName);
    const insertIndex = afterIndex === -1 ? contentPageNames.length : afterIndex + 1;
    const pageNames = [...contentPageNames];
    pageNames.splice(insertIndex, 0, pageName);
    try {
      await createPage(pageName);
      // The backend's Previous and Next do not check the page, so the builder's replace them.
      await savePageLayoutAsync({ pageName, layout: createContentPageLayout(pageName) });
      await upsertTextResources({
        language: EDITOR_LANGUAGE,
        textResources: [
          {
            id: pageName,
            value: generatePageTitle(
              t('app_builder.page.default_name'),
              Object.keys(layouts).map((name) => getPageTitle(name, texts)),
            ),
          },
        ],
      });
      // The backend adds the page last, so it is moved to its place, in front of the summary page.
      const isLast = insertIndex === contentPageNames.length;
      if (!isLast || summaryPageName) await changePageOrder(withSummary(pageNames));
      return pageName;
    } catch {
      return undefined;
    }
  };

  const movePage = (pageName: string, offset: number): void => {
    const fromIndex = contentPageNames.indexOf(pageName);
    const toIndex = fromIndex + offset;
    if (fromIndex === -1 || toIndex < 0 || toIndex >= contentPageNames.length) return;
    const pageNames = [...contentPageNames];
    pageNames.splice(fromIndex, 1);
    pageNames.splice(toIndex, 0, pageName);
    changePageOrderInBackground(withSummary(pageNames));
  };

  const addNavigationButtonsTo = (pageNames: string[]): void =>
    pageNames
      .filter((pageName) => !hasNavigationButtons(layouts[pageName]))
      .forEach((pageName) =>
        savePageLayout({ pageName, layout: addNavigationButtons(layouts[pageName], pageName) }),
      );

  const addSummaryPage = async (): Promise<string | undefined> => {
    const pageNames = Object.keys(layouts);
    const pageName = pageNames.includes(defaultSummaryPageName)
      ? generatePageName(pageNames)
      : defaultSummaryPageName;
    const summaryPage = createSummaryPageLayout(pageName, {
      heading: t('app_builder.summary.title'),
      introduction: t('app_builder.summary.introduction'),
      submitButton: t('app_builder.summary.default_submit_text'),
    });
    try {
      // The backend adds the page last, with its own Previous and Next, which the layout replaces.
      await createPage(pageName);
      await upsertTextResources({
        language: EDITOR_LANGUAGE,
        textResources: Object.entries(summaryPage.texts).map(([id, value]) => ({ id, value })),
      });
      await savePageLayoutAsync({ pageName, layout: summaryPage.layout });
      await saveLayoutSettings((settings) => excludePageFromPdf(settings, pageName));
      return pageName;
    } catch {
      return undefined;
    }
  };

  return {
    addPage,
    movePage,
    addNavigationButtonsTo,
    addSummaryPage,
  };
};
