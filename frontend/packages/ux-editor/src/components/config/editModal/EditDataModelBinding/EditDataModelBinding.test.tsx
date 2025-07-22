import React from 'react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { EditDataModelBinding, type EditDataModelBindingProps } from './EditDataModelBinding';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock } from '../../../../testing/layoutSetsMock';

const defaultEditDataModelingBinding: EditDataModelBindingProps<any> = {
  component: componentMocks[ComponentType.Input],
  handleComponentChange: jest.fn(),
  renderOptions: {
    label: undefined,
    returnValue: 'returnValue',
    key: 'key',
  },
};

type renderEditDataModelBinding = {
  props?: EditDataModelBindingProps<any>;
  queryClient?: ReturnType<typeof createQueryClientMock>;
  queries?: Partial<ServicesContextProps>;
};

const defaultDataModel = 'defaultDataModel';
const secondDataModel = 'secondDataModel';

const renderEditDataModelBinding = ({
  props = defaultEditDataModelingBinding,
  queryClient = createQueryClientMock(),
  queries,
}: renderEditDataModelBinding) => {
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], {
    sets: [{ id: layoutSet1NameMock, dataType: defaultDataModel }],
  });
  queryClient.setQueryData([QueryKey.AppMetadata, org, app], {
    dataTypes: [
      { id: defaultDataModel, maxCount: 1, appLogic: {} },
      { id: secondDataModel, maxCount: 1, appLogic: {} },
    ],
  });
  return {
    ...renderWithProviders(<EditDataModelBinding {...props} />, {
      queries: { ...queries },
      queryClient,
    }),
  };
};

describe('EditDataModelBinding', () => {
  const navigateAndVerifyEditBinding = async (user: UserEvent, label: string) => {
    const bindingButton = screen.getByRole('button', { name: label });
    expect(bindingButton).toBeInTheDocument();

    await user.click(bindingButton);
    expect(bindingButton).not.toBeInTheDocument();

    const dataModelFieldSelector = screen.getByRole('combobox', {
      name: textMock('ux_editor.modal_properties_data_model_field_binding'),
    });

    expect(dataModelFieldSelector).toBeInTheDocument();
  };

  it('should render undefinedBinding component initially', () => {
    const label = 'kort svar';

    renderEditDataModelBinding({
      props: {
        ...defaultEditDataModelingBinding,
        renderOptions: {
          label,
        },
      },
    });
    const labelSpecificText = textMock(`ux_editor.modal_properties_data_model_label.${label}`);
    const labelText = textMock('ux_editor.modal_properties_data_model_field_choose_for', {
      componentName: labelSpecificText,
    });

    const undefinedButton = screen.getByRole('button', { name: labelText });
    expect(undefinedButton).toBeInTheDocument();
  });

  it('should render type as label if no label is provided', () => {
    renderEditDataModelBinding({});
    const type = textMock(`ux_editor.component_title.${ComponentType.Input}`);
    const labelText = textMock('ux_editor.modal_properties_data_model_field_choose_for', {
      componentName: type,
    });

    const button = screen.getByRole('button', { name: labelText });
    expect(button).toBeInTheDocument();
  });

  it('should render EditBinding when undefinedBinding is clicked', async () => {
    const user = userEvent.setup();
    renderEditDataModelBinding({});

    const type = textMock(`ux_editor.component_title.${ComponentType.Input}`);
    const labelText = textMock('ux_editor.modal_properties_data_model_field_choose_for', {
      componentName: type,
    });

    await navigateAndVerifyEditBinding(user, labelText);
  });

  it('should close EditBinding when click on close button', async () => {
    const user = userEvent.setup();
    renderEditDataModelBinding({});

    const type = textMock(`ux_editor.component_title.${ComponentType.Input}`);
    const labelText = textMock('ux_editor.modal_properties_data_model_field_choose_for', {
      componentName: type,
    });

    await navigateAndVerifyEditBinding(user, labelText);

    const closeButton = screen.getByRole('button', {
      name: textMock('right_menu.data_model_bindings_cancel_button'),
    });
    expect(closeButton).toBeInTheDocument();

    await user.click(closeButton);

    const undefinedButton = screen.getByRole('button', { name: labelText });
    expect(undefinedButton).toBeInTheDocument();
  });

  it('should render DefinedBinding when binding is defined', async () => {
    const label = 'kort svar';
    const labelSpecificText = textMock(`ux_editor.modal_properties_data_model_label.${label}`);
    const binding = 'field1';
    renderEditDataModelBinding({
      props: {
        ...defaultEditDataModelingBinding,
        component: {
          ...componentMocks[ComponentType.Input],
          dataModelBindings: {
            simpleBinding: binding,
          },
        },
        renderOptions: {
          label,
        },
      },
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const definedButton = screen.getByRole('button', {
      name: textMock('right_menu.data_model_bindings_edit', { binding: labelSpecificText }),
    });
    expect(definedButton).toBeInTheDocument();
  });

  it('should remove binding when click on delete button in EditBinding', async () => {
    window.confirm = jest.fn(() => true);
    const handleComponentChange = jest.fn();
    const label = 'kort svar';
    const binding = 'field1';
    const user = userEvent.setup();
    const labelSpecificText = textMock(`ux_editor.modal_properties_data_model_label.${label}`);
    const definedButtonText = textMock('right_menu.data_model_bindings_edit', {
      binding: labelSpecificText,
    });
    renderEditDataModelBinding({
      props: {
        ...defaultEditDataModelingBinding,
        component: {
          ...componentMocks[ComponentType.Input],
          dataModelBindings: {
            simpleBinding: binding,
          },
        },
        renderOptions: {
          label,
        },
        handleComponentChange,
      },
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const definedButton = screen.getByRole('button', { name: definedButtonText });

    expect(definedButton).toBeInTheDocument();

    await navigateAndVerifyEditBinding(user, definedButtonText);

    const deleteButton = screen.getByRole('button', {
      name: textMock('right_menu.data_model_bindings_delete_button'),
    });
    await user.click(deleteButton);
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dataModelBindings: {
          simpleBinding: '',
        },
      }),
      expect.anything(),
    );
  });
});
