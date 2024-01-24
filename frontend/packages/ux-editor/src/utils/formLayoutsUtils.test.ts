import type { IFormLayouts } from '../types/global';
import {
  addOrRemoveNavigationButtons,
  convertExternalLayoutsToInternalFormat,
  firstAvailableLayout,
} from './formLayoutsUtils';
import { ComponentType } from 'app-shared/types/ComponentType';
import { createEmptyLayout } from './formLayoutUtils';
import { BASE_CONTAINER_ID, DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { externalLayoutsMock, layout1NameMock, layout2NameMock } from '../testing/layoutMock';
import type { FormButtonComponent } from '../types/FormComponent';

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

    it('Does not add navigation buttons to all layouts if there are two layouts when one of them is the receipt layout', async () => {
      const layoutId = 'layout1';
      const layoutReceiptId = 'receipt';
      const callback = jest.fn();
      const layouts: IFormLayouts = {
        [layoutId]: createEmptyLayout(),
        [layoutReceiptId]: createEmptyLayout(),
      };
      const updatedLayouts = await addOrRemoveNavigationButtons(
        layouts,
        callback,
        null,
        layoutReceiptId,
      );

      const layoutComponents = Object.values(updatedLayouts[layoutId].components);
      const layoutReceiptComponents = Object.values(updatedLayouts[layoutReceiptId].components);
      expect(layoutComponents.length).toBe(0);
      expect(layoutReceiptComponents.length).toBe(0);
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('Removes navigation button on regular layout if there are two layouts when one of them is the receipt layout', async () => {
      const layoutId = 'layout1';
      const layoutReceiptId = 'receipt';
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
          containers: { [BASE_CONTAINER_ID]: { id: BASE_CONTAINER_ID, itemType: 'CONTAINER' } },
          order: { [BASE_CONTAINER_ID]: [navButtonsId] },
          customRootProperties: {},
          customDataProperties: {},
        },
        [layoutReceiptId]: createEmptyLayout(),
      };
      const updatedLayouts = await addOrRemoveNavigationButtons(
        layouts,
        callback,
        null,
        layoutReceiptId,
      );

      const layoutComponents = Object.values(updatedLayouts[layoutId].components);
      const layoutReceiptComponents = Object.values(updatedLayouts[layoutReceiptId].components);
      expect(layoutComponents.length).toBe(0);
      expect(layoutReceiptComponents.length).toBe(0);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('Ignores receipt layout when adding navigation buttons to all layouts if there are multiple layouts', async () => {
      const layout1id = 'layout1';
      const layout2id = 'layout2';
      const layoutReceiptId = 'receipt';
      const callback = jest.fn();
      const layouts: IFormLayouts = {
        [layout1id]: createEmptyLayout(),
        [layout2id]: createEmptyLayout(),
        [layoutReceiptId]: createEmptyLayout(),
      };
      const updatedLayouts = await addOrRemoveNavigationButtons(
        layouts,
        callback,
        layout1id,
        layoutReceiptId,
      );
      const layout1Components = Object.values(updatedLayouts[layout1id].components);
      const layout2Components = Object.values(updatedLayouts[layout2id].components);
      const layoutReceiptComponents = Object.values(updatedLayouts[layoutReceiptId].components);
      expect(layout1Components.length).toBe(1);
      expect(layout1Components[0].type).toBe(ComponentType.NavigationButtons);
      expect(layout2Components.length).toBe(1);
      expect(layout2Components[0].type).toBe(ComponentType.NavigationButtons);
      expect(layoutReceiptComponents.length).toBe(0);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(layout1id, updatedLayouts[layout1id]);
      expect(callback).toHaveBeenCalledWith(layout2id, updatedLayouts[layout2id]);
    });

    it('Removes navigation buttons from all layouts if there is only one layout', async () => {
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
          containers: { [BASE_CONTAINER_ID]: { id: BASE_CONTAINER_ID, itemType: 'CONTAINER' } },
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

    it('Removes navigation buttons from layout if there is only one layout AND a receipt layout', async () => {
      const layoutId = 'layout1';
      const layoutReceiptId = 'receipt';
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
          containers: { [BASE_CONTAINER_ID]: { id: BASE_CONTAINER_ID, itemType: 'CONTAINER' } },
          order: { [BASE_CONTAINER_ID]: [navButtonsId] },
          customRootProperties: {},
          customDataProperties: {},
        },
        [layoutReceiptId]: createEmptyLayout(),
      };
      const updatedLayouts = await addOrRemoveNavigationButtons(
        layouts,
        callback,
        null,
        layoutReceiptId,
      );
      const layout1Components = Object.values(updatedLayouts[layoutId].components);
      expect(layout1Components.length).toBe(0);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(layoutId, updatedLayouts[layoutId]);
    });

    it('Does not add navigation buttons to layout if additional layout is receipt', async () => {
      const layoutId = 'layout1';
      const layoutReceiptId = 'receipt';
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
          containers: { [BASE_CONTAINER_ID]: { id: BASE_CONTAINER_ID, itemType: 'CONTAINER' } },
          order: { [BASE_CONTAINER_ID]: [navButtonsId] },
          customRootProperties: {},
          customDataProperties: {},
        },
        [layoutReceiptId]: createEmptyLayout(),
      };
      const updatedLayouts = await addOrRemoveNavigationButtons(
        layouts,
        callback,
        null,
        layoutReceiptId,
      );
      const layout1Components = Object.values(updatedLayouts[layoutId].components);
      const layoutReceiptComponents = Object.values(updatedLayouts[layoutReceiptId].components);
      expect(layout1Components.length).toBe(0);
      expect(layoutReceiptComponents.length).toBe(0);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(layoutId, updatedLayouts[layoutId]);
    });

    it('Does callback on layout if current layout is receipt and there is only one layout from before', async () => {
      const layoutId = 'layout1';
      const layoutReceiptId = 'receipt';
      const callback = jest.fn();
      const layouts: IFormLayouts = {
        [layoutId]: createEmptyLayout(),
        [layoutReceiptId]: createEmptyLayout(),
      };
      const updatedLayouts = await addOrRemoveNavigationButtons(
        layouts,
        callback,
        layoutReceiptId,
        layoutReceiptId,
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(layoutReceiptId, updatedLayouts[layoutReceiptId]);
    });
  });

  describe('convertExternalLayoutsToInternalFormat', () => {
    it('Converts external layouts to internal format', () => {
      const { convertedLayouts, invalidLayouts } =
        convertExternalLayoutsToInternalFormat(externalLayoutsMock);
      expect(convertedLayouts).toEqual({
        [layout1NameMock]: expect.any(Object),
        [layout2NameMock]: expect.any(Object),
      });
      expect(invalidLayouts).toEqual([]);
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
});
