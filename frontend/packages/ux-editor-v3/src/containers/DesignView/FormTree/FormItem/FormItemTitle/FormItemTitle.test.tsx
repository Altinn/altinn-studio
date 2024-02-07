import React from 'react';
import { renderWithMockStore } from '../../../../../testing/mocks';
import { FormItemTitle } from './FormItemTitle';
import type { FormComponent } from '../../../../../types/FormComponent';
import { componentMocks } from '../../../../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { screen } from '@testing-library/react';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';

// Test data:
const item: FormComponent = componentMocks[ComponentType.Input];
const label = 'Test label';

// Mocks:
const mockDeleteItem = jest.fn();
jest.mock('./useDeleteItem', () => ({
  useDeleteItem: () => mockDeleteItem,
}));

describe('FormItemTitle', () => {
  afterEach(jest.clearAllMocks);

  it('Renders children', () => {
    render();
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('Calls deleteItem with item id when delete button is clicked and deletion is confirmed', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));
    render();
    await screen.getByRole('button', { name: textMock('general.delete') }).click();
    expect(mockDeleteItem).toHaveBeenCalledTimes(1);
    expect(mockDeleteItem).toHaveBeenCalledWith(item.id);
  });

  it('Does not call deleteItem when delete button is clicked, but deletion is not confirmed', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => false));
    render();
    await screen.getByRole('button', { name: textMock('general.delete') }).click();
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });
});

const render = () => renderWithMockStore()(<FormItemTitle formItem={item}>{label}</FormItemTitle>);
