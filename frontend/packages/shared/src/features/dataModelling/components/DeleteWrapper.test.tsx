import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import type { IDeleteWrapper } from './DeleteWrapper';
import { DeleteWrapper } from './DeleteWrapper';
import { mockUseTranslation } from '../../../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

// Test data:
const deleteText = 'Delete';
const continueText = 'Continue';
const cancelText = 'Cancel';
const confirmText = 'Delete {schemaName}?';
const texts = {
  'administration.delete_model_confirm': confirmText,
  'general.delete_data_model': deleteText,
  'general.continue': continueText,
  'general.cancel': cancelText,
};
const deleteAction = jest.fn();
const schemaName = 'some-name';
const defaultProps: IDeleteWrapper = {
  deleteAction,
  schemaName
};

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation(texts) }),
);

const render = (props: Partial<IDeleteWrapper> = {}) =>
  rtlRender(<DeleteWrapper {...defaultProps} {...props} />);

describe('DeleteWrapper', () => {
  afterEach(jest.clearAllMocks);

  it('should not be able to open the delete dialog if no schemaName is set', async () => {
    const userWithNoPointerEventCheck = userEvent.setup({
      pointerEventsCheck: PointerEventsCheckLevel.Never,
    });
    render({ schemaName: undefined });
    expect(queryDeleteMessage()).not.toBeInTheDocument();
    await act(() => userWithNoPointerEventCheck.click(getDeleteButton()));
    expect(queryDeleteMessage()).not.toBeInTheDocument();
  });

  it('should open the delete dialog when clicking delete button and schemaName is set', async () => {
    render();
    expect(queryDeleteMessage()).not.toBeInTheDocument();
    await act(() => user.click(getDeleteButton()));
    expect(getDeleteMessage()).toBeInTheDocument();
  });

  it('should call deleteAction callback and close dialog when clicking continue button', async () => {
    render();
    await act(() => user.click(getDeleteButton()));
    await act(() => user.click(getContinueButton()));
    expect(deleteAction).toHaveBeenCalledTimes(1);
    expect(queryDeleteMessage()).not.toBeInTheDocument();
  });

  it('should close the delete dialog when clicking cancel', async () => {
    render();
    expect(queryDeleteMessage()).not.toBeInTheDocument();
    await act(() => user.click(getDeleteButton()));
    expect(getDeleteMessage()).toBeInTheDocument();
    await act(() => user.click(getCancelButton()));
    expect(queryDeleteMessage()).not.toBeInTheDocument();
  });
});

const getDeleteButton = () => screen.getByRole('button', { name: deleteText });
const getContinueButton = () => screen.getByRole('button', { name: continueText });
const getCancelButton = () => screen.getByRole('button', { name: cancelText });
const getDeleteMessage = () => screen.getByText(confirmText);
const queryDeleteMessage = () => screen.queryByText(confirmText);
