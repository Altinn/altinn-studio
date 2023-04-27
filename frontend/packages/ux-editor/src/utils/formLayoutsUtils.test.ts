import { IFormButtonComponent, IFormLayouts } from '../types/global';
import { addOrRemoveNavigationButtons, convertExternalLayoutsToInternalFormat } from './formLayoutsUtils';
import { ComponentType } from '../components';
import { createEmptyLayout } from './formLayoutUtils';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { externalLayoutsMock, layout1NameMock, layout2NameMock } from '../testing/mocks';

describe('formLayoutsUtils', () => {
  describe('addOrRemoveNavigationButtons', () => {
    it('Adds navigation buttons to all layouts if there are multiple layouts', async () => {
      const layout1id = 'layout1';
      const layout2id = 'layout2';
      const callback = jest.fn();
      const layouts: IFormLayouts = {
        [layout1id]: createEmptyLayout(),
        [layout2id]: createEmptyLayout()
      };
      const updatedLayouts = await addOrRemoveNavigationButtons(layouts, callback, layout1id);
      const layout1Components = Object.values(updatedLayouts[layout1id].components);
      const layout2Components = Object.values(updatedLayouts[layout2id].components);
      expect(layout1Components.length).toBe(1);
      expect(layout1Components[0].type).toBe(ComponentType.NavigationButtons);
      expect(layout2Components.length).toBe(1);
      expect(layout2Components[0].type).toBe(ComponentType.NavigationButtons);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(layout1id, updatedLayouts[layout1id]);
      expect(callback).toHaveBeenCalledWith(layout2id, updatedLayouts[layout2id]);
    });

    it('Removes navigation buttons from all layouts if there is only one layout', async () => {
      const layoutId = 'layout1';
      const callback = jest.fn();
      const navButtonsId = 'navButtons';
      const navButtonsComponent: IFormButtonComponent = {
        id: navButtonsId,
        itemType: 'COMPONENT',
        onClickAction: jest.fn(),
        type: ComponentType.NavigationButtons,
      };
      const layouts: IFormLayouts = {
        [layoutId]: {
          components: { [navButtonsId]: navButtonsComponent },
          containers: { [BASE_CONTAINER_ID]: { itemType: 'CONTAINER' } },
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
      const { convertedLayouts, invalidLayouts } = convertExternalLayoutsToInternalFormat(externalLayoutsMock);
      expect(convertedLayouts).toEqual({
        [layout1NameMock]: expect.any(Object),
        [layout2NameMock]: expect.any(Object),
      });
      expect(invalidLayouts).toEqual([]);
    });
  });
});
