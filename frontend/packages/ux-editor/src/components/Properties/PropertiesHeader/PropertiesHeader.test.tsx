import React from 'react';
import { act, screen } from '@testing-library/react';
import { PropertiesHeader, type PropertiesHeaderProps } from './PropertiesHeader';
import { FormItemContext } from '../../../containers/FormItemContext';
import userEvent from '@testing-library/user-event';
import { formItemContextProviderMock } from '../../../testing/formItemContextMocks';
import { component1Mock } from '../../../testing/layoutMock';
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

  it('should show dataModelBinding selector', async () => {
    await render();

    const dataModelBinding = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_data_model_link'),
    });
    expect(dataModelBinding).toBeInTheDocument();
  });

  it('should only show component-id editing option when component does not have dataModelBinding', async () => {
    await render({ form: componentMocks[ComponentType.AccordionGroup] });

    const componentId = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    expect(componentId).toBeInTheDocument();
    const dataModelBinding = screen.queryByRole('button', {
      name: textMock('ux_editor.modal_properties_data_model_link'),
    });
    expect(dataModelBinding).not.toBeInTheDocument();
  });

  it('should call "handleComponentUpdate" with maxCount when dataModelBinding is clicked for RepeatingGroup', async () => {
    const dataBindingNameMock = 'element';
    const maxCountMock = 2;
    queryClientMock.setQueryData(
      [QueryKey.DatamodelMetadata, 'org', 'app'],
      [{ dataBindingName: dataBindingNameMock, maxOccurs: maxCountMock }],
    );
    await render({ form: componentMocks[ComponentType.RepeatingGroup] });

    const dataModelBinding = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_data_model_link'),
    });
    await act(() => user.click(dataModelBinding));
    const dataModelBindingSelector = screen.getByRole('combobox', {
      name:
        textMock('ux_editor.modal_properties_data_model_helper') +
        ' ' +
        textMock('general.for') +
        ' group',
    });
    await act(() => user.click(dataModelBindingSelector));
    const dataModelOption = screen.getByRole('option', { name: dataBindingNameMock });
    await act(() => user.click(dataModelOption));

    expect(mockHandleComponentUpdate).toHaveBeenCalled();
    expect(mockHandleComponentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        ...componentMocks[ComponentType.RepeatingGroup],
        maxCount: maxCountMock,
        dataModelBindings: { group: dataBindingNameMock },
      }),
    );
  });
});

const render = (props: Partial<PropertiesHeaderProps> = {}) => {
  const componentType = props.form ? props.form.type : defaultProps.form.type;
  queryClientMock.setQueryData(
    [QueryKey.FormComponent, componentType],
    componentSchemaMocks[componentType],
  );
  return renderWithProviders(
    <FormItemContext.Provider
      value={{
        ...formItemContextProviderMock,
      }}
    >
      <PropertiesHeader {...defaultProps} {...props} />
    </FormItemContext.Provider>,
  );
};
