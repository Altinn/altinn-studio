import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { MergeConflict } from './MergeConflict';

const repoName = 'ttd-resources';

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
    renderMergeConflictModal();

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
        <MergeConflict org='ttd' repo={repoName} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
