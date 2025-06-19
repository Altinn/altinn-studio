import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { formItemContextProviderMock } from '../../../testing/formItemContextMocks';
import { ComponentConfigPanel } from './ComponentConfigPanel';
import { FormItemContext } from '../../../containers/FormItemContext';
import { componentMocks } from '../../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { layout1NameMock, layoutMock } from '../../../testing/layoutMock';
import type { IFormLayouts } from '../../../types/global';
import { layoutSet1NameMock, layoutSetsExtendedMock } from '../../../testing/layoutSetsMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { componentSchemaMocks } from '@altinn/ux-editor/testing/componentSchemaMocks';
import { org, app } from '@studio/testing/testids';
import { renderWithProviders } from '../../../testing/mocks';
import type { AppContextProps } from '../../../AppContext';
import { ItemType } from '../ItemType';

const editFormComponentTestId = 'content';
const textTestId = 'text';
const DataModelBindingsTestId = 'dataModelBindings';

// Mocks:
jest.mock('../../config/EditFormComponent', () => ({
  __esModule: true,
  ...jest.requireActual('../../config/EditFormComponent'),
}));
jest.mock('../../config/Expressions', () => ({
  Expressions: () => <div data-testid={expressionsTestId} />,
}));

const layoutSetName = layoutSet1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

jest.mock('../Text', () => ({
  Text: () => <div data-testid={textTestId} />,
}));
jest.mock('../DataModelBindings', () => ({
  DataModelBindings: () => <div data-testid={DataModelBindingsTestId} />,
}));

const editFormComponentSpy = jest.spyOn(
  require('../../config/EditFormComponent'),
  'EditFormComponent',
);

const expressionsTestId = 'expressions';

const expectToggleAccordion = async (name: string, user: UserEvent) => {
  const button = screen.getByRole('button', { name });
  await user.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'true');
  await user.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'false');
};

