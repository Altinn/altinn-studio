import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ThreeDotsMenuProps } from './ThreeDotsMenu';
import { ThreeDotsMenu } from './ThreeDotsMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';

const localChangesModalMockTestId = 'LocalChangesModal';

jest.mock(
  'app-shared/components/GiteaHeader/ThreeDotsMenu/LocalChangesModal/LocalChangesModal',
  () => ({
    LocalChangesModal: () => <div data-testid={localChangesModalMockTestId} />,
  }),
);

const defaultProps: ThreeDotsMenuProps = {
  isClonePossible: false,
};

describe('ThreeDotsMenu', () => {
  afterEach(jest.clearAllMocks);

  it('should show the menu items when open', async () => {
    const user = userEvent.setup();
    await renderThreeDotsMenu({ isClonePossible: true });

    const threeDotsMenu = screen.getByRole('button', { name: textMock('sync_header.gitea_menu') });
    expect(threeDotsMenu).toBeInTheDocument();

    await user.click(threeDotsMenu);
    const cloneText = screen.getByRole('button', { name: textMock('sync_header.clone') });
    expect(cloneText).toBeInTheDocument();

    const repoText = screen.getByRole('link', { name: textMock('sync_header.repository') });
    expect(repoText).toBeInTheDocument();

    const localchangeText = screen.getByRole('button', {
      name: textMock('sync_header.local_changes'),
    });
    expect(localchangeText).toBeInTheDocument();
  });

  it('should not show the clone option when onlyShowRepository is true', async () => {
    const user = userEvent.setup();
    await renderThreeDotsMenu();

    const threeDotsMenu = screen.getByRole('button', { name: textMock('sync_header.gitea_menu') });
    expect(threeDotsMenu).toBeInTheDocument();

    await user.click(threeDotsMenu);

    const cloneText = screen.queryByText(textMock('sync_header.clone'));
    expect(cloneText).not.toBeInTheDocument();
  });

  it('should render local changes modal', async () => {
    const user = userEvent.setup();
    await renderThreeDotsMenu();
    const threeDotsMenu = screen.getByRole('button', { name: textMock('sync_header.gitea_menu') });
    expect(threeDotsMenu).toBeInTheDocument();

    await user.click(threeDotsMenu);
    const localChangesText = screen.getByText(textMock('sync_header.local_changes'));
    await user.click(localChangesText);
    const localChangesModal = screen.getByTestId(localChangesModalMockTestId);
    expect(localChangesModal).toBeInTheDocument();
  });
});

const renderThreeDotsMenu = async (props: Partial<ThreeDotsMenuProps> = {}) => {
  return render(<ThreeDotsMenu {...defaultProps} {...props}></ThreeDotsMenu>);
};
