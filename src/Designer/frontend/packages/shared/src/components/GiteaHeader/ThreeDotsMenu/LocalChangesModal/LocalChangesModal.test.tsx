import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { LocalChangesModal } from './LocalChangesModal';
import { renderWithProviders } from '../../mocks/renderWithProviders';

describe('LocalChanges', () => {
  afterEach(jest.clearAllMocks);

  it('Does not display any dialog by default', () => {
    renderLocalChangesModal();
    expect(queryDialog()).toBeNull();
  });

  it('Opens the primary dialog when the first trigger button is clicked', async () => {
    const user = userEvent.setup();
    renderLocalChangesModal();
    await user.click(getPrimaryModalTrigger());
    expect(getAllDialogs()).toHaveLength(1);
  });

  it('Opens the secondary dialog when the second trigger button is clicked', async () => {
    const user = userEvent.setup();
    renderLocalChangesModal();
    await user.click(getPrimaryModalTrigger());
    await user.click(getSecondaryModalTrigger());
    expect(getAllDialogs()).toHaveLength(2);
  });
});

const renderLocalChangesModal = () => renderWithProviders()(<LocalChangesModal />);

const queryDialog = () => screen.queryByRole('dialog');
const getAllDialogs = () => screen.getAllByRole('dialog');

const getPrimaryModalTrigger = () => getButton(primaryModalTriggerName);
const getSecondaryModalTrigger = () => getButton(secondaryModalTriggerName);
const getButton = (name: string) => screen.getByRole('button', { name });

const primaryModalTriggerName = textMock('sync_header.local_changes');
const secondaryModalTriggerName = textMock('local_changes.modal_delete_button');
