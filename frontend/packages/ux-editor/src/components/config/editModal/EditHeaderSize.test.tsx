import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { EditHeaderSize } from './EditHeaderSize';
import { renderWithProviders, renderHookWithProviders } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';

const getComboBox = () =>
  screen.getByRole('combobox', { name: textMock('ux_editor.modal_header_type_helper') });
const getComboBoxValue = () => getComboBox().getAttribute('value');

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithProviders(() => useLayoutSchemaQuery()).result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async ({ size = undefined, handleComponentChange = jest.fn() } = {}) => {
  await waitForData();

  return renderWithProviders(
    <EditHeaderSize
      handleComponentChange={handleComponentChange}
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentType.Header,
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

    await waitFor(() =>
      expect(getComboBoxValue()).toBe(textMock('ux_editor.modal_header_type_h4')),
    );
  });

  it('should show selected title size as h4 when "h4" size is set', async () => {
    await render({ size: 'h4' });

    await waitFor(() =>
      expect(getComboBoxValue()).toBe(textMock('ux_editor.modal_header_type_h4')),
    );
  });

  it('should show selected title size as h4 when "S" size is set', async () => {
    await render({ size: 'S' });

    await waitFor(() =>
      expect(getComboBoxValue()).toBe(textMock('ux_editor.modal_header_type_h4')),
    );
  });

  it('should show selected title size as h3 when "h3" size is set', async () => {
    await render({ size: 'h3' });

    await waitFor(() =>
      expect(getComboBoxValue()).toBe(textMock('ux_editor.modal_header_type_h3')),
    );
  });

  it('should show selected title size as h3 when "M" size is set', async () => {
    await render({ size: 'M' });

    await waitFor(() =>
      expect(getComboBoxValue()).toBe(textMock('ux_editor.modal_header_type_h3')),
    );
  });

  it('should show selected title size as h2 when "h2" size is set', async () => {
    await render({ size: 'h2' });

    await waitFor(() =>
      expect(getComboBoxValue()).toBe(textMock('ux_editor.modal_header_type_h2')),
    );
  });

  it('should show selected title size as h2 when "L" size is set', async () => {
    await render({ size: 'L' });

    await waitFor(() =>
      expect(getComboBoxValue()).toBe(textMock('ux_editor.modal_header_type_h2')),
    );
  });

  it('should call handleUpdateHeaderSize when size is changed', async () => {
    const handleComponentChange = jest.fn();
    await render({ handleComponentChange, size: 'h4' });

    const h2Select = await screen.findByText(textMock('ux_editor.modal_header_type_h2'));

    fireEvent.click(h2Select);

    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      itemType: 'COMPONENT',
      type: ComponentType.Header,
      textResourceBindings: {
        title: 'ServiceName',
      },
      size: 'h2',
      dataModelBindings: {},
    });
  });
});
