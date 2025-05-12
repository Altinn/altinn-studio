import React from 'react';
import { Properties } from './Properties';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { formItemContextProviderMock } from '../../../testing/formItemContextMocks';
import { renderWithProviders } from '../../../testing/mocks';
import { componentMocks } from '../../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import {
  layoutSet1NameMock,
  layoutSetsExtendedMock,
} from '@altinn/ux-editor/testing/layoutSetsMock';
import { layout1NameMock, layoutMock } from '@altinn/ux-editor/testing/layoutMock';
import type { IFormLayouts } from '@altinn/ux-editor/types/global';
import { componentSchemaMocks } from '../../../testing/componentSchemaMocks';
import { FormItemContext } from '../../../containers/FormDesigner/FormItemContext';

// Test data:
const pageConfigPanelTestId = 'pageConfigPanel';
const textTestId = 'text';
const DataModelBindingsTestId = 'dataModelBindings';
const editFormComponentTestId = 'content';
const expressionsTestId = 'expressions';

const layoutSetName = layoutSet1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

// Mocks:
jest.mock('../config/EditFormComponent', () => ({
  __esModule: true,
  ...jest.requireActual('../config/EditFormComponent'),
}));
const editFormComponentSpy = jest.spyOn(
  require('../config/EditFormComponent'),
  'EditFormComponent',
);

jest.mock('./PageConfigPanel', () => ({
  PageConfigPanel: () => <div data-testid={pageConfigPanelTestId} />,
}));
jest.mock('./Text', () => ({
  Text: () => <div data-testid={textTestId} />,
}));
jest.mock('./DataModelBindings', () => ({
  DataModelBindings: () => <div data-testid={DataModelBindingsTestId} />,
}));
jest.mock('../config/Expressions', () => ({
  Expressions: () => <div data-testid={expressionsTestId} />,
}));

describe('Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Page config', () => {
    it('shows page config when formItem is undefined', () => {
      renderProperties({ formItem: undefined });
      const pageConfigPanel = screen.getByTestId(pageConfigPanelTestId);
      expect(pageConfigPanel).toBeInTheDocument();
    });
  });
  describe('Component ID Config', () => {
    it('saves the component when changes are made in the component', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.content') });
      await user.click(button);
      const readOnly = screen.getByText(textMock('ux_editor.component_properties.readOnly'));
      await user.click(readOnly);
      expect(formItemContextProviderMock.handleUpdate).toHaveBeenCalledTimes(1);
      expect(formItemContextProviderMock.debounceSave).toHaveBeenCalledTimes(1);
    });

    it('saves the component when changes are made in the properties header', async () => {
      const user = userEvent.setup();
      renderProperties();
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
      renderProperties();
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
      const { rerender } = renderProperties();
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

  describe('Summary', () => {
    it('should toggle summary overrides when clicked', async () => {
      const user = userEvent.setup();
      renderProperties({
        formItem: componentMocks[ComponentType.Summary2],
        formItemId: componentMocks[ComponentType.Summary2].id,
      });
      const button = screen.queryByRole('button', {
        name: textMock('ux_editor.component_properties.summary.override.title'),
      });
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should not render summary overrides accordion when formItem is not a Summary2 component', () => {
      renderProperties();
      const button = screen.queryByRole('button', {
        name: textMock('ux_editor.component_properties.summary.override.title'),
      });
      expect(button).not.toBeInTheDocument();
    });
  });

  describe('Text', () => {
    it('Toggles text when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.text') });
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Sets accordion title to include images when component is image', async () => {
      renderProperties({ formItem: componentMocks[ComponentType.Image] });
      const accordionTitle = screen.queryByRole('button', {
        name: textMock('right_menu.text_and_image'),
      });
      expect(accordionTitle).toBeInTheDocument();
    });
  });

  describe('DataModelBindings', () => {
    it('Toggles dataModelBindings when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', {
        name: textMock('right_menu.data_model_bindings'),
      });
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Content', () => {
    it('Closes content on load', () => {
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.content') });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles content when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.content') });
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Dynamics', () => {
    it('Closes dynamics on load', () => {
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.dynamics') });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles dynamics when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.dynamics') });
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Shows new dynamics by default', async () => {
      renderProperties();
      const newDynamics = screen.getByTestId(expressionsTestId);
      expect(newDynamics).toBeInTheDocument();
    });
  });

  describe('Calculations', () => {
    it('Closes calculations on load', () => {
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.calculations') });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles calculations when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.calculations') });
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('Renders properties accordions when formItem is selected', () => {
    editFormComponentSpy.mockReturnValue(<input data-testid={editFormComponentTestId}></input>);
    renderProperties();
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
    renderProperties();
    expect(screen.getByText(textMock('right_menu.text'))).toBeInTheDocument();
    expect(screen.getByText(textMock('right_menu.data_model_bindings'))).toBeInTheDocument();
    expect(screen.getByText(textMock('right_menu.content'))).toBeInTheDocument();
    expect(screen.getByText(textMock('right_menu.dynamics'))).toBeInTheDocument();
    expect(screen.getByText(textMock('right_menu.calculations'))).toBeInTheDocument();
  });

  it('render properties accordions for a subform component when it is linked to a subform layoutSet', () => {
    editFormComponentSpy.mockReturnValue(<input data-testid={editFormComponentTestId}></input>);
    renderProperties({
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
    <Properties />
  </FormItemContext.Provider>
);

const renderProperties = (
  formItemContextProps: Partial<FormItemContext> = {
    formItem: componentMocks[ComponentType.Input],
    formItemId: componentMocks[ComponentType.Input].id,
  },
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
  });
};
