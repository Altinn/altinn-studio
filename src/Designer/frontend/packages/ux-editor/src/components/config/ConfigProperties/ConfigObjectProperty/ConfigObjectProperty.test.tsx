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
    renderConfigObjectProperty({
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
    await openCard();
    expect(screen.getByText('Some description')).toBeInTheDocument();
  });

  it('should call handleComponentUpdate when a nested boolean property is toggled', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    renderConfigObjectProperty({
      props: {
        objectPropertyKey: somePropertyName,
        schema: {
          properties: {
            [somePropertyName]: {
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
    await openCard();
    const readOnlySwitch = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.readOnly'),
    });
    await user.click(readOnlySwitch);

    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);

    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        [somePropertyName]: expect.objectContaining({
          readOnly: true,
        }),
      }),
    );
  });

  it('should toggle object card when object property button is clicked and close button is clicked', async () => {
    renderConfigObjectProperty({});
    await openCard();
    await closeCard();
    expect(
      screen.queryByRole('button', { name: textMock('general.close') }),
    ).not.toBeInTheDocument();
  });

  it('should delete object property and close card when delete button is clicked', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    renderConfigObjectProperty({
      props: {
        objectPropertyKey: somePropertyName,
        component: {
          ...componentMocks.Input,
          [somePropertyName]: { testField: 'testValue' },
        },
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    await openCard();

    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await user.click(deleteButton);

    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        [somePropertyName]: undefined,
      }),
    );
    expect(
      screen.queryByRole('button', { name: textMock('general.delete') }),
    ).not.toBeInTheDocument();
  });

  const renderConfigObjectProperty = ({
    props = {},
  }: {
    props?: Partial<ConfigObjectPropertyProps>;
  }) => {
    const { Input: inputComponent } = componentMocks;
    const defaultProps: ConfigObjectPropertyProps = {
      objectPropertyKey: somePropertyName,
      schema: {
        ...InputSchema,
        properties: {
          [somePropertyName]: {
            type: 'object',
            properties: {},
          },
        },
      },
      component: inputComponent,
      handleComponentUpdate: jest.fn(),
      editFormId: 'test-form',
    };
    return renderWithProviders(<ConfigObjectProperty {...defaultProps} {...props} />);
  };
});

const openCard = async () => {
  const user = userEvent.setup();
  const openButton = await screen.findByRole('button', {
    name: textMock(`ux_editor.component_properties.${somePropertyName}`),
  });
  await user.click(openButton);
  expect(screen.getByRole('button', { name: textMock('general.cancel') })).toBeInTheDocument();
};

const closeCard = async () => {
  const user = userEvent.setup();
  const closeButton = await screen.findByRole('button', {
    name: textMock('general.cancel'),
  });
  await user.click(closeButton);
  expect(
    screen.getByRole('button', {
      name: textMock(`ux_editor.component_properties.${somePropertyName}`),
    }),
  ).toBeInTheDocument();
};
