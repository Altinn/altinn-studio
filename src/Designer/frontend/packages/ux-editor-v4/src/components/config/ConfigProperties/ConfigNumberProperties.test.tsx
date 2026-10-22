import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigNumberProperties, type ConfigNumberPropertiesProps } from './ConfigNumberProperties';
import { componentMocks } from '../../../testing/componentMocks';
import InputSchema from '../../../testing/schemas/json/component/Input.schema.v1.json';
import FileUploadSchema from '../../../testing/schemas/json/component/FileUpload.schema.v1.json';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../types/FormItem';
import userEvent from '@testing-library/user-event';
import {
  cancelConfigAndVerify,
  getPropertyByRole,
  openConfigAndVerify,
  saveConfigChanges,
} from './testConfigUtils';

const defaultProperty = 'someNumberProperty';

describe('ConfigNumberProperties', () => {
  it('should render property text for "preselectedOptionIndex" with button suffix', () => {
    renderConfigNumberProperties({
      numberPropertyKeys: ['preselectedOptionIndex'],
    });
    expect(getPropertyByRole('button', 'preselectedOptionIndex_button')).toBeInTheDocument();
  });

  it('should render EditNumberValue components when keepEditOpen is true', () => {
    renderConfigNumberProperties({
      keepEditOpen: true,
    });
    expect(getPropertyByRole('combobox', defaultProperty)).toBeInTheDocument();
  });

  it('should be able to toggle number property config', async () => {
    const user = userEvent.setup();
    renderConfigNumberProperties();
    await openConfigAndVerify({ user, property: defaultProperty });
    await cancelConfigAndVerify(user);
  });

  it('should call handleComponentUpdate when saving a new value', async () => {
    const user = userEvent.setup();
    const handleComponentUpdate = vi.fn();
    renderConfigNumberProperties({
      handleComponentUpdate,
      schema: {
        ...InputSchema,
        properties: {
          someNumberProperty: {
            type: 'number',
          },
        },
      },
    });

    await openConfigAndVerify({ user, property: defaultProperty });
    const textBox = getPropertyByRole('textbox', defaultProperty);
    await user.type(textBox, '2');
    await saveConfigChanges(user);

    expect(handleComponentUpdate).toHaveBeenCalledWith({
      ...componentMocks.Input,
      someNumberProperty: 2,
    });
  });

  it('disables save when the other count has been saved with a value the pending value breaks', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NumberOfAttachmentsConfig />, {});

    await openConfigAndVerify({ user, property: 'minNumberOfAttachments' });
    const minTextBox = getPropertyByRole('textbox', 'minNumberOfAttachments');
    await user.clear(minTextBox);
    await user.type(minTextBox, '3');
    await user.click(getPropertyByRole('button', 'maxNumberOfAttachments'));
    const maxTextBox = getPropertyByRole('textbox', 'maxNumberOfAttachments');
    await user.clear(maxTextBox);
    await user.type(maxTextBox, '1');
    const [saveMaxButton] = screen.getAllByRole('button', { name: textMock('general.save') });
    await user.click(saveMaxButton);

    expect(screen.getByRole('button', { name: textMock('general.save') })).toBeDisabled();
  });

  const defaultProps: ConfigNumberPropertiesProps = {
    numberPropertyKeys: [defaultProperty],
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
    handleComponentUpdate: vi.fn(),
  };
  const renderConfigNumberProperties = (props: Partial<ConfigNumberPropertiesProps> = {}) => {
    return renderWithProviders(<ConfigNumberProperties {...defaultProps} {...props} />, {});
  };
});

const NumberOfAttachmentsConfig = () => {
  const [component, setComponent] = useState<FormItem>({
    ...componentMocks[ComponentType.FileUpload],
    minNumberOfAttachments: 1,
    maxNumberOfAttachments: 3,
  });
  return (
    <ConfigNumberProperties
      component={component}
      schema={FileUploadSchema}
      numberPropertyKeys={['maxNumberOfAttachments', 'minNumberOfAttachments']}
      handleComponentUpdate={setComponent}
    />
  );
};
