import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { EditHeaderSize } from './EditHeaderSize';
import { renderWithMockStore, renderHookWithMockStore } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import userEvent from '@testing-library/user-event';

const getComboBox = (): HTMLSelectElement =>
  screen.getByRole('combobox', { name: textMock('ux_editor.modal_header_type_helper') });
const getComboBoxValue = () => getComboBox().value;

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const user = userEvent.setup();

const render = async ({ size = undefined, handleComponentChange = jest.fn() } = {}) => {
  await waitForData();

  return renderWithMockStore()(
    <EditHeaderSize
      handleComponentChange={handleComponentChange}
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentTypeV3.Header,
        textResourceBindings: {
          title: 'ServiceName',
        },
        size,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      }}
    />,
  );
};

describe('HeaderSizeSelect', () => {
  it('should show selected title size as h4 when no size is set', async () => {
    await render();

    await waitFor(() => expect(getComboBoxValue()).toBe('h4'));
  });

  it('should show selected title size as h4 when "h4" size is set', async () => {
    await render({ size: 'h4' });

    await waitFor(() => expect(getComboBoxValue()).toBe('h4'));
  });

  it('should show selected title size as h4 when "S" size is set', async () => {
    await render({ size: 'S' });

    await waitFor(() => expect(getComboBoxValue()).toBe('h4'));
  });

  it('should show selected title size as h3 when "h3" size is set', async () => {
    await render({ size: 'h3' });

    await waitFor(() => expect(getComboBoxValue()).toBe('h3'));
  });

  it('should show selected title size as h3 when "M" size is set', async () => {
    await render({ size: 'M' });

    await waitFor(() => expect(getComboBoxValue()).toBe('h3'));
  });

  it('should show selected title size as h2 when "h2" size is set', async () => {
    await render({ size: 'h2' });

    await waitFor(() => expect(getComboBoxValue()).toBe('h2'));
  });

  it('should show selected title size as h2 when "L" size is set', async () => {
    await render({ size: 'L' });

    await waitFor(() => expect(getComboBoxValue()).toBe('h2'));
  });

  it('should call handleUpdateHeaderSize when size is changed', async () => {
    const handleComponentChange = jest.fn();
    await render({ handleComponentChange, size: 'h4' });

    await user.selectOptions(getComboBox(), 'h2');
    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Header,
      textResourceBindings: {
        title: 'ServiceName',
      },
      size: 'h2',
      dataModelBindings: {},
    });
  });
});
