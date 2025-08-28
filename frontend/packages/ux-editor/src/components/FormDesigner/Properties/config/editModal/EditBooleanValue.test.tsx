import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { EditBooleanValue } from './EditBooleanValue';
import { renderWithProviders } from '../../../testing/mocks';

import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

const renderEditBooleanValue = ({
  handleComponentChange = jest.fn(),
  value = false,
  propertyKey = 'required',
  componentOverrides = {},
} = {}) =>
  renderWithProviders(
    <EditBooleanValue
      handleComponentChange={handleComponentChange}
      propertyKey={propertyKey}
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        required: value,
        itemType: 'COMPONENT',
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
        ...componentOverrides,
      }}
    />,
  );

describe('EditBooleanValue', () => {
  it('should render component as switch', () => {
    renderEditBooleanValue();

    expect(
      screen.getByRole('checkbox', { name: textMock('ux_editor.component_properties.required') }),
    ).toBeInTheDocument();
  });

  it('should call onChange handler with the correct arguments', async () => {
    const handleComponentChange = jest.fn();
    renderEditBooleanValue({ handleComponentChange });
    const inputElement = screen.getByLabelText(textMock('ux_editor.component_properties.required'));

    user.click(inputElement);

    await waitFor(() => {
      expect(handleComponentChange).toHaveBeenCalledWith({
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        required: true,
        itemType: 'COMPONENT',
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
      });
    });
  });

  it('should display correct help text when value is an expression (array)', () => {
    renderEditBooleanValue({
      componentOverrides: {
        required: [],
      },
    });
    expect(
      screen.getByText(textMock('ux_editor.component_properties.config_is_expression_message')),
    ).toBeInTheDocument();
  });

  it('should display help text', () => {
    renderEditBooleanValue();
    expect(
      screen.getByRole('button', {
        name: textMock('ux_editor.component_properties_help_text.required'),
      }),
    ).toBeInTheDocument();
  });
});
