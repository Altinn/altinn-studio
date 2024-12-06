import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import userEvent from '@testing-library/user-event';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { LocalChangesModal } from './LocalChangesModal';

// Test data:
const org = 'org';
const app = 'app';
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => {
    return { org, app };
  },
}));

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

  it('Closes both dialogs when the deletion is done', async () => {
    const user = userEvent.setup();
    renderLocalChangesModal();
    await user.click(getPrimaryModalTrigger());
    await user.click(getSecondaryModalTrigger());
    await user.type(getDeleteTextfield(), app);
    await user.click(getFinalDeleteButton());
    expect(queryDialog()).toBeNull();
  });
});

const renderLocalChangesModal = () =>
  render(
    <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
      <LocalChangesModal />
    </ServicesContextProvider>,
  );

const queryDialog = () => screen.queryByRole('dialog');
const getAllDialogs = () => screen.getAllByRole('dialog');

const getPrimaryModalTrigger = () => getButton(primaryModalTriggerName);
const getSecondaryModalTrigger = () => getButton(secondaryModalTriggerName);
const getFinalDeleteButton = () => getButton(finalDeleteButtonName);
const getButton = (name: string) => screen.getByRole('button', { name });

const getDeleteTextfield = () => getTextfield(deleteTextfieldLabel);
const getTextfield = (name: string) => screen.getByRole('textbox', { name });

const primaryModalTriggerName = textMock('sync_header.local_changes');
const secondaryModalTriggerName = textMock('local_changes.modal_delete_button');
const finalDeleteButtonName = textMock('local_changes.modal_confirm_delete_button');
const deleteTextfieldLabel = textMock('local_changes.modal_delete_modal_textfield_label');
