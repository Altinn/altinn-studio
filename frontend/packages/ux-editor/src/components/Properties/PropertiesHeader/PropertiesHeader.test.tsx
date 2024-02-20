import React from 'react';
import { act, screen } from '@testing-library/react';
import { PropertiesHeader, type PropertiesHeaderProps } from './PropertiesHeader';
import { FormContext } from '../../../containers/FormContext';
import userEvent from '@testing-library/user-event';
import { formContextProviderMock } from '../../../testing/formContextMocks';
import { component1Mock, component1IdMock } from '../../../testing/layoutMock';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

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
    renderProperties({ form: component1Mock, formId: component1IdMock });

    const heading = screen.getByRole('heading', {
      name: textMock(`ux_editor.component_title.${component1Mock.type}`),
      level: 2,
    });
    expect(heading).toBeInTheDocument();
  });

  it('displays the help text when the help text button is clicked', async () => {
    renderProperties({ form: component1Mock, formId: component1IdMock });

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
    renderProperties({ form: component1Mock, formId: component1IdMock });

    const editComponentIdButton = screen.getByRole('button', { name: /ID/i });
    expect(editComponentIdButton).toBeInTheDocument();
    await act(() => user.click(editComponentIdButton));
    const textbox = screen.getByRole('textbox', { name: 'ID' });

    await act(() => user.type(textbox, '2'));
    await act(() => user.click(document.body));
    expect(mockHandleComponentUpdate).toHaveBeenCalledTimes(1);
  });

  it('should display an error when containerId is invalid', async () => {
    await renderProperties({ form: component1Mock, formId: component1IdMock });

    const containerIdInput = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });

    await act(() => user.type(containerIdInput, 'test@'));
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_component_id_not_valid')),
    ).toBeInTheDocument();
    expect(mockHandleComponentUpdate).toHaveBeenCalledTimes(5);
  });
});

const renderProperties = (formContextProps: Partial<FormContext> = {}) => {
  return renderWithProviders(
    <FormContext.Provider
      value={{
        ...formContextProviderMock,
        ...formContextProps,
      }}
    >
      <PropertiesHeader {...defaultProps} />
    </FormContext.Provider>,
  );
};
