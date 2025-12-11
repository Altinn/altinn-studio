import React from 'react';
import { renderWithProviders } from '../../../../testing/mocks';
import { ConfigObjectProperty, type ConfigObjectPropertyProps } from './ConfigObjectProperty';
import { componentMocks } from '../../../../testing/componentMocks';
import InputSchema from '../../../../testing/schemas/json/component/Input.schema.v1.json';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

const somePropertyName = 'somePropertyName';

jest.mock('../../../../hooks/useComponentPropertyDescription', () => ({
  useComponentPropertyDescription: () => (propertyKey) =>
    propertyKey === 'somePropertyName' ? 'Some description' : undefined,
}));

describe('ConfigObjectProperties', () => {
  it('should show description from schema for objects if key is not defined', async () => {
    const user = userEvent.setup();
    renderConfigObjectProperties({
      props: {
        objectPropertyKey: somePropertyName,
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
        objectPropertyKey: propertyKey,
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
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    await openCard(user, propertyKey);
    const readOnlySwitch = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.readOnly'),
    });
    await user.click(readOnlySwitch);

    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);

    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        [propertyKey]: expect.objectContaining({
          readOnly: true,
        }),
      }),
    );
  });

  it('should toggle object card when object property button is clicked and close button is clicked', async () => {
    const user = userEvent.setup();
    const propertyKey = 'testObjectProperty';
    renderConfigObjectProperties({
      props: {
        objectPropertyKey: propertyKey,
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
        objectPropertyKey: propertyKey,
        schema: {
          properties: {
            [propertyKey]: {
              type: 'object',
              properties: undefined,
            },
          },
        },
      },
    });
    await openCard(user, propertyKey);
    await closeCard(user, propertyKey);
  });

  it('should not render property if it is unsupported', () => {
    renderConfigObjectProperties({
      props: {
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            unsupportedProperty: {},
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
    props?: Partial<ConfigObjectPropertyProps>;
  }) => {
    const { Input: inputComponent } = componentMocks;
    const defaultProps: ConfigObjectPropertyProps = {
      objectPropertyKey: undefined,
      schema: InputSchema,
      component: inputComponent,
      handleComponentUpdate: jest.fn(),
      editFormId: 'test-form',
    };
    return renderWithProviders(<ConfigObjectProperty {...defaultProps} {...props} />);
  };
});

const openCard = async (user: UserEvent, propertyKey: string) => {
  const openButton = await screen.findByRole('button', {
    name: textMock(`ux_editor.component_properties.${propertyKey}`),
  });
  await user.click(openButton);
  expect(screen.getByRole('button', { name: textMock('general.cancel') })).toBeInTheDocument();
};

const closeCard = async (user: UserEvent, propertyKey: string) => {
  const closeButton = await screen.findByRole('button', {
    name: textMock('general.cancel'),
  });
  await user.click(closeButton);
  expect(
    screen.getByRole('button', { name: textMock(`ux_editor.component_properties.${propertyKey}`) }),
  ).toBeInTheDocument();
};
