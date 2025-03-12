import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ThreeDotsMenuProps } from './ThreeDotsMenu';
import { ThreeDotsMenu } from './ThreeDotsMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../mocks/renderWithProviders';

const defaultProps: ThreeDotsMenuProps = {
  isClonePossible: false,
};

describe('ThreeDotsMenu', () => {
  afterEach(jest.clearAllMocks);

  it('should show the menu items when open', async () => {
    const user = userEvent.setup();
    renderThreeDotsMenu({ isClonePossible: true });
    await user.click(getGiteaMenuButton());
    expect(getCloneButton()).toBeInTheDocument();
    expect(getRepositoryLink()).toBeInTheDocument();
    expect(getLocalChangesButton()).toBeInTheDocument();
  });

  it('should not show the clone option when onlyShowRepository is true', async () => {
    const user = userEvent.setup();
    renderThreeDotsMenu();
    await user.click(getGiteaMenuButton());
    expect(queryCloneButton()).not.toBeInTheDocument();
  });

  it('should render local changes modal', async () => {
    const user = userEvent.setup();
    renderThreeDotsMenu();
    await user.click(getGiteaMenuButton());
    await user.click(getLocalChangesButton());
    expect(getLocalChangesHeading()).toBeInTheDocument();
  });

  it('Reopens the local changes modal when the user clicks the button after having closed it', async () => {
    const user = userEvent.setup();
    renderThreeDotsMenu();
    await user.click(getGiteaMenuButton());
    await user.click(getLocalChangesButton());
    expect(getLocalChangesHeading()).toBeInTheDocument();
    await user.click(getCloseLocalChangesButton());
    expect(queryLocalChangesHeading()).not.toBeInTheDocument();
    await user.click(getLocalChangesButton());
    expect(getLocalChangesHeading()).toBeInTheDocument();
  });
});

const renderThreeDotsMenu = (props: Partial<ThreeDotsMenuProps> = {}) =>
  renderWithProviders()(<ThreeDotsMenu {...defaultProps} {...props} />);

const getCloneButton = () => getButton(cloneButtonName);
const getLocalChangesButton = () => getButton(localChangesButtonName);
const getGiteaMenuButton = () => getButton(giteaMenuButtonName);
const getCloseLocalChangesButton = () => getButton(closeLocalChangesButtonName);
const getButton = (name: string) => screen.getByRole('button', { name });

const queryCloneButton = () => queryButton(cloneButtonName);
const queryButton = (name: string) => screen.queryByRole('button', { name });

const getRepositoryLink = () => getLink(repositoryLinkName);
const getLink = (name: string) => screen.getByRole('link', { name });

const getLocalChangesHeading = () => getHeading(localChangesHeading);
const getHeading = (name: string) => screen.getByRole('heading', { name });

const queryLocalChangesHeading = () => queryHeading(localChangesHeading);
const queryHeading = (name: string) => screen.queryByRole('heading', { name });

const giteaMenuButtonName = textMock('sync_header.gitea_menu');
const cloneButtonName = textMock('sync_header.clone');
const localChangesButtonName = textMock('sync_header.local_changes');
const repositoryLinkName = textMock('sync_header.repository');
const localChangesHeading = textMock('sync_header.local_changes');
const closeLocalChangesButtonName = 'close modal'; // Todo: Replace with textMock('sync_header.close_local_changes_button') when https://github.com/digdir/designsystemet/issues/2195 is fixed
