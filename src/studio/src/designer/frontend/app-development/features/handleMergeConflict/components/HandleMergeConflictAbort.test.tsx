import React from 'react';
import { HandleMergeConflictAbort } from './HandleMergeConflictAbort';
import { render, screen } from '@testing-library/react';
import * as networking from 'app-shared/utils/networking';
import userEvent from '@testing-library/user-event';
import { UserEvent } from '@testing-library/user-event/setup/setup';

const renderHandleMergeConflictAbort = () => {
  const user = userEvent.setup();
  const container = render(<HandleMergeConflictAbort language={{}} />);
  return { user, container };
};

// find and click the button that opens the popover
const findAndClickOpenPopoverButton = (user: UserEvent) =>
  user.click(
    screen.getByRole('button', {
      name: 'handle_merge_conflict.abort_merge_button',
    }),
  );

afterEach(() => jest.restoreAllMocks());
jest.mock('app-shared/utils/networking', () => ({
  __esModule: true,
  ...jest.requireActual('app-shared/utils/networking'),
}));

test('should handle successfully returned data from API', async () => {
  // Setting up som mocks and stubs and renders the component
  const { user } = renderHandleMergeConflictAbort();

  const mockGet = jest
    .spyOn(networking, 'get')
    .mockImplementationOnce(() => Promise.resolve({}));

  // the popover should be closed at this point
  expect(screen.queryByRole('presentation')).toBeNull();

  // find and click the button that opens the popover
  await findAndClickOpenPopoverButton(user);

  // The popover should be open at this point
  expect(screen.getByRole('presentation')).toBeDefined();

  // Expect discard button to exist and click it
  const abortMergeButtonCancel = screen.getByRole('button', {
    name: 'handle_merge_conflict.abort_merge_button_cancel',
  });
  expect(abortMergeButtonCancel).toBeDefined();
  await user.click(abortMergeButtonCancel);

  // the popover should be closed at this point
  expect(screen.queryByRole('presentation')).toBeNull();

  // find and click the button that opens the popover again
  await findAndClickOpenPopoverButton(user);

  // the popover should be open at this point
  expect(screen.queryByRole('presentation')).toBeDefined();

  // Expect the abort merge button to exists and click it
  const abortMergeButtonConfirm = screen.getByRole('button', {
    name: 'handle_merge_conflict.abort_merge_button_confirm',
  });
  expect(abortMergeButtonConfirm).toBeDefined();

  expect(mockGet).not.toHaveBeenCalled();

  // creating a mock for the return value
  await user.click(abortMergeButtonConfirm);
  // the mock get function should have been called
  expect(mockGet).toHaveBeenCalled();
});

test('should handle unsuccessfully returned data from API', async () => {
  const { user } = renderHandleMergeConflictAbort();

  // Mocks
  const mockGet = jest
    .spyOn(networking, 'get')
    .mockImplementationOnce(() => Promise.reject('Error'));
  const consoleError = jest
    .spyOn(console, 'error')
    .mockImplementation(() => ({}));

  // find and click the button that opens the popover
  await findAndClickOpenPopoverButton(user);
  const abortMergeButtonConfirm = screen.getByRole('button', {
    name: 'handle_merge_conflict.abort_merge_button_confirm',
  });
  // Click the confirm button
  await user.click(abortMergeButtonConfirm);

  // Expect functions to be called
  expect(mockGet).toHaveBeenCalled();

  // Resolve mocked networking (Really? is this the way this works?)
  expect(consoleError).toHaveBeenCalled();
});

test('should catch error from networked function', async () => {
  const { user } = renderHandleMergeConflictAbort();

  const mockGet = jest
    .spyOn(networking, 'get')
    .mockImplementation(() => Promise.reject(Error('mocked error')));
  const consoleError = jest
    .spyOn(console, 'error')
    .mockImplementation(() => ({}));

  // find and click the button that opens the popover
  await findAndClickOpenPopoverButton(user);
  const abortMergeButtonConfirm = screen.getByRole('button', {
    name: 'handle_merge_conflict.abort_merge_button_confirm',
  });
  // Click the confirm button
  await user.click(abortMergeButtonConfirm);
  expect(mockGet).toHaveBeenCalled();

  // Expect console.error to be called.
  expect(consoleError).toHaveBeenCalled();
});
