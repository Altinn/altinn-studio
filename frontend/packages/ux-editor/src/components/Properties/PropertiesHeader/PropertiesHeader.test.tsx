import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { PropertiesHeader, type PropertiesHeaderProps } from './PropertiesHeader';
import { FormItemContext } from '../../../containers/FormItemContext';
import userEvent from '@testing-library/user-event';
import { formItemContextProviderMock } from '../../../testing/formItemContextMocks';
import { component1Mock } from '../../../testing/layoutMock';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
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
    renderPropertiesHeader();

    const heading = screen.getByRole('heading', {
      name: textMock(`ux_editor.component_title.${component1Mock.type}`),
      level: 2,
    });
    expect(heading).toBeInTheDocument();
  });

  it('displays the help text when the help text button is clicked', async () => {
    renderPropertiesHeader();

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

  it('should invoke "handleComponentUpdate" when id field blurs', async () => {
    renderPropertiesHeader();

    const editComponentIdButton = screen.getByRole('button', { name: 'ID: Component-1' });
    await act(() => user.click(editComponentIdButton));

    const inputField = screen.getByLabelText('ID');
    await act(() => user.type(inputField, 'someNewId'));
    fireEvent.blur(inputField);

    expect(mockHandleComponentUpdate).toHaveBeenCalledTimes(1);
  });

  it('should not invoke "handleComponentUpdateMock" when input field has error', async () => {
    renderPropertiesHeader();

    const editComponentIdButton = screen.getByRole('button', { name: 'ID: Component-1' });
    await act(() => user.click(editComponentIdButton));

    const containerIdInput = screen.getByLabelText('ID');

    const invalidId = 'test@';
    await act(() => user.type(containerIdInput, invalidId));
    fireEvent.blur(containerIdInput);

    expect(screen.getByText(textMock('ux_editor.modal_properties_component_id_not_valid')));
    expect(containerIdInput).toHaveAttribute('aria-invalid', 'true');
    expect(mockHandleComponentUpdate).toHaveBeenCalledTimes(0);
  });
});
const renderPropertiesHeader = (props: Partial<PropertiesHeaderProps> = {}) => {
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
