import React, { useRef } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { MergeConflictModal } from './MergeConflictModal';

const repoName = 'ttd-resources';
const mockButtonText: string = 'Mock Button';
const originalWindowLocation = window.location;

describe('MergeConflictModal', () => {
  beforeEach(() => {
    delete window.location;
    window.location = {
      ...originalWindowLocation,
      reload: jest.fn(),
    };
  });
  afterEach(() => {
    jest.clearAllMocks();
    window.location = originalWindowLocation;
  });

  it('should reset changes when reset button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const resetChangesButton = await screen.findByRole('button', {
      name: textMock('merge_conflict.remove_my_changes'),
    });
    await user.click(resetChangesButton);

    expect(window.location.reload).toHaveBeenCalled();
  });
});

const renderMergeConflictModal = () => {
  return render(
    <MemoryRouter>
      <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
        <TestComponentWithButton />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

const renderAndOpenModal = async (user: UserEvent) => {
  renderMergeConflictModal();

  const openModalButton = screen.getByRole('button', { name: mockButtonText });
  await user.click(openModalButton);
};

const TestComponentWithButton = () => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.showModal()}>{mockButtonText}</button>
      <MergeConflictModal ref={modalRef} org='ttd' repo={repoName} />
    </>
  );
};
