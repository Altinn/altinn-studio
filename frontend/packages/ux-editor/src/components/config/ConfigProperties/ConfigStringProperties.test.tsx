import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigStringProperties, type ConfigStringPropertiesProps } from './ConfigStringProperties';
import { componentMocks } from '../../../testing/componentMocks';
import InputSchema from '../../../testing/schemas/json/component/Input.schema.v1.json';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const somePropertyName = 'somePropertyName';
const customTextMockToHandleUndefined = (keys: string | string[]) => {
  const key = Array.isArray(keys) ? keys[0] : keys;
  if (key === `ux_editor.component_properties_description.${somePropertyName}`) return key;
  return '[mockedText(' + key + ')]';
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: customTextMockToHandleUndefined,
  }),
}));

describe('ConfigStringProperties', () => {
  it('should render property text for the "sortOrder" property', async () => {
    const user = userEvent.setup();
    render({
      props: {
        schema: {
          properties: {
            sortOrder: {
              type: 'string',
              enum: ['option1', 'option2'],
            },
          },
        },
        stringPropertyKeys: ['sortOrder'],
      },
    });
    await user.click(screen.getByText(textMock('ux_editor.component_properties.sortOrder')));
    expect(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.component_properties.sortOrder'),
      }),
    ).toBeInTheDocument();
  });

  it('should render property text for the "displayMode" property', () => {
    render({
      props: {
        schema: {
          properties: {
            displayMode: {
              type: 'string',
              enum: ['option1', 'option2'],
            },
          },
        },
        stringPropertyKeys: ['displayMode'],
      },
    });
    expect(
      screen.getByRole('button', {
        name: textMock('ux_editor.component_properties.displayMode'),
      }),
    ).toBeInTheDocument();
  });

  it('should not render anything when stringPropertyKeys is empty', () => {
    render({
      props: {
        stringPropertyKeys: [],
      },
    });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

const render = ({ props = {} }: { props?: Partial<ConfigStringPropertiesProps> }) => {
  const { Input: inputComponent } = componentMocks;
  const defaultProps: ConfigStringPropertiesProps = {
    schema: InputSchema,
    component: inputComponent,
    handleComponentUpdate: jest.fn(),
    stringPropertyKeys: [],
  };
  return renderWithProviders(<ConfigStringProperties {...defaultProps} {...props} />);
};
