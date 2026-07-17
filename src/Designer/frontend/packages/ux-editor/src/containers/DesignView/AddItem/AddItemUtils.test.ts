import { getComponentSelection } from './AddItemUtils';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import {
  allComponents,
  confOnScreenComponents,
  defaultComponents,
  formItemConfigs,
} from '../../../data/formItemConfig';
import type { IInternalLayout, IToolbarElement } from '../../../types/global';
import type { FormContainer } from '../../../types/FormContainer';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { customDataPropertiesMock, customRootPropertiesMock } from '../../../testing/layoutMock';

const buttonGroupId = 'button-group';

const createContainer = (id: string, type: ComponentType): FormContainer =>
  ({ id, itemType: 'CONTAINER', type }) as FormContainer;

const layout: IInternalLayout = {
  components: {},
  containers: {
    [BASE_CONTAINER_ID]: createContainer(BASE_CONTAINER_ID, ComponentType.Group),
    [buttonGroupId]: createContainer(buttonGroupId, ComponentType.ButtonGroup),
  },
  order: {
    [BASE_CONTAINER_ID]: [],
    [buttonGroupId]: [],
  },
  customRootProperties: customRootPropertiesMock,
  customDataProperties: customDataPropertiesMock,
};

const typesOf = (components: IToolbarElement[]) => components.map((component) => component.type);
const availableTypes = (available: KeyValuePairs<IToolbarElement[]>) =>
  typesOf(Object.values(available).flat());

describe('AddItemUtils', () => {
  describe('getComponentSelection', () => {
    describe('without a configuration mode', () => {
      it('returns the default components as the quick-add list for the base container', () => {
        const { quickAddComponents } = getComponentSelection(layout, BASE_CONTAINER_ID);
        expect(typesOf(quickAddComponents)).toEqual(defaultComponents);
      });

      it('returns all component categories as available for the base container', () => {
        const { availableComponents } = getComponentSelection(layout, BASE_CONTAINER_ID);
        expect(Object.keys(availableComponents)).toEqual(Object.keys(allComponents));
      });

      it('shows the show all button when more components are available than shown', () => {
        const { shouldShowAllComponentsButton } = getComponentSelection(layout, BASE_CONTAINER_ID);
        expect(shouldShowAllComponentsButton).toBe(true);
      });

      it('limits both lists to the container valid child types', () => {
        const { quickAddComponents, availableComponents } = getComponentSelection(
          layout,
          buttonGroupId,
        );
        expect(typesOf(quickAddComponents)).toEqual(
          formItemConfigs[ComponentType.ButtonGroup].validChildTypes,
        );
        expect(Object.keys(availableComponents)).toEqual(['button']);
      });
    });

    describe('with a configuration mode', () => {
      it('limits the components to the allowed set and hides the show all button for receipt', () => {
        const { quickAddComponents, shouldShowAllComponentsButton } = getComponentSelection(
          layout,
          BASE_CONTAINER_ID,
          'receipt',
        );
        expect(typesOf(quickAddComponents).sort()).toEqual(
          confOnScreenComponents.map((component) => component.name).sort(),
        );
        expect(shouldShowAllComponentsButton).toBe(false);
      });

      it('includes the payment component in the quick-add list for payment', () => {
        const { quickAddComponents } = getComponentSelection(layout, BASE_CONTAINER_ID, 'payment');
        expect(typesOf(quickAddComponents)).toContain(ComponentType.Payment);
      });

      it('caps the quick-add list at the default components amount and shows the show all button for subform', () => {
        const { quickAddComponents, shouldShowAllComponentsButton } = getComponentSelection(
          layout,
          BASE_CONTAINER_ID,
          'subform',
        );
        expect(quickAddComponents.length).toEqual(defaultComponents.length);
        expect(shouldShowAllComponentsButton).toBe(true);
      });

      it('includes allowed components outside the standard taxonomy in the available list', () => {
        const { availableComponents } = getComponentSelection(layout, BASE_CONTAINER_ID, 'subform');
        expect(availableTypes(availableComponents)).toContain(
          CustomComponentType.CloseSubformButton,
        );
      });
    });
  });
});
