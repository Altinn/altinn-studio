import type { IFormLayouts } from '@altinn/ux-editor/types/global';
import { flattenObjectValues } from 'app-shared/utils/objectUtils';
import type { ILayoutSettings } from 'app-shared/types/global';

export const getComponentIdsInCurrentLayout = (
  layouts: IFormLayouts,
  selectedFormLayoutName: string,
): string[] => {
  if (!Object.keys(layouts).includes(selectedFormLayoutName)) return [];
  return flattenObjectValues(layouts[selectedFormLayoutName]?.order) || [];
};

export const getComponentsInCurrentLayoutToExcludeFromPdf = (
  componentIdsInCurrentLayout: string[],
  allComponentsToExcludeInPdf: string[],
): string[] => {
  return componentIdsInCurrentLayout.filter((component) =>
    allComponentsToExcludeInPdf.includes(component),
  );
};

export const getRemainingComponentsToExcludeFromOtherLayouts = (
  allComponentsToExcludeInPdf: string[],
  componentIdsInCurrentLayout: string[],
): string[] => {
  return allComponentsToExcludeInPdf.filter(
    (component) => !componentIdsInCurrentLayout.includes(component),
  );
};

export const handleConvertPageToPdf = (
  formLayoutSettings: ILayoutSettings,
  selectedFormLayoutName: string,
  mutateFormLayoutSettings: (settings: ILayoutSettings) => void,
): void => {
  formLayoutSettings.pages.pdfLayoutName = selectedFormLayoutName;
  const index = formLayoutSettings.pages.order.indexOf(selectedFormLayoutName);
  if (index > -1) {
    formLayoutSettings.pages.order.splice(index, 1);
  }
  mutateFormLayoutSettings(formLayoutSettings);
};

export const handleExcludePageFromPdf = (
  updatedFormLayoutSettings: ILayoutSettings,
  selectedFormLayoutName: string,
  remainingComponentsToExcludeFromOtherLayouts: string[],
  allComponentsToExcludeInPdf: string[],
  excludeCurrentPageFromPdf: boolean,
): ILayoutSettings => {
  if (updatedFormLayoutSettings.pages.excludeFromPdf) {
    if (excludeCurrentPageFromPdf) {
      updatedFormLayoutSettings.pages.excludeFromPdf.push(selectedFormLayoutName);
      updatedFormLayoutSettings = handleExcludeComponentsFromPdf(
        updatedFormLayoutSettings,
        [],
        remainingComponentsToExcludeFromOtherLayouts,
        allComponentsToExcludeInPdf,
      );
    } else {
      updatedFormLayoutSettings.pages.excludeFromPdf.splice(
        updatedFormLayoutSettings.pages.excludeFromPdf.indexOf(selectedFormLayoutName),
      );
    }
  } else {
    if (excludeCurrentPageFromPdf) {
      updatedFormLayoutSettings.pages.excludeFromPdf = [selectedFormLayoutName];
      updatedFormLayoutSettings = handleExcludeComponentsFromPdf(
        updatedFormLayoutSettings,
        [],
        remainingComponentsToExcludeFromOtherLayouts,
        allComponentsToExcludeInPdf,
      );
    } else {
      delete updatedFormLayoutSettings.pages.excludeFromPdf;
    }
  }
  return updatedFormLayoutSettings;
};

export const handleExcludeComponentsFromPdf = (
  formLayoutSettings: ILayoutSettings,
  componentsToExclude: string[],
  remainingComponentsToExcludeFromOtherLayouts: string[],
  allComponentsToExcludeInPdf: string[],
): ILayoutSettings => {
  // The list of components to exclude will become empty so deleting fields in Settings:
  if (
    remainingComponentsToExcludeFromOtherLayouts.length === 0 &&
    componentsToExclude.length === 0
  ) {
    delete formLayoutSettings.components.excludeFromPdf;
    if (Object.keys(formLayoutSettings.components).length === 0) {
      delete formLayoutSettings.components;
    }
  }

  // There are components in the array of excluded components from before:
  else if (allComponentsToExcludeInPdf?.length > 0) {
    const combinedComponents = new Set([
      ...remainingComponentsToExcludeFromOtherLayouts,
      ...componentsToExclude,
    ]);
    formLayoutSettings.components.excludeFromPdf = Array.from(combinedComponents);
  }

  // There are no components in the array of excluded components from before:
  else {
    formLayoutSettings.components = {
      ...formLayoutSettings.components,
      excludeFromPdf: componentsToExclude,
    };
  }
  return formLayoutSettings;
};
