import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigNumberProperties, type ConfigNumberPropertiesProps } from './ConfigNumberProperties';
import { componentMocks } from '../../../testing/componentMocks';
import InputSchema from '../../../testing/schemas/json/component/Input.schema.v1.json';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('ConfigNumberProperties', () => {
  it('should render property text for "preselectedOptionIndex" with button suffix', () => {
    renderConfigNumberProperties({
      numberPropertyKeys: ['preselectedOptionIndex'],
      schema: {
        properties: {
          preselectedOptionIndex: {
            type: 'number',
            enum: [0, 1, 2],
          },
        },
      },
    });
    expect(
      screen.getByText(textMock('ux_editor.component_properties.preselectedOptionIndex_button')),
    ).toBeInTheDocument();
  });

  it('should render number properties with enum values', async () => {
    const user = userEvent.setup();
    renderConfigNumberProperties({
      numberPropertyKeys: ['someNumberProperty'],
      schema: {
        properties: {
          someNumberProperty: {
            type: 'number',
            enum: [1, 2, 3],
          },
        },
      },
    });
    const propertyButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.someNumberProperty'),
    });
    await user.click(propertyButton);
    expect(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.component_properties.someNumberProperty'),
      }),
    ).toBeInTheDocument();
  });

  it('should render regular number properties without button suffix', () => {
    renderConfigNumberProperties({
      numberPropertyKeys: ['someNumberProperty'],
      schema: {
        properties: {
          someNumberProperty: {
            type: 'number',
            description: 'A sample number property',
          },
        },
      },
    });
    expect(
      screen.getByText(textMock('ux_editor.component_properties.someNumberProperty')),
    ).toBeInTheDocument();
  });

  const defaultProps: ConfigNumberPropertiesProps = {
    numberPropertyKeys: ['someNumberProperty'],
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
