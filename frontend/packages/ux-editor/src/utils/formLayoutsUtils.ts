import { IFormLayouts, IInternalLayout } from '../types/global';
import {
  addNavigationButtons,
  hasNavigationButtons,
  removeComponentsByType
} from './formLayout';
import { ComponentType } from '../components';
import { removeItemByValue } from 'app-shared/utils/arrayUtils';
import { generateComponentId } from './generateId';
import { deepCopy } from 'app-shared/pure';

/**
 * Update layouts to have navigation buttons if there are multiple layouts, or remove them if this is the only one.
 * This function also accepts an optional callback function which will be called for each changed layout and always on the current one. This should be used to make a save call for each layout.
 * @param layouts All layouts.
 * @param callback Callback to be called for each layout if there are changes or if the layout is the one specified by the currentLayoutName parameter.
 * @param currentLayoutName The name of the current layout. Callback will always be called for this layout if set.
 */
export const addOrRemoveNavigationButtons = async (
  layouts: IFormLayouts,
  callback: (layoutName: string, layout: IInternalLayout) => Promise<void>,
  currentLayoutName?: string,
): Promise<IFormLayouts> => {
  if (currentLayoutName && !layouts[currentLayoutName]) {
    throw new Error(`Layout with name ${currentLayoutName} does not exist.`);
  }

  const updatedLayouts = deepCopy(layouts);

  // Update layouts to have navigation buttons if there are multiple layouts, or remove them if there is the only one.
  const allLayoutNames = Object.keys(layouts);
  if (allLayoutNames.length === 1) {
    // There is only one layout
    const name = allLayoutNames[0];
    const layout = removeComponentsByType(layouts[name], ComponentType.NavigationButtons);
    await callback(name, layout);
    updatedLayouts[name] = layout;
  } else {
    // There are multiple layouts
    for (const name of removeItemByValue(allLayoutNames, currentLayoutName)) {
      const layout = layouts[name];
      if (!hasNavigationButtons(layout)) {
        const navButtonsId = generateComponentId(ComponentType.NavigationButtons, layouts);
        const layoutWithNavigation = addNavigationButtons(layout, navButtonsId);
        updatedLayouts[name] = layoutWithNavigation;
        await callback(name, layoutWithNavigation);
      }
    }
    if (currentLayoutName) {
      // Add navigation buttons to the current layout if they are not present, and run callback
      let currentLayout = layouts[currentLayoutName];
      if (!hasNavigationButtons(currentLayout)) {
        const navButtonsId = generateComponentId(ComponentType.NavigationButtons, layouts);
        currentLayout = addNavigationButtons(currentLayout, navButtonsId);
        updatedLayouts[currentLayoutName] = currentLayout;
      }
      await callback(currentLayoutName, currentLayout);
    }
  }
  return updatedLayouts;
}
