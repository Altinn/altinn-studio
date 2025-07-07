import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigStringProperties, type ConfigStringPropertiesProps } from './ConfigStringProperties';
import { componentMocks } from '../../../testing/componentMocks';
import InputSchema from '../../../testing/schemas/json/component/Input.schema.v1.json';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('ConfigStringProperties', () => {
  it('should render property text for the "sortOrder" property', async () => {
    const user = userEvent.setup();
    renderConfigStringProperties({
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
    renderConfigStringProperties({
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
    renderConfigStringProperties({});
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

const renderConfigStringProperties = ({
  props = {},
}: {
  props?: Partial<ConfigStringPropertiesProps>;
}) => {
  const { Input: inputComponent } = componentMocks;
  const defaultProps: ConfigStringPropertiesProps = {
    schema: InputSchema,
    component: inputComponent,
    handleComponentUpdate: jest.fn(),
    stringPropertyKeys: [],
  };
  return renderWithProviders(<ConfigStringProperties {...defaultProps} {...props} />);
};
