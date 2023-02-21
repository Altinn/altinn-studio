import React from 'react';
import { act } from 'react-dom/test-utils';
import { TopToolbar } from './TopToolbar';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';

const renderToolbar = (Toolbar: JSX.Element = <div></div>) => {
  const saveAction = jest.fn();
  const toggleEditMode = jest.fn();
  const user = userEvent.setup();
  act(() => {
    render(
      <TopToolbar
        Toolbar={Toolbar}
        saveAction={saveAction}
        editMode={true}
        toggleEditMode={toggleEditMode}
      />
    );
  });
  return { saveAction, toggleEditMode, user };
};

// Test data:
const editText = 'Edit';
const texts = {
  'schema_editor.edit_mode': editText,
}

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation(texts) }),
);

describe('TopToolbar', () => {
  test('renders the top toolbar', () => {
    renderToolbar();
    const topToolbar = screen.getByRole('toolbar');
    expect(topToolbar).toBeDefined();
  });

  test('handles a click on the save button', async () => {
    const { saveAction, user } = renderToolbar(<div></div>);
    const topToolbar = screen.getByRole('toolbar');
    expect(topToolbar).toBeDefined();
    const saveButton = screen.getByTestId('save-model-button');
    expect(saveButton).toBeDefined();
    await act(() => user.click(saveButton));
    expect(saveAction).toBeCalledTimes(1);
  });

  test('handles a click on the toggle edit mode button', async () => {
    const { toggleEditMode, user } = renderToolbar(<div></div>);
    const topToolbar = screen.getByRole('toolbar');
    expect(topToolbar).toBeDefined();
    const toggleEditModeButton = screen.getByText(editText);
    expect(toggleEditModeButton).toBeDefined();
    await act(() => user.click(toggleEditModeButton));
    expect(toggleEditMode).toBeCalledTimes(1);
  });
});
