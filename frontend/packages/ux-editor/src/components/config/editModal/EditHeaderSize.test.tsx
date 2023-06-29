import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { EditHeaderSize } from './EditHeaderSize';
import { renderWithMockStore } from '../../../testing/mocks';
import { mockUseTranslation } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';

const h4Text = 'Undertittel (H4)';
const h3Text = 'Undertittel (H3)';
const h2Text = 'Undertittel (H2)';

jest.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation({
    'ux_editor.modal_header_type_h4': h4Text,
    'ux_editor.modal_header_type_h3': h3Text,
    'ux_editor.modal_header_type_h2': h2Text,
  })
}));

const getComboBox = () => screen.getByRole('combobox', { name: 'ux_editor.modal_header_type_helper' });
const getComboBoxValue = () => getComboBox().getAttribute("value");

const render = async ({ size = undefined, handleComponentChange = jest.fn() } = {}) => {
  renderWithMockStore()(
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
  await waitFor(getComboBox);
};

describe('HeaderSizeSelect', () => {
  it('should show selected title size as h4 when no size is set', () => {
    render();

    expect(getComboBoxValue()).toBe(h4Text);
  });

  it('should show selected title size as h4 when "h4" size is set', () => {
    render({ size: 'h4' });

    expect(getComboBoxValue()).toBe(h4Text);
  });

  it('should show selected title size as h4 when "S" size is set', () => {
    render({ size: 'S' });

    expect(getComboBoxValue()).toBe(h4Text);
  });

  it('should show selected title size as h3 when "h3" size is set', () => {
    render({ size: 'h3' });

    expect(getComboBoxValue()).toBe(h3Text);
  });

  it('should show selected title size as h3 when "M" size is set', () => {
    render({ size: 'M' });

    expect(getComboBoxValue()).toBe(h3Text);
  });

  it('should show selected title size as h2 when "h2" size is set', () => {
    render({ size: 'h2' });

    expect(getComboBoxValue()).toBe(h2Text);
  });

  it('should show selected title size as h2 when "L" size is set', () => {
    render({ size: 'L' });

    expect(getComboBoxValue()).toBe(h2Text);
  });

  it('should call handleUpdateHeaderSize when size is changed', () => {
    const handleComponentChange = jest.fn();
    render({ handleComponentChange, size: 'h4' });

    const h2Select = screen.getByText(h2Text);

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
