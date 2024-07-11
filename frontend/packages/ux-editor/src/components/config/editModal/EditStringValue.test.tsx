import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { EditStringValue } from './EditStringValue';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

const renderEditStringValue = ({
  multiple = false,
  enumValues = null,
  maxLength = undefined,
  handleComponentChange = jest.fn(),
} = {}) =>
  renderWithProviders(
    <EditStringValue
      handleComponentChange={handleComponentChange}
      propertyKey='maxLength'
      multiple={multiple}
      enumValues={enumValues}
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        maxLength: maxLength || '',
        itemType: 'COMPONENT',
        dataModelBindings: { simpleBinding: 'some-path' },
      }}
    />,
  );

describe('EditStringValue', () => {
  it('should render', () => {
    const handleComponentChange = jest.fn();
    renderEditStringValue({ handleComponentChange });
  });

  it(' Ensure that the onChange handler is called with the correct arguments', async () => {
    const handleComponentChange = jest.fn();
    renderEditStringValue({ handleComponentChange });
    const inputElement = screen.getByLabelText(
      textMock('ux_editor.component_properties.maxLength'),
    );
    await user.type(inputElement, 'new value');
    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      type: ComponentType.Input,
      maxLength: 'new value',
      textResourceBindings: {
        title: 'ServiceName',
      },
      itemType: 'COMPONENT',
      dataModelBindings: { simpleBinding: 'some-path' },
    });
  });

  it('should call onChange for enum values', async () => {
    const handleComponentChange = jest.fn();
    renderEditStringValue({ handleComponentChange, enumValues: ['one', 'two', 'three'] });

    await user.selectOptions(screen.getByRole('combobox'), 'one');
    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      type: ComponentType.Input,
      textResourceBindings: {
        title: 'ServiceName',
      },
      maxLength: 'one',
      itemType: 'COMPONENT',
      dataModelBindings: { simpleBinding: 'some-path' },
    });
  });

  it('should call onChange for multiple enum values', async () => {
    const handleComponentChange = jest.fn();
    renderEditStringValue({
      handleComponentChange,
      enumValues: ['one', 'two', 'three'],
      multiple: true,
    });

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'one' }));

    await waitFor(() => {
      //await user.selectOptions(screen.getByRole('listbox'), screen.getByRole('option', { name: "one" }));
      expect(handleComponentChange).toHaveBeenCalledWith({
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        maxLength: ['one'],
        itemType: 'COMPONENT',
        dataModelBindings: { simpleBinding: 'some-path' },
      });
    });

    await user.click(screen.getByRole('option', { name: 'two' }));
    await waitFor(() => {
      expect(handleComponentChange).toHaveBeenCalledWith(
        expect.objectContaining({
          maxLength: ['one', 'two'],
        }),
      );
    });

    await user.click(screen.getByRole('option', { name: 'one' }));
    await waitFor(() => {
      expect(handleComponentChange).toHaveBeenCalledWith(
        expect.objectContaining({
          maxLength: ['two'],
        }),
      );
    });
  });
});
