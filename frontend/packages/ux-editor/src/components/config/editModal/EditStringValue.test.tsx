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
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
      }}
    />,
  );

describe('EditStringValue', () => {
  it('should render component as input field, when not given enum prop', () => {
    renderEditStringValue();

    expect(
      screen.getByRole('textbox', { name: textMock('ux_editor.component_properties.maxLength') }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should render component as select, when given enum prop', () => {
    renderEditStringValue({ enumValues: ['one', 'two', 'three'] });

    expect(
      screen.getByRole('combobox', { name: textMock('ux_editor.component_properties.maxLength') }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('should call onChange handler with the correct arguments', async () => {
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
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
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
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
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
    await user.click(
      screen.getByRole('option', { name: textMock('ux_editor.component_properties.enum_one') }),
    );

    await waitFor(() => {
      expect(handleComponentChange).toHaveBeenCalledWith({
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        maxLength: ['one'],
        itemType: 'COMPONENT',
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
      });
    });

    await user.click(
      screen.getByRole('option', { name: textMock('ux_editor.component_properties.enum_two') }),
    );
    await waitFor(() => {
      expect(handleComponentChange).toHaveBeenCalledWith(
        expect.objectContaining({
          maxLength: ['one', 'two'],
        }),
      );
    });

    await user.click(
      screen.getByRole('option', { name: textMock('ux_editor.component_properties.enum_one') }),
    );
    await waitFor(() => {
      expect(handleComponentChange).toHaveBeenCalledWith(
        expect.objectContaining({
          maxLength: ['two'],
        }),
      );
    });
  });

  it('should show the placeholder option as disabled', () => {
    const handleComponentChange = jest.fn();
    renderEditStringValue({ handleComponentChange, enumValues: ['one', 'two', 'three'] });

    const placeholderOption = screen.getByRole('option', {
      name: textMock('ux_editor.edit_component.select_value'),
    });
    expect(placeholderOption).toBeInTheDocument();
    expect(placeholderOption).toBeDisabled();
  });

  it('should set value when initially undefined and an option is clicked', async () => {
    const handleComponentChange = jest.fn();
    renderEditStringValue({ handleComponentChange, enumValues: ['one', 'two', 'three'] });

    const selectElement = screen.getByRole('combobox', {
      name: textMock('ux_editor.component_properties.maxLength'),
    });

    await user.selectOptions(selectElement, 'one');

    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      type: ComponentType.Input,
      maxLength: 'one',
      textResourceBindings: {
        title: 'ServiceName',
      },
      itemType: 'COMPONENT',
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
    });
  });
});
