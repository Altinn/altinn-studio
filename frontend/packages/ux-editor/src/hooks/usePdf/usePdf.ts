import type { IFormLayouts } from '@altinn/ux-editor/types/global';
import { useAppContext, useFormLayouts } from '@altinn/ux-editor/hooks';
import { useFormLayoutSettingsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutSettingsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  getComponentsInCurrentLayoutToExcludeFromPdf,
  getRemainingComponentsToExcludeFromOtherLayouts,
} from './pdfUtils';
import type { ILayoutSettings } from 'app-shared/types/global';
import { getAllFormItemIds } from '@altinn/ux-editor/utils/formLayoutUtils';

export const usePdf = () => {
  const layouts: IFormLayouts = useFormLayouts();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const pdfLayoutName: string | undefined = formLayoutSettings.pages.pdfLayoutName || undefined;

  const currentPageIsPdf: boolean = pdfLayoutName === selectedFormLayoutName;

  const currentPageIsExcludedFromPdf: boolean =
    formLayoutSettings?.pages?.excludeFromPdf?.includes(selectedFormLayoutName);

  const allComponentsToExcludeInPdf: string[] =
    formLayoutSettings?.components?.excludeFromPdf || [];

  const componentIdsInCurrentLayout: string[] =
    layouts[selectedFormLayoutName] && getAllFormItemIds(layouts[selectedFormLayoutName]); // should this live directly in the PdfConfig?

  const componentsInCurrentLayoutToExcludeFromPdf = getComponentsInCurrentLayoutToExcludeFromPdf(
    componentIdsInCurrentLayout,
    allComponentsToExcludeInPdf,
  );

  const remainingComponentsToExcludeFromOtherLayouts =
    getRemainingComponentsToExcludeFromOtherLayouts(
      allComponentsToExcludeInPdf,
      componentIdsInCurrentLayout,
    );

  const convertCurrentPageToPdf = (layoutSettings: ILayoutSettings): ILayoutSettings => {
    layoutSettings.pages.pdfLayoutName = selectedFormLayoutName;
    layoutSettings.pages.order.splice(
      layoutSettings.pages.order.indexOf(selectedFormLayoutName),
      1,
    );
    return layoutSettings;
  };

  const excludeComponentsFromPdf = (
    layoutSettings: ILayoutSettings,
    componentsToExclude: string[],
  ) => {
    // The list of components to exclude will become empty so deleting field in Settings:
    if (
      remainingComponentsToExcludeFromOtherLayouts.length === 0 &&
      componentsToExclude.length === 0
    ) {
      delete layoutSettings.components.excludeFromPdf;
      if (Object.keys(layoutSettings.components).length === 0) {
        delete layoutSettings.components;
      }
    }

    // There are components in the array of excluded components from before:
    else if (allComponentsToExcludeInPdf?.length > 0) {
      const combinedComponents = new Set([
        ...remainingComponentsToExcludeFromOtherLayouts,
        ...componentsToExclude,
      ]);
      layoutSettings.components.excludeFromPdf = Array.from(combinedComponents);
    }

    // There are no components in the array of excluded components from before:
    else {
      layoutSettings.components = {
        ...layoutSettings.components,
        excludeFromPdf: componentsToExclude,
      };
    }
    return layoutSettings;
  };

  const setPageAsExcludeFromPdf = (layoutSettings: ILayoutSettings) => {
    const currentExcludedPages = formLayoutSettings.pages.excludeFromPdf;
    layoutSettings.pages.excludeFromPdf = [...currentExcludedPages, selectedFormLayoutName];
    return layoutSettings;
  };

  const unsetPageFromExcludeFromPdf = (layoutSettings: ILayoutSettings) => {
    const currentExcludedPages = formLayoutSettings.pages.excludeFromPdf;

    if (currentExcludedPages.length > 0) {
      const indexOfCurrentPageInExclude =
        formLayoutSettings.pages.excludeFromPdf.indexOf(selectedFormLayoutName);
      layoutSettings.pages.excludeFromPdf = layoutSettings.pages.excludeFromPdf.splice(
        indexOfCurrentPageInExclude,
        1,
      );
    } else {
      delete layoutSettings.pages.excludeFromPdf;
    }
    return layoutSettings;
  };

  const addLayoutToPages = (
    layoutSettings: ILayoutSettings,
    layoutName: string,
  ): ILayoutSettings => {
    layoutSettings.pages.order.push(layoutName);
    return layoutSettings;
  };

  const deletePdfFromSettings = (layoutSettings: ILayoutSettings): ILayoutSettings => {
    delete layoutSettings.pages.pdfLayoutName;
    return layoutSettings;
  };

  return {
    pdfLayoutName,
    currentPageIsPdf,
    currentPageIsExcludedFromPdf,
    componentsInCurrentLayoutToExcludeFromPdf,
    componentIdsInCurrentLayout,
    addLayoutToPages,
    convertCurrentPageToPdf,
    deletePdfFromSettings,
    excludeComponentsFromPdf,
    unsetPageFromExcludeFromPdf,
    setPageAsExcludeFromPdf,
  };
};
