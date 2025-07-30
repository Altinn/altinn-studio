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

describe('MergeConflict', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should reset changes when reset button is clicked', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: jest.fn() },
    });
    const user = userEvent.setup();
    renderMergeConflict();

    const resetChangesButton = await screen.findByRole('button', {
      name: textMock('merge_conflict.remove_my_changes'),
    });
    await user.click(resetChangesButton);

    expect(window.location.reload).toHaveBeenCalled();
  });
});

const renderMergeConflict = () => {
  return render(
    <MemoryRouter>
      <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
        <MergeConflict org='ttd' repo={repoName} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
