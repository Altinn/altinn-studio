import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../testing/mocks';
import { ConfigObjectProperty, type ConfigObjectPropertyProps } from './ConfigObjectProperty';
import { componentMocks } from '../../../../testing/componentMocks';
import type { PropertyDefinition } from '@app/layout-contract';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const somePropertyName = 'formatting';

vi.mock('../../../../hooks/useComponentPropertyDescription', () => ({
  useComponentPropertyDescription: () => (propertyKey) =>
    propertyKey === somePropertyName ? 'Some description' : undefined,
}));

describe('ConfigObjectProperties', () => {
  it('should show description from schema for objects if key is not defined', async () => {
    renderConfigObjectProperty({
      props: {
        objectPropertyKey: somePropertyName,
        properties: {
          [somePropertyName]: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            description: { en: 'Some description', nb: 'En beskrivelse' },
            required: false,
          },
        },
      },
    });
    await openCard();
    expect(screen.getByText('Some description')).toBeInTheDocument();
  });

  it('should call handleComponentUpdate when a nested boolean property is toggled', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = vi.fn();
    renderConfigObjectProperty({
      props: {
        objectPropertyKey: somePropertyName,
        properties: {
          [somePropertyName]: {
            type: 'object',
            properties: {
              readOnly: { type: 'boolean', default: false, required: false },
            },
            additionalProperties: false,
            required: false,
          },
        },
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    await openCard();
    const readOnlySwitch = screen.getByRole('switch', {
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

  it('preserves multiple edits to existing sibling properties until the object is saved', async () => {
    const user = userEvent.setup();
    const handleComponentUpdate = vi.fn();
    const objectPropertyKey = 'customProperties';
    renderConfigObjectProperty({
      props: {
        objectPropertyKey,
        component: {
          ...componentMocks.Input,
          [objectPropertyKey]: { readOnly: false, required: false },
        },
        properties: {
          [objectPropertyKey]: {
            type: 'object',
            properties: {
              readOnly: { type: 'boolean', required: false },
              required: { type: 'boolean', required: false },
            },
            additionalProperties: false,
            required: false,
          },
        },
        handleComponentUpdate,
      },
    });
    await openCard(objectPropertyKey);

    await user.click(
      screen.getByRole('switch', {
        name: textMock('ux_editor.component_properties.readOnly'),
      }),
    );
    await user.click(
      screen.getByRole('switch', {
        name: textMock('ux_editor.component_properties.required'),
      }),
    );
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));

    expect(handleComponentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        [objectPropertyKey]: { readOnly: true, required: true },
      }),
    );
  });

  it('should delete object property and close card when delete button is clicked', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    const handleComponentUpdateMock = vi.fn();
    renderConfigObjectProperty({
      props: {
        objectPropertyKey: somePropertyName,
        component: {
          ...componentMocks.Input,
          [somePropertyName]: { currency: 'NOK' },
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
      properties: defaultObjectProperties,
      component: inputComponent,
      handleComponentUpdate: vi.fn(),
      editFormId: 'test-form',
    };
    return renderWithProviders(<ConfigObjectProperty {...defaultProps} {...props} />);
  };
});

const defaultObjectProperties: Record<string, PropertyDefinition> = {
  [somePropertyName]: {
    type: 'object',
    properties: {},
    additionalProperties: false,
    required: false,
  },
};

const openCard = async (propertyName = somePropertyName) => {
  const user = userEvent.setup();
  const openButton = await screen.findByRole('button', {
    name: textMock(`ux_editor.component_properties.${propertyName}`),
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
