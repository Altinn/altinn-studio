import React from 'react';
import { act, screen } from '@testing-library/react';
import { PropertiesHeader, type PropertiesHeaderProps } from './PropertiesHeader';
import { FormContext } from '../../../containers/FormContext';
import userEvent from '@testing-library/user-event';
import { formContextProviderMock } from '../../../testing/formContextMocks';
import { component1Mock, component1IdMock } from '../../../testing/layoutMock';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { componentMocks } from '../../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { componentSchemaMocks } from '../../../testing/componentSchemaMocks';

const mockHandleComponentUpdate = jest.fn();

const defaultProps: PropertiesHeaderProps = {
  form: component1Mock,
  formId: component1IdMock,
  handleComponentUpdate: mockHandleComponentUpdate,
};
const user = userEvent.setup();

describe('PropertiesHeader', () => {
  afterEach(jest.clearAllMocks);

  it('renders the header name for the component', () => {
    render();

    const heading = screen.getByRole('heading', {
      name: textMock(`ux_editor.component_title.${component1Mock.type}`),
      level: 2,
    });
    expect(heading).toBeInTheDocument();
  });

  it('displays the help text when the help text button is clicked', async () => {
    render();

    const helpTextButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_help_text_general_title'),
    });

    expect(
      screen.queryByText(textMock(`ux_editor.component_help_text.${component1Mock.type}`)),
    ).not.toBeInTheDocument();

    await act(() => user.click(helpTextButton));

    expect(
      screen.getByText(textMock(`ux_editor.component_help_text.${component1Mock.type}`)),
    ).toBeInTheDocument();
  });

  it('calls "handleComponentUpdate" when the id changes', async () => {
    render();

    const textBox = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });

    await act(() => user.type(textBox, 'someId'));
    expect(mockHandleComponentUpdate).toHaveBeenCalledTimes(6);
  });

  it('should display an error when containerId is invalid', async () => {
    await render();

    const containerIdInput = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });

    await act(() => user.type(containerIdInput, 'test@'));
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_component_id_not_valid')),
    ).toBeInTheDocument();
    expect(mockHandleComponentUpdate).toHaveBeenCalledTimes(4);
  });

  it('should only show component id editing option for repeating group component', async () => {
    await render({ form: componentMocks[ComponentType.RepeatingGroup] });

    const componentId = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    const dataModelBindingForContainer = screen.queryByRole('combobox', {
      name: textMock('ux_editor.modal_properties_data_model_helper'),
    });
    const dataModelBindingForSimpleComponents = screen.queryByRole('button', {
      name: textMock('ux_editor.modal_properties_data_model_link'),
    });
    expect(componentId).toBeInTheDocument();
    expect(dataModelBindingForContainer).not.toBeInTheDocument();
    expect(dataModelBindingForSimpleComponents).not.toBeInTheDocument();
  });

  it('should show container specific dataModelBinding selector when component is container', async () => {
    await render({ form: componentMocks[ComponentType.AccordionGroup] });

    await act(() => Promise.resolve()); // Need this due to usage of LegacySelect when rendering EditGroupDataModelBindings
    const dataModelBindingForContainer = screen.getByRole('combobox', {
      name: textMock('ux_editor.modal_properties_data_model_helper'),
    });
    expect(dataModelBindingForContainer).toBeInTheDocument();
  });
});

const render = (props: Partial<PropertiesHeaderProps> = {}) => {
  const componentType = props.form ? props.form.type : defaultProps.form.type;
  queryClientMock.setQueryData(
    [QueryKey.FormComponent, componentType],
    componentSchemaMocks[componentType],
  );
  return renderWithProviders(
    <FormContext.Provider
      value={{
        ...formContextProviderMock,
      }}
    >
      <PropertiesHeader {...defaultProps} {...props} />
    </FormContext.Provider>,
  );
};
