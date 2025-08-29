import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigObjectProperties, type ConfigObjectPropertiesProps } from './ConfigObjectProperties';
import { componentMocks } from '../../../testing/componentMocks';
import InputSchema from '../../../testing/schemas/json/component/Input.schema.v1.json';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

const somePropertyName = 'somePropertyName';

jest.mock('../../../hooks/useComponentPropertyDescription', () => ({
  useComponentPropertyDescription: () => (propertyKey) =>
    propertyKey === 'somePropertyName' ? 'Some description' : undefined,
}));

describe('ConfigObjectProperties', () => {
  it('should show description from schema for objects if key is not defined', async () => {
    const user = userEvent.setup();
    renderConfigObjectProperties({
      props: {
        objectPropertyKeys: [somePropertyName],
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            [somePropertyName]: {
              type: 'object',
              properties: {},
              description: 'Some description',
            },
          },
        },
      },
    });
    await openCard(user, somePropertyName);
    expect(screen.getByText('Some description')).toBeInTheDocument();
  });

  it('should call handleComponentUpdate when a nested boolean property is toggled', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    const propertyKey = 'testObjectProperty';
    renderConfigObjectProperties({
      props: {
        objectPropertyKeys: [propertyKey],
        schema: {
          properties: {
            [propertyKey]: {
              type: 'object',
              properties: {
                readOnly: { type: 'boolean', default: false },
              },
            },
          },
        },
        component: {
          ...componentMocks.Input,
          [propertyKey]: { readOnly: false },
        },
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    await openCard(user, propertyKey);
    const readOnlySwitch = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.readOnly'),
    });
    await user.click(readOnlySwitch);
    await waitFor(() => {
      expect(handleComponentUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          [propertyKey]: expect.objectContaining({
            readOnly: true,
          }),
        }),
      );
    });
  });

  it('should toggle object card when object property button is clicked and close button is clicked', async () => {
    const user = userEvent.setup();
    const propertyKey = 'testObjectProperty';
    renderConfigObjectProperties({
      props: {
        objectPropertyKeys: [propertyKey],
        schema: {
          properties: {
            [propertyKey]: {
              type: 'object',
              properties: {
                testField: { type: 'string' },
              },
            },
          },
        },
        component: {
          ...componentMocks.Input,
          [propertyKey]: {},
        },
      },
    });
    await openCard(user, propertyKey);
    await closeCard(user, propertyKey);
    expect(
      screen.queryByRole('button', { name: textMock('general.close') }),
    ).not.toBeInTheDocument();
  });

  it('should handle toggle when property is undefined', async () => {
    const user = userEvent.setup();
    const propertyKey = 'undefinedProperty';
    renderConfigObjectProperties({
      props: {
        objectPropertyKeys: [propertyKey],
        schema: {
          properties: {
            [propertyKey]: {
              type: 'object',
              properties: {},
            },
          },
        },
        component: {
          ...componentMocks.Input,
        },
      },
    });
    await openCard(user, propertyKey);
    await closeCard(user, propertyKey);
  });

  it('should not render property if it is unsupported', () => {
    renderConfigObjectProperties({
      props: {
        objectPropertyKeys: [],
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            unsupportedProperty: {
              type: 'object',
              properties: {},
              additionalProperties: {
                type: 'string',
              },
            },
          },
        },
      },
    });
    expect(
      screen.queryByText(textMock(`ux_editor.component_properties.unsupportedProperty`)),
    ).not.toBeInTheDocument();
  });

  const renderConfigObjectProperties = ({
    props = {},
  }: {
    props?: Partial<ConfigObjectPropertiesProps>;
  }) => {
    const { Input: inputComponent } = componentMocks;
    const defaultProps: ConfigObjectPropertiesProps = {
      objectPropertyKeys: [],
      schema: InputSchema,
      component: inputComponent,
      handleComponentUpdate: jest.fn(),
      editFormId: 'test-form',
    };
    return renderWithProviders(<ConfigObjectProperties {...defaultProps} {...props} />);
  };
});

const openCard = async (user: UserEvent, propertyKey: string) => {
  const openButton = await screen.findByRole('button', {
    name: textMock(`ux_editor.component_properties.${propertyKey}`),
  });
  await user.click(openButton);
  expect(screen.getByRole('button', { name: textMock('general.close') })).toBeInTheDocument();
};

const closeCard = async (user: UserEvent, propertyKey: string) => {
  const closeButton = await screen.findByRole('button', {
    name: textMock('general.close'),
  });
  await user.click(closeButton);
  expect(
    screen.getByRole('button', { name: textMock(`ux_editor.component_properties.${propertyKey}`) }),
  ).toBeInTheDocument();
};
