import React from 'react';
import { renderWithProviders } from '../../../../../testing/mocks';
import { FormItemTitle } from './FormItemTitle';
import type { FormComponent } from '../../../../../types/FormComponent';
import { componentMocks } from '../../../../../testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { type FormContainer } from '../../../../../types/FormContainer';
import { ComponentType } from 'app-shared/types/ComponentType';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mocks:
const mockDeleteItem = jest.fn();
jest.mock('./useDeleteItem', () => ({
  useDeleteItem: () => mockDeleteItem,
}));

describe('FormItemTitle', () => {
  afterEach(jest.clearAllMocks);

  it('Renders children', () => {
    const component = componentMocks[ComponentType.Input];
    const label = 'Test label';

    render(component, label);
    expect(screen.getByText('Test label')).toBeInTheDocument();
  });

  it('Calls deleteItem with item id when delete button is clicked and deletion is confirmed', async () => {
    // Test data
    const component = componentMocks[ComponentType.Input];
    const label = 'Test label';

    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));

    render(component, label);

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));

    expect(mockDeleteItem).toHaveBeenCalledTimes(1);
    expect(mockDeleteItem).toHaveBeenCalledWith(component.id);
  });

  it('Does not call deleteItem when delete button is clicked, but deletion is not confirmed', async () => {
    const component = componentMocks[ComponentType.Input];
    const label = 'Test label';

    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => false));
    render(component, label);

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));

    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it('should prompt the user for confirmation before deleting the component', async () => {
    const component = componentMocks[ComponentType.Input];
    const label = 'Test label';

    const user = userEvent.setup();
    const mockedConfirm = jest.fn(() => true);
    jest.spyOn(window, 'confirm').mockImplementation(mockedConfirm);

    render(component, label);

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(mockedConfirm).toBeCalledWith(textMock('ux_editor.component_deletion_text'));
  });

  it('should prompt the user for confirmation before deleting the container component and its children', async () => {
    const groupComponent = componentMocks[ComponentType.Group];
    const label = 'Test label';

    const user = userEvent.setup();
    const mockedConfirm = jest.fn(() => true);
    jest.spyOn(window, 'confirm').mockImplementation(mockedConfirm);

    render(groupComponent, label);

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(mockedConfirm).toBeCalledWith(textMock('ux_editor.component_group_deletion_text'));
  });
});

const render = (formItem: FormComponent | FormContainer, label: string) =>
  renderWithProviders(<FormItemTitle formItem={formItem}>{label}</FormItemTitle>);
