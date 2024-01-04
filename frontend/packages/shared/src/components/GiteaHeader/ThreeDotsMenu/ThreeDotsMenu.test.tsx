import React from 'react';
import { render as rtlRender, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThreeDotsMenu, ThreeDotsMenuProps } from './ThreeDotsMenu';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

const user = userEvent.setup();
const cloneTextMock = textMock('sync_header.clone');
const repositoryTextMock = textMock('dashboard.repository');
const localChangesTextMock = textMock('sync_header.local_changes');
const localChangesModalMock = 'LocalChangesModal';

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
    const threeDotsMenu = screen.getByText(textMock('sync_header.gitea_menu'));
    expect(threeDotsMenu).toBeInTheDocument();

    await act(() => user.click(threeDotsMenu));
    const cloneText = await screen.findByText(cloneTextMock);
    expect(cloneText).toBeInTheDocument();

    const repoText = await screen.findByText(repositoryTextMock);
    expect(repoText).toBeInTheDocument();

    const localchangeText = await screen.findByText(localChangesTextMock);
    expect(localchangeText).toBeInTheDocument();
  });

  it('should not show the clone option when onlyShowRepository is true', async () => {
    await render({ onlyShowRepository: true });

    const threeDotsMenu = screen.getByText(textMock('sync_header.gitea_menu'));
    expect(threeDotsMenu).toBeInTheDocument();

    await act(() => user.click(threeDotsMenu));

    const cloneText = screen.queryByText(cloneTextMock);
    expect(cloneText).not.toBeInTheDocument();
  });

  it('should render local changes modal', async () => {
    await render();
    const threeDotsMenu = screen.getByLabelText(textMock('sync_header.gitea_menu'));
    expect(threeDotsMenu).toBeInTheDocument();

    await act(() => user.click(threeDotsMenu));
    const localchangesText = await screen.findByText(localChangesTextMock);
    expect(localchangesText).toBeInTheDocument();

    await act(() => user.click(localchangesText));

    const localChangesModal = screen.getByTestId(localChangesModalMock);
    expect(localChangesModal).toBeInTheDocument();
  });
});

const render = async (props: Partial<ThreeDotsMenuProps> = {}) => {
  const allProps: ThreeDotsMenuProps = {
    onlyShowRepository: false,
    hasCloneModal: false,
    org: 'org',
    app: 'app',
    ...props,
  };

  return rtlRender(<ThreeDotsMenu {...allProps}></ThreeDotsMenu>);
};
