import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ThreeDotsMenuProps } from './ThreeDotsMenu';
import { ThreeDotsMenu } from './ThreeDotsMenu';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

const user = userEvent.setup();
const threeDotsButtonMock = textMock('sync_header.gitea_menu');
const cloneTextMock = textMock('sync_header.clone');
const repositoryTextMock = textMock('sync_header.repository');
const localChangesTextMock = textMock('sync_header.local_changes');
const localChangesModalMock = 'LocalChangesModal';
import { app, org } from '@studio/testing/testids';

jest.mock(
  'app-shared/components/GiteaHeader/ThreeDotsMenu/LocalChangesModal/LocalChangesModal',
  () => ({
    LocalChangesModal: () => <div data-testid={localChangesModalMock} />,
  }),
);

describe('ThreeDotsMenu', () => {
  afterEach(jest.clearAllMocks);

  it('should show the menu items when open', async () => {
    await render();
    const threeDotsMenu = screen.getByRole('button', { name: threeDotsButtonMock });
    expect(threeDotsMenu).toBeInTheDocument();

    await user.click(threeDotsMenu);
    const cloneText = screen.getByRole('button', { name: cloneTextMock });
    expect(cloneText).toBeInTheDocument();

    const repoText = screen.getByRole('link', { name: repositoryTextMock });
    expect(repoText).toBeInTheDocument();

    const localchangeText = screen.getByRole('button', { name: localChangesTextMock });
    expect(localchangeText).toBeInTheDocument();
  });

  it('should not show the clone option when onlyShowRepository is true', async () => {
    await render({ onlyShowRepository: true });

    const threeDotsMenu = screen.getByRole('button', { name: threeDotsButtonMock });
    expect(threeDotsMenu).toBeInTheDocument();

    await user.click(threeDotsMenu);

    const cloneText = screen.queryByText(cloneTextMock);
    expect(cloneText).not.toBeInTheDocument();
  });

  it('should render local changes modal', async () => {
    await render();
    const threeDotsMenu = screen.getByRole('button', { name: threeDotsButtonMock });
    expect(threeDotsMenu).toBeInTheDocument();

    await user.click(threeDotsMenu);
    const localChangesText = screen.getByText(localChangesTextMock);
    await user.click(localChangesText);
    const localChangesModal = screen.getByTestId(localChangesModalMock);
    expect(localChangesModal).toBeInTheDocument();
  });
});

const render = async (props: Partial<ThreeDotsMenuProps> = {}) => {
  const allProps: ThreeDotsMenuProps = {
    onlyShowRepository: false,
    hasCloneModal: false,
    org,
    app,
    ...props,
  };

  return rtlRender(<ThreeDotsMenu {...allProps}></ThreeDotsMenu>);
};
