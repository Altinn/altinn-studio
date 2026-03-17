import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigArrayProperties, type ConfigArrayPropertiesProps } from './ConfigArrayProperties';
import { componentMocks } from '../../../testing/componentMocks';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import {
  cancelConfigAndVerify,
  getPropertyByRole,
  openConfigAndVerify,
  saveConfigChanges,
} from './testConfigUtils';

describe('ConfigArrayProperties', () => {
  it('should call handleComponentUpdate when array property is updated', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    renderConfigArrayProperties({ props: { handleComponentUpdate: handleComponentUpdateMock } });
    await openConfigAndVerify({ user, property: supportedKey });
    await selectOption(user, 'option1');

    await saveConfigChanges(user);
    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        [supportedKey]: ['option1'],
      }),
    );
  });

  it('should only render array properties with items of type string AND enum values', async () => {
    const user = userEvent.setup();
    renderConfigArrayProperties({});
    await openConfigAndVerify({ user, property: supportedKey });
    expect(getPropertyByRole('combobox', supportedKey)).toBeInTheDocument();
  });

  it('should render array properties with enum values correctly', async () => {
    const user = userEvent.setup();
    const enumValues = ['option1', 'option2'];
    renderConfigArrayProperties({
      props: {
        component: {
          ...componentMocks.Input,
          [supportedKey]: enumValues,
        },
      },
    });
    await openConfigAndVerify({ user, property: supportedKey });
    for (const dataType of enumValues) {
      expect(
        screen.getByText(textMock(`ux_editor.component_properties.enum_${dataType}`)),
      ).toBeInTheDocument();
    }
  });

  it("should render in edit mode when 'keepEditOpen' is true", async () => {
    renderConfigArrayProperties({ props: { keepEditOpen: true } });
    expect(getPropertyByRole('combobox', supportedKey)).toBeInTheDocument();
  });

  it('should call handleComponentUpdate in keepEditOpen mode when array property is updated', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    renderConfigArrayProperties({
      props: {
        handleComponentUpdate: handleComponentUpdateMock,
        keepEditOpen: true,
      },
    });
    await selectOption(user, 'option2');
    await waitFor(() => {
      expect(handleComponentUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          [supportedKey]: ['option2'],
        }),
      );
    });
  });

  it('should close the select editor when clicking cancel button', async () => {
    const user = userEvent.setup();
    renderConfigArrayProperties({});
    await openConfigAndVerify({ user, property: supportedKey });
    await cancelConfigAndVerify(user);
  });
});

const supportedKey = 'supportedArrayProperty';
const defaultArraySchema = {
  properties: {
    [supportedKey]: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['option1', 'option2'],
      },
    },
  },
};

const selectOption = async (user: UserEvent, optionText: string) => {
  const combobox = getPropertyByRole('combobox', supportedKey);
  await user.click(combobox);

  const option = screen.getByRole('option', {
    name: textMock(`ux_editor.component_properties.enum_${optionText}`),
  });
  await user.click(option);
  await waitFor(() => expect(option).toHaveAttribute('aria-selected', 'true'));
  await user.click(document.body);
};

const renderConfigArrayProperties = ({
  props = {},
}: {
  props?: Partial<ConfigArrayPropertiesProps>;
}) => {
  const defaultProps: ConfigArrayPropertiesProps = {
    schema: defaultArraySchema,
    component: componentMocks.Input,
    handleComponentUpdate: jest.fn(),
    arrayPropertyKeys: [supportedKey],
  };
  return renderWithProviders(<ConfigArrayProperties {...defaultProps} {...props} />);
};
