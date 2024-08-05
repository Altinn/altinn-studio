import type { IFormLayouts } from '../types/global';
import {
  addOrRemoveNavigationButtons,
  convertExternalLayoutsToInternalFormat,
  firstAvailableLayout,
  idExists,
} from './formLayoutsUtils';
import { ComponentType } from 'app-shared/types/ComponentType';
import { createEmptyLayout } from './formLayoutUtils';
import { BASE_CONTAINER_ID, DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { externalLayoutsMock, layout1NameMock, layout2NameMock } from '../testing/layoutMock';
import type { FormButtonComponent } from '../types/FormComponent';
import { componentMocks } from '../testing/componentMocks';

describe('formLayoutsUtils', () => {
  describe('addOrRemoveNavigationButtons', () => {
    it('Adds navigation buttons to all layouts if there are multiple layouts', async () => {
      const layout1Id = 'layout1';
      const layout2Id = 'layout2';
      const callback = jest.fn();
      const layouts: IFormLayouts = {
        [layout1Id]: createEmptyLayout(),
        [layout2Id]: createEmptyLayout(),
      };
      const updatedLayouts = await addOrRemoveNavigationButtons(layouts, callback, layout1Id);
      const layout1Components = Object.values(updatedLayouts[layout1Id].components);
      const layout2Components = Object.values(updatedLayouts[layout2Id].components);
      expect(layout1Components.length).toBe(1);
      expect(layout1Components[0].type).toBe(ComponentType.NavigationButtons);
      expect(layout2Components.length).toBe(1);
      expect(layout2Components[0].type).toBe(ComponentType.NavigationButtons);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(layout1Id, updatedLayouts[layout1Id]);
      expect(callback).toHaveBeenCalledWith(layout2Id, updatedLayouts[layout2Id]);
    });

    it('Removes navigation buttons if there is only one layout', async () => {
      const layoutId = 'layout1';
      const callback = jest.fn();
      const navButtonsId = 'navButtons';
      const navButtonsComponent: FormButtonComponent = {
        id: navButtonsId,
        itemType: 'COMPONENT',
        onClickAction: jest.fn(),
        type: ComponentType.NavigationButtons,
        dataModelBindings: {},
      };
      const layouts: IFormLayouts = {
        [layoutId]: {
          components: { [navButtonsId]: navButtonsComponent },
          containers: {
            [BASE_CONTAINER_ID]: {
              id: BASE_CONTAINER_ID,
              itemType: 'CONTAINER',
              type: undefined,
            },
          },
          order: { [BASE_CONTAINER_ID]: [navButtonsId] },
          customRootProperties: {},
          customDataProperties: {},
        },
      };
      const updatedLayouts = await addOrRemoveNavigationButtons(layouts, callback);
      const layout1Components = Object.values(updatedLayouts[layoutId].components);
      expect(layout1Components.length).toBe(0);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(layoutId, updatedLayouts[layoutId]);
    });
  });

  describe('convertExternalLayoutsToInternalFormat', () => {
    it('Converts external layouts to internal format', () => {
      const convertedLayouts = convertExternalLayoutsToInternalFormat(externalLayoutsMock);
      expect(convertedLayouts).toEqual({
        [layout1NameMock]: expect.any(Object),
        [layout2NameMock]: expect.any(Object),
      });
    });
  });

  describe('firstAvailableLayout', () => {
    it('Chooses next layout in list when one exists', () => {
      const layout1Id = 'layout1';
      const layout2Id = 'layout2';
      const layoutOrder = [layout1Id, layout2Id];
      const layout = firstAvailableLayout(layout1Id, layoutOrder);
      expect(layout).toBe(layout2Id);
    });

    it('Chooses previous layout in list when one exists and next layout does not exist', () => {
      const layout1Id = 'layout1';
      const layout2Id = 'layout2';
      const layoutOrder = [layout1Id, layout2Id];
      const layout = firstAvailableLayout(layout2Id, layoutOrder);
      expect(layout).toBe(layout1Id);
    });

    it('Returns default layout name when no other layouts exist', () => {
      const layout1Id = 'layout1';
      const layoutOrder = [layout1Id];
      const layout = firstAvailableLayout(layout1Id, layoutOrder);
      expect(layout).toBe(DEFAULT_SELECTED_LAYOUT_NAME);
    });
  });

  describe('idExists', () => {
    const layoutId = 'layout1';
    const layoutId2 = 'layout2';
    const navButtonsId = 'navButtons';
    const groupId = 'group1';
    const groupComponent = componentMocks[ComponentType.Group];

    const formLayouts: IFormLayouts = {
      [layoutId]: {
        components: { [navButtonsId]: componentMocks[ComponentType.NavigationButtons] },
        containers: undefined,
        order: { [BASE_CONTAINER_ID]: [navButtonsId] },
        customRootProperties: {},
        customDataProperties: {},
      },
      [layoutId2]: {
        components: undefined,
        containers: {
          [groupId]: groupComponent,
        },
        order: { [BASE_CONTAINER_ID]: [groupId] },
        customRootProperties: {},
        customDataProperties: {},
      },
    };

    it('returns true when a container has the same id', () => {
      const exists = idExists(groupId, formLayouts);
      expect(exists).toBe(true);
    });

    it('returns true if when a component has the same id', () => {
      const exists = idExists(navButtonsId, formLayouts);
      expect(exists).toBe(true);
    });

    it('Returns false if id does not exist in any of the layouts', () => {
      const exists = idExists('unique', formLayouts);
      expect(exists).toBe(false);
    });
  });
});
