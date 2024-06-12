import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavoriteButton } from './FavoriteButton';
import { repository } from 'app-shared/mocks/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const setStarredRepo = jest.fn();
const unsetStarredRepo = jest.fn();

jest.mock('../../hooks/mutations', () => ({
  useSetStarredRepoMutation: () => ({
    mutate: setStarredRepo,
  }),
  useUnsetStarredRepoMutation: () => ({
    mutate: unsetStarredRepo,
  }),
}));

describe('FavoriteButton', () => {
  it('renders star button and calls setStarredRepo when star button is clicked', async () => {
    const user = userEvent.setup();
    render(<FavoriteButton repo={{ ...repository, hasStarred: false }} />);

    await user.click(
      screen.getByRole('button', {
        name: textMock('dashboard.star', { appName: repository.name }),
      }),
    );
    expect(setStarredRepo).toHaveBeenCalled();
  });

  it('renders unstar button and calls unsetStarredRepo when unstar button is clicked', async () => {
    const user = userEvent.setup();
    render(<FavoriteButton repo={{ ...repository, hasStarred: true }} />);

    await user.click(
      screen.getByRole('button', {
        name: textMock('dashboard.unstar', { appName: repository.name }),
      }),
    );
    expect(unsetStarredRepo).toHaveBeenCalled();
  });
});