describe('ComponentConfigPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render an unknown component alert when the component is unknown', () => {
    const unknownComponentType = 'UnknownComponent';
    renderComponentConfig({ formItem: unknownComponentType } as any);

    const alert = screen.getByText(textMock('ux_editor.edit_component.unknown_component', {}));

    expect(alert).toBeInTheDocument();
  });

  describe('Component ID Config', () => {
    it('saves the component when changes are made in the component', async () => {
      const user = userEvent.setup();
      renderComponentConfig();
      const button = screen.queryByRole('button', { name: textMock('right_menu.content') });
      await user.click(button);
      const readOnly = screen.getByText(textMock('ux_editor.component_properties.readOnly'));
      await user.click(readOnly);
      expect(formItemContextProviderMock.handleUpdate).toHaveBeenCalledTimes(1);
      expect(formItemContextProviderMock.debounceSave).toHaveBeenCalledTimes(1);
    });

    it('saves the component when changes are made in the properties header', async () => {
      const user = userEvent.setup();
      renderComponentConfig();
      const heading = screen.getByRole('heading', {
        name: textMock('ux_editor.component_title.Input'),
        level: 2,
      });
      expect(heading).toBeInTheDocument();
      const editComponentIdButton = screen.getByRole('button', {
        name: textMock('ux_editor.modal_properties_component_change_id'),
      });
      expect(editComponentIdButton).toBeInTheDocument();
      await user.click(editComponentIdButton);
      const textbox = screen.getByRole('textbox', {
        name: textMock('ux_editor.modal_properties_component_change_id'),
      });
      const validId = 'valid-id';
      await user.type(textbox, validId);
      await user.click(document.body);
      expect(formItemContextProviderMock.handleUpdate).toHaveBeenCalledTimes(1);
      expect(formItemContextProviderMock.debounceSave).toHaveBeenCalledTimes(1);
    });

    it('should not invoke handleUpdate when the id is invalid', async () => {
      const user = userEvent.setup();
      renderComponentConfig();
      await user.click(
        screen.getByRole('button', {
          name: textMock('ux_editor.modal_properties_component_change_id'),
        }),
      );

      const invalidId = 'invalidId-01';
      await user.type(
        screen.getByLabelText(textMock('ux_editor.modal_properties_component_change_id')),
        invalidId,
      );

      expect(formItemContextProviderMock.handleUpdate).not.toHaveBeenCalled();
    });

    it('has all accordion items closed by default', async () => {
      const { rerender } = renderComponentConfig();
      rerender(getComponent());
      const textAccordion = screen.getByRole('button', { name: textMock('right_menu.text') });
      expect(textAccordion).toHaveAttribute('aria-expanded', 'false');
      const dataModelBindingsAccordion = screen.getByRole('button', {
        name: textMock('right_menu.data_model_bindings'),
      });
      expect(dataModelBindingsAccordion).toHaveAttribute('aria-expanded', 'false');
      const contentAccordion = screen.getByRole('button', { name: textMock('right_menu.content') });
      expect(contentAccordion).toHaveAttribute('aria-expanded', 'false');
      const dynamicsAccordion = screen.getByRole('button', {
        name: textMock('right_menu.dynamics'),
      });
      expect(dynamicsAccordion).toHaveAttribute('aria-expanded', 'false');
      const calculationsAccordion = screen.getByRole('button', {
        name: textMock('right_menu.calculations'),
      });
      expect(calculationsAccordion).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Component cleanup and conditional rendering', () => {
    it('should return null when formItem is undefined', () => {
      renderComponentConfig({
        formItem: undefined,
        formItemId: undefined,
      });
      expect(screen.queryByTestId('component-config-panel')).not.toBeInTheDocument();
    });

    it('should call setSelectedItem(undefined) when formItem becomes undefined', () => {
      const mockSetSelectedItem = jest.fn();
      renderComponentConfig(
        {
          formItem: undefined,
          formItemId: undefined,
        },
        { setSelectedItem: mockSetSelectedItem },
      );
      expect(mockSetSelectedItem).toHaveBeenCalledWith(undefined);
    });

    it('should not call setSelectedItem when formItem changes but stays defined', () => {
      const mockSetSelectedItem = jest.fn();
      renderComponentConfig(
        {
          formItem: componentMocks[ComponentType.Input],
          formItemId: componentMocks[ComponentType.Input].id,
        },
        { setSelectedItem: mockSetSelectedItem },
      );
      expect(mockSetSelectedItem).not.toHaveBeenCalled();
    });
  });

  describe('Summary', () => {
    it('should toggle summary overrides when clicked', async () => {
      const user = userEvent.setup();
      const name = textMock('ux_editor.component_properties.summary.override.title');
      renderComponentConfig({
        formItem: componentMocks[ComponentType.Summary2],
        formItemId: componentMocks[ComponentType.Summary2].id,
      });
      await expectToggleAccordion(name, user);
    });

    it('should not render summary overrides accordion when formItem is not a Summary2 component', () => {
      renderComponentConfig();
      const button = screen.queryByRole('button', {
        name: textMock('ux_editor.component_properties.summary.override.title'),
      });
      expect(button).not.toBeInTheDocument();
    });
  });

  describe('Text', () => {
    it('Toggles text when clicked', async () => {
      const user = userEvent.setup();
      const name = textMock('right_menu.text');
      renderComponentConfig();
      await expectToggleAccordion(name, user);
    });

    it('Sets accordion title to include images when component is image', async () => {
      renderComponentConfig({ formItem: componentMocks[ComponentType.Image] });
      const accordionTitle = screen.queryByRole('button', {
        name: textMock('right_menu.text_and_image'),
      });
      expect(accordionTitle).toBeInTheDocument();
    });
  });

  describe('DataModelBindings', () => {
    it('Toggles dataModelBindings when clicked', async () => {
      const user = userEvent.setup();
      const name = textMock('right_menu.data_model_bindings');
      renderComponentConfig();
      await expectToggleAccordion(name, user);
    });
  });

  describe('Content', () => {
    it('Closes content on load', () => {
      renderComponentConfig();
      const button = screen.queryByRole('button', { name: textMock('right_menu.content') });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles content when clicked', async () => {
      const user = userEvent.setup();
      const name = textMock('right_menu.content');
      renderComponentConfig();
      await expectToggleAccordion(name, user);
    });
  });

  describe('Dynamics', () => {
    it('Closes dynamics on load', () => {
      renderComponentConfig();
      const button = screen.queryByRole('button', { name: textMock('right_menu.dynamics') });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles dynamics when clicked', async () => {
      const user = userEvent.setup();
      const name = textMock('right_menu.dynamics');
      renderComponentConfig();
      await expectToggleAccordion(name, user);
    });

    it('Shows new dynamics by default', async () => {
      renderComponentConfig();
      const newDynamics = screen.getByTestId(expressionsTestId);
      expect(newDynamics).toBeInTheDocument();
    });
  });

  describe('Calculations', () => {
    it('Closes calculations on load', () => {
      renderComponentConfig();
      const button = screen.queryByRole('button', { name: textMock('right_menu.calculations') });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles calculations when clicked', async () => {
      const user = userEvent.setup();
      const name = textMock('right_menu.calculations');
      renderComponentConfig();
      await expectToggleAccordion(name, user);
    });
  });

  describe('formItem is selected', () => {
    it('Renders properties accordions when formItem is selected', () => {
      editFormComponentSpy.mockReturnValue(<input data-testid={editFormComponentTestId}></input>);
      renderComponentConfig();
      expect(screen.getByText(textMock('right_menu.text'))).toBeInTheDocument();
      expect(screen.getByText(textMock('right_menu.data_model_bindings'))).toBeInTheDocument();
      expect(screen.getByText(textMock('right_menu.content'))).toBeInTheDocument();
      expect(screen.getByText(textMock('right_menu.dynamics'))).toBeInTheDocument();
      expect(screen.getByText(textMock('right_menu.calculations'))).toBeInTheDocument();
      expect(screen.getByTestId(textTestId)).toBeInTheDocument();
      expect(screen.getByTestId(DataModelBindingsTestId)).toBeInTheDocument();
      expect(screen.getByTestId(editFormComponentTestId)).toBeInTheDocument();
      expect(screen.getByTestId(expressionsTestId)).toBeInTheDocument();
      expect(
        screen.getByText(textMock('right_menu.rules_calculations_deprecated_info_title')),
      ).toBeInTheDocument();
    });

    it('renders properties when formItem is not a Subform component', () => {
      renderComponentConfig();
      expect(screen.getByText(textMock('right_menu.text'))).toBeInTheDocument();
      expect(screen.getByText(textMock('right_menu.data_model_bindings'))).toBeInTheDocument();
      expect(screen.getByText(textMock('right_menu.content'))).toBeInTheDocument();
      expect(screen.getByText(textMock('right_menu.dynamics'))).toBeInTheDocument();
      expect(screen.getByText(textMock('right_menu.calculations'))).toBeInTheDocument();
    });

    it('render properties accordions for a subform component when it is linked to a subform layoutSet', () => {
      editFormComponentSpy.mockReturnValue(<input data-testid={editFormComponentTestId}></input>);
      renderComponentConfig({
        formItem: { ...componentMocks[ComponentType.Subform], layoutSet: layoutSetName },
        formItemId: componentMocks[ComponentType.Subform].id,
      });
      expect(screen.getByText(textMock('right_menu.text'))).toBeInTheDocument();
      expect(screen.getByText(textMock('right_menu.data_model_bindings'))).toBeInTheDocument();
      expect(screen.getByText(textMock('right_menu.content'))).toBeInTheDocument();
      expect(screen.getByText(textMock('right_menu.dynamics'))).toBeInTheDocument();
      expect(screen.getByText(textMock('right_menu.calculations'))).toBeInTheDocument();
    });
  });
});

