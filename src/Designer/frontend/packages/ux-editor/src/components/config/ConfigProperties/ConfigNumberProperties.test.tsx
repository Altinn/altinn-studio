import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigNumberProperties, type ConfigNumberPropertiesProps } from './ConfigNumberProperties';
import { componentMocks } from '../../../testing/componentMocks';
import InputSchema from '../../../testing/schemas/json/component/Input.schema.v1.json';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const defaultProperty = 'someNumberProperty';

describe('ConfigNumberProperties', () => {
  it('should render property text for "preselectedOptionIndex" with button suffix', () => {
    renderConfigNumberProperties({
      numberPropertyKeys: ['preselectedOptionIndex'],
    });
    expect(getElementByRole('button', 'preselectedOptionIndex_button')).toBeInTheDocument();
  });

  it('should render number properties with enum values', async () => {
    renderConfigNumberProperties({
      numberPropertyKeys: [defaultProperty],
    });
    await openEditModeAndVerify(defaultProperty);
  });

  it('should render EditNumberValue components when keepEditOpen is true', () => {
    renderConfigNumberProperties({
      keepEditOpen: true,
    });
    expect(getElementByRole('combobox', defaultProperty)).toBeInTheDocument();
  });

  it('should close the select editor when clicking cancel button', async () => {
    const user = userEvent.setup();
    renderConfigNumberProperties();
    await openEditModeAndVerify(defaultProperty);
    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(cancelButton);

    const combobox = getElementByRole('combobox', defaultProperty);
    expect(combobox).not.toBeInTheDocument();
  });

  it('should call handleComponentUpdate when saving a new value', async () => {
    const user = userEvent.setup();
    const handleComponentUpdate = jest.fn();
    renderConfigNumberProperties({
      handleComponentUpdate,
      schema: {
        ...InputSchema,
        someNumberProperty: {
          type: 'number',
        },
      },
    });

    await openEditModeAndVerify(defaultProperty);
    const textBox = getElementByRole('textbox', defaultProperty);
    await user.type(textBox, '2');
    await saveChanges();

    expect(handleComponentUpdate).toHaveBeenCalledWith({
      ...componentMocks.Input,
      someNumberProperty: 2,
    });
  });

  const getElementByRole = (role: string, property: string) => {
    return screen.queryByRole(role, {
      name: textMock(`ux_editor.component_properties.${property}`),
    });
  };

  const openEditModeAndVerify = async (property: string) => {
    const user = userEvent.setup();
    const propertyButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_properties.${property}`),
    });
    await user.click(propertyButton);
    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    expect(cancelButton).toBeInTheDocument();
  };

  const saveChanges = async () => {
    const user = userEvent.setup();
    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);
  };

  const defaultProps: ConfigNumberPropertiesProps = {
    numberPropertyKeys: [defaultProperty],
    schema: {
      ...InputSchema,
      properties: {
        someNumberProperty: {
          type: 'number',
          enum: [1, 2, 3],
        },
      },
    },
    component: componentMocks.Input,
    handleComponentUpdate: jest.fn(),
  };
  const renderConfigNumberProperties = (props: Partial<ConfigNumberPropertiesProps> = {}) => {
    return renderWithProviders(<ConfigNumberProperties {...defaultProps} {...props} />, {});
  };
});
