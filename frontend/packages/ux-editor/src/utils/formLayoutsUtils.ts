import type { IFormLayouts, IInternalLayout } from '../types/global';
import {
  addNavigationButtons,
  createEmptyLayout,
  hasNavigationButtons,
  removeComponentsByType,
} from './formLayoutUtils';
import { ComponentType } from 'app-shared/types/ComponentType';
import { generateComponentId } from './generateId';
import { deepCopy } from 'app-shared/pure';
import { DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import type { FormLayoutsResponse } from 'app-shared/types/api/FormLayoutsResponse';
import { ArrayUtils } from '@studio/pure-functions';
import { externalLayoutToInternal } from '../converters/formLayoutConverters';

/**
 * Update layouts to have navigation buttons if there are multiple layouts, or remove them if this is the only one.
 * This function also accepts an optional callback function which will be called for each changed layout and always on the current one. This should be used to make a save call for each layout.
 * @param layouts All layouts.
 * @param callback Callback to be called for each layout if there are changes or if the layout is the one specified by the currentLayoutName parameter.
 * @param currentLayoutName The name of the current layout. Callback will always be called for this layout if set.
 * @param receiptLayoutName The name of the receipt layout. Ensures that receipt layout is ignored when adding/deleting navigation buttons.
 */
export const addOrRemoveNavigationButtons = async (
  layouts: IFormLayouts,
  callback: (layoutName: string, layout: IInternalLayout) => Promise<void>,
  currentLayoutName?: string,
  receiptLayoutName?: string,
): Promise<IFormLayouts> => {
  if (currentLayoutName && !layouts[currentLayoutName]) {
    throw new Error(`Layout with name ${currentLayoutName} does not exist.`);
  }

  const allLayouts = deepCopy(layouts);
  let layoutsToUpdate: string[] = [];

  // Update layouts to have navigation buttons if there are multiple layouts, or remove them if there is only one.
  const allLayoutNames = Object.keys(layouts);
  const layoutsThatShouldHaveNavigationButtons = allLayoutNames.filter(
    (name) => name !== receiptLayoutName,
  );
  if (layoutsThatShouldHaveNavigationButtons.length === 1) {
    // There is only one layout
    const name = layoutsThatShouldHaveNavigationButtons[0];
    const layout = removeComponentsByType(layouts[name], ComponentType.NavigationButtons);
    layouts[name] !== layout && layoutsToUpdate.push(name);
    allLayouts[name] = layout;
  } else {
    // There are multiple layouts
    for (const name of layoutsThatShouldHaveNavigationButtons) {
      const layout = layouts[name];
      if (!hasNavigationButtons(layout)) {
        const navButtonsId = generateComponentId(ComponentType.NavigationButtons, layouts);
        allLayouts[name] = addNavigationButtons(layout, navButtonsId);
        layoutsToUpdate.push(name);
      }
    }
  }
  currentLayoutName && layoutsToUpdate.push(currentLayoutName); // Always update the current layout if it is set
  layoutsToUpdate = ArrayUtils.removeDuplicates(layoutsToUpdate); // Remove duplicates so that callback is only called once for each layout
  await Promise.all(layoutsToUpdate.map((name) => callback(name, allLayouts[name])));
  return allLayouts;
};

interface AllLayouts {
  convertedLayouts: IFormLayouts;
  invalidLayouts: string[];
}

/**
 * Converts list of external layouts to internal format.
 * @param layouts List of layouts in external format.
 * @returns A list of layouts in internal format and a list of layouts with an invalid format.
 */
export const convertExternalLayoutsToInternalFormat = (
  layouts: FormLayoutsResponse,
): AllLayouts => {
  const convertedLayouts: IFormLayouts = {};
  const invalidLayouts: string[] = [];
  Object.entries(layouts).forEach(([name, layout]) => {
    if (!layout || !layout.data) {
      convertedLayouts[name] = createEmptyLayout();
    } else {
      try {
        convertedLayouts[name] = externalLayoutToInternal(layouts[name]);
      } catch {
        invalidLayouts.push(name);
      }
    }
  });
  return { convertedLayouts, invalidLayouts };
};

/**
 * Finds the first available layout to select when a layout is deleted
 * @param deletedLayoutName The name of the deleted layout
 * @param layoutPagesOrder  The current layout order
 * @returns The name of the layout to select, or 'default' if there are no available layouts
 */
export const firstAvailableLayout = (deletedLayoutName: string, layoutPagesOrder: string[]) => {
  const deletedLayoutIndex = layoutPagesOrder.indexOf(deletedLayoutName);
  if (deletedLayoutIndex > 0) {
    return layoutPagesOrder[deletedLayoutIndex - 1];
  }

  if (deletedLayoutIndex < layoutPagesOrder.length - 1) {
    return layoutPagesOrder[deletedLayoutIndex + 1];
  }

  return DEFAULT_SELECTED_LAYOUT_NAME;
};