const getComponent = (
  formItemContextProps: Partial<FormItemContext> = {
    formItem: componentMocks[ComponentType.Input],
    formItemId: componentMocks[ComponentType.Input].id,
  },
) => (
  <FormItemContext.Provider
    value={{
      ...formItemContextProviderMock,
      ...formItemContextProps,
    }}
  >
    <ComponentConfigPanel
      selectedItem={{ type: ItemType.Component, id: componentMocks[ComponentType.Input].id }}
    />
  </FormItemContext.Provider>
);

const renderComponentConfig = (
  formItemContextProps: Partial<FormItemContext> = {
    formItem: componentMocks[ComponentType.Input],
    formItemId: componentMocks[ComponentType.Input].id,
  },
  appContextProps: Partial<AppContextProps> = {},
) => {
  const queryClientMock = createQueryClientMock();

  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  queryClientMock.setQueryData([QueryKey.LayoutSets, org, app], layoutSet1NameMock);
  queryClientMock.setQueryData(
    [QueryKey.FormComponent, formItemContextProps.formItem?.type],
    componentSchemaMocks[formItemContextProps.formItem?.type],
  );
  queryClientMock.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtendedMock);

  return renderWithProviders(getComponent(formItemContextProps), {
    queryClient: queryClientMock,
    appContextProps,
  });
};
