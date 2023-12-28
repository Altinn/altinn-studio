import React from 'react';
import { render as rtlRender, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThreeDotsMenu, ThreeDotsMenuProps } from './ThreeDotsMenu';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

const user = userEvent.setup();
const cloneTextMock = textMock('sync_header.clone');
const repositoryTextMock = textMock('dashboard.repository');
const localChangesTextMock = textMock('dashboard.local_changes');

jest.mock(
  'app-shared/components/GiteaHeader/ThreeDotsMenu/LocalChangesModal/LocalChangesModal',
  () => ({
    LocalChangesModal: jest.fn().mockReturnValue(null),
  }),
);

describe('ThreeDotsMenu', () => {
  afterEach(jest.clearAllMocks);

  it('should show the menu items when open', async () => {
    await render();
    const threeDotsMenu = screen.getByLabelText('Gitea menu');
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

    const threeDotsMenu = screen.getByLabelText('Gitea menu');
    expect(threeDotsMenu).toBeInTheDocument();

    await act(() => user.click(threeDotsMenu));

    const cloneText = screen.queryByText(cloneTextMock);
    expect(cloneText).not.toBeInTheDocument();
  });

  it('should local changes be in document when setLocalChangesModalIsOpen and it is clicked', async () => {
    await render({ localChangesModalIsOpen: true } as Partial<ThreeDotsMenuProps>);
    const threeDotsMenu = screen.getByLabelText('Gitea menu');
    expect(threeDotsMenu).toBeInTheDocument();

    await act(() => user.click(threeDotsMenu));
    const localchangeText = await screen.findByText(localChangesTextMock);
    expect(localchangeText).toBeInTheDocument();

    await act(() => user.click(localchangeText));
    const localChangesModal = await screen.findByText(localChangesTextMock);
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
