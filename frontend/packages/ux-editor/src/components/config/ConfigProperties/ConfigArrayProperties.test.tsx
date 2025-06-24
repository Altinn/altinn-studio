import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigArrayProperties, type ConfigArrayPropertiesProps } from './ConfigArrayProperties';
import { componentMocks } from '../../../testing/componentMocks';
import InputSchema from '../../../testing/schemas/json/component/Input.schema.v1.json';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('ConfigArrayProperties', () => {
  it('should call handleComponentUpdate and setSelectedValue when array property is updated', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    renderConfigArrayProperties({
      props: {
        schema: {
          properties: {
            [supportedKey]: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['option1', 'option2'],
              },
            },
          },
        },
        component: {
          ...componentMocks.Input,
          [supportedKey]: [],
        },
        handleComponentUpdate: handleComponentUpdateMock,
        arrayPropertyKeys: [supportedKey],
      },
    });
    const arrayPropertyButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_properties.${supportedKey}`),
    });
    await user.click(arrayPropertyButton);
    const combobox = screen.getByRole('combobox', {
      name: textMock(`ux_editor.component_properties.${supportedKey}`),
    });
    await user.click(combobox);
    const option1 = screen.getByRole('option', {
      name: textMock('ux_editor.component_properties.enum_option1'),
    });
    await user.click(option1);
    await waitFor(() => {
      expect(handleComponentUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          [supportedKey]: ['option1'],
        }),
      );
    });
    const selectedValueDisplay = screen.getByRole('option', {
      name: textMock('ux_editor.component_properties.enum_option1'),
    });
    expect(selectedValueDisplay).toBeInTheDocument();
  });

  it('should only render array properties with items of type string AND enum values', async () => {
    const user = userEvent.setup();
    renderConfigArrayProperties({
      props: {
        schema: {
          properties: {
            [supportedKey]: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['option1', 'option2'],
              },
            },
          },
        },
        arrayPropertyKeys: [supportedKey],
      },
    });
    await user.click(screen.getByText(textMock(`ux_editor.component_properties.${supportedKey}`)));
    expect(
      screen.getByRole('combobox', {
        name: textMock(`ux_editor.component_properties.${supportedKey}`),
      }),
    ).toBeInTheDocument();
  });

  it('should render array properties with enum values correctly', async () => {
    const user = userEvent.setup();
    const enumValues = ['option1', 'option2'];
    renderConfigArrayProperties({
      props: {
        schema: {
          properties: {
            [supportedKey]: {
              type: 'array',
              items: {
                type: 'string',
                enum: enumValues,
              },
            },
          },
        },
        component: {
          ...componentMocks.Input,
          [supportedKey]: enumValues,
        },
        arrayPropertyKeys: [supportedKey],
      },
    });
    const arrayPropertyButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_properties.${supportedKey}`),
    });
    await user.click(arrayPropertyButton);
    for (const dataType of enumValues) {
      expect(
        screen.getByText(textMock(`ux_editor.component_properties.enum_${dataType}`)),
      ).toBeInTheDocument();
    }
  });

  const supportedKey = 'supportedArrayProperty';

  const renderConfigArrayProperties = ({
    props = {},
  }: {
    props?: Partial<ConfigArrayPropertiesProps>;
  }) => {
    const defaultProps: ConfigArrayPropertiesProps = {
      schema: InputSchema,
      component: componentMocks.Input,
      handleComponentUpdate: jest.fn(),
      arrayPropertyKeys: [supportedKey],
    };
    return renderWithProviders(<ConfigArrayProperties {...defaultProps} {...props} />);
  };
});
