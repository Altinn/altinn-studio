import React from 'react';
import { act, screen } from '@testing-library/react';
import { DataModelBindingRow, type DataModelBindingRowProps } from './DataModelBindingRow';
import { FormContext } from '../../../../containers/FormContext';
import userEvent from '@testing-library/user-event';
import { formContextProviderMock } from '../../../../testing/formContextMocks';
import { component1Mock, component1IdMock } from '../../../../testing/layoutMock';
import { renderWithProviders } from '../../../../testing/mocks';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

const mockSchema = {
  properties: {
    dataModelBindings: {
      properties: {
        simpleBinding: {
          description: 'Description for simpleBinding',
        },
      },
    },
  },
};

const mockSchemaUndefined = {
  properties: {
    dataModelBindings: {
      properties: undefined,
    },
  },
};

const mockHandleComponentUpdate = jest.fn();

const defaultProps: DataModelBindingRowProps = {
  schema: mockSchema,
  component: component1Mock,
  formId: component1IdMock,
  handleComponentUpdate: mockHandleComponentUpdate,
};

describe('DataModelBindingRow', () => {
  afterEach(jest.clearAllMocks);

  it('renders EditDataModelBindings component when schema is present', () => {
    renderProperties({ form: component1Mock, formId: component1IdMock });

    const datamodelButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_data_model_link'),
    });
    expect(datamodelButton).toBeInTheDocument();
  });

  it('does not render EditDataModelBindings component when schema.properties is undefined', () => {
    renderProperties(
      { form: component1Mock, formId: component1IdMock },
      { schema: mockSchemaUndefined },
    );

    const datamodelButton = screen.queryByRole('button', {
      name: textMock('ux_editor.modal_properties_data_model_link'),
    });
    expect(datamodelButton).not.toBeInTheDocument();
  });

  it('calls handleComponentUpdate when EditDataModelBindings component is updated', async () => {
    const user = userEvent.setup();
    renderProperties({ form: component1Mock, formId: component1IdMock });

    const datamodelButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_data_model_link'),
    });
    expect(
      screen.queryByRole('button', { name: textMock('general.delete') }),
    ).not.toBeInTheDocument();

    await act(() => user.click(datamodelButton));

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    expect(deleteButton).toBeInTheDocument();

    await act(() => user.click(deleteButton));
    expect(mockHandleComponentUpdate).toHaveBeenCalledTimes(1);
  });
});

const renderProperties = (
  formContextProps: Partial<FormContext> = {},
  props: Partial<DataModelBindingRowProps> = {},
) => {
  return renderWithProviders(
    <FormContext.Provider
      value={{
        ...formContextProviderMock,
        ...formContextProps,
      }}
    >
      <DataModelBindingRow {...defaultProps} {...props} />
    </FormContext.Provider>,
  );
};
