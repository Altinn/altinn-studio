import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigArrayProperties, type ConfigArrayPropertiesProps } from './ConfigArrayProperties';
import { componentMocks } from '../../../testing/componentMocks';
import InputSchema from '../../../testing/schemas/json/component/Input.schema.v1.json';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const somePropertyName = 'somePropertyName';
const customTextMockToHandleUndefined = (
  keys: string | string[],
  variables?: Record<string, string>,
) => {
  const key = Array.isArray(keys) ? keys[0] : keys;
  if (key === `ux_editor.component_properties_description.${somePropertyName}`) return key;
  return variables
    ? '[mockedText(' + key + ', ' + JSON.stringify(variables) + ')]'
    : '[mockedText(' + key + ')]';
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: customTextMockToHandleUndefined,
  }),
}));

jest.mock('../../../hooks/useComponentPropertyDescription', () => ({
  useComponentPropertyDescription: () => (propertyKey) =>
    propertyKey === 'somePropertyName' ? 'Some description' : undefined,
}));

describe('ConfigArrayProperties', () => {
  it('should call handleComponentUpdate and setSelectedValue when array property is updated', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    const propertyKey = 'supportedArrayProperty';
    renderWithProviders(
      <ConfigArrayProperties
        schema={{
          properties: {
            [propertyKey]: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['option1', 'option2'],
              },
            },
          },
        }}
        component={componentMocks.Input}
        handleComponentUpdate={handleComponentUpdateMock}
        arrayPropertyKeys={[propertyKey]}
      />,
    );
    const arrayPropertyButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_properties.${propertyKey}`),
    });
    await user.click(arrayPropertyButton);
    const combobox = screen.getByRole('combobox', {
      name: textMock(`ux_editor.component_properties.${propertyKey}`),
    });
    await user.click(combobox);

    const option1 = screen.getByRole('option', {
      name: textMock('ux_editor.component_properties.enum_option1'),
    });
    await user.click(option1);

    await waitFor(() => {
      expect(handleComponentUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          [propertyKey]: ['option1'],
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
    render({
      props: {
        schema: {
          properties: {
            supportedArrayProperty: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['option1', 'option2'],
              },
            },
            unsupportedArrayProperty: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
        arrayPropertyKeys: ['supportedArrayProperty', 'unsupportedArrayProperty'],
      },
    });
    await user.click(
      screen.getByText(textMock('ux_editor.component_properties.supportedArrayProperty')),
    );
    expect(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.component_properties.supportedArrayProperty'),
      }),
    ).toBeInTheDocument();
  });

  it('should render array properties with enum values correctly', async () => {
    const user = userEvent.setup();
    const propertyKey = 'supportedArrayProperty';
    const enumValues = ['option1', 'option2'];
    render({
      props: {
        schema: {
          properties: {
            [propertyKey]: {
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
          [propertyKey]: enumValues,
        },
        arrayPropertyKeys: [propertyKey],
      },
    });
    const arrayPropertyButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_properties.${propertyKey}`),
    });
    await user.click(arrayPropertyButton);
    for (const dataType of enumValues) {
      expect(
        screen.getByText(textMock(`ux_editor.component_properties.enum_${dataType}`)),
      ).toBeInTheDocument();
    }
  });

  const render = ({ props = {} }: { props?: Partial<ConfigArrayPropertiesProps> }) => {
    const { Input: inputComponent } = componentMocks;
    const defaultProps: ConfigArrayPropertiesProps = {
      schema: InputSchema,
      component: inputComponent,
      handleComponentUpdate: jest.fn(),
      arrayPropertyKeys: [],
    };
    return renderWithProviders(<ConfigArrayProperties {...defaultProps} {...props} />);
  };
});
