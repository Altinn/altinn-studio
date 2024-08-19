import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ThreeDotsMenuProps } from './ThreeDotsMenu';
import { ThreeDotsMenu } from './ThreeDotsMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from "app-shared/contexts/ServicesContext";
import { queriesMock } from "app-shared/mocks/queriesMock";
import type { QueryClient } from "@tanstack/react-query";
import { createQueryClientMock } from "app-shared/mocks/queryClientMock";
import { ServicesContextProvider } from "app-shared/contexts/ServicesContext";

const defaultProps: ThreeDotsMenuProps = {
  isClonePossible: false,
};

describe('ThreeDotsMenu', () => {
  afterEach(jest.clearAllMocks);

  it('should show the menu items when open', async () => {
    const user = userEvent.setup();
    await renderThreeDotsMenu({ isClonePossible: true });
    await user.click(getGiteaMenuButton());
    expect(getCloneButton()).toBeInTheDocument();
    expect(getRepositoryLink()).toBeInTheDocument();
    expect(getLocalChangesButton()).toBeInTheDocument();
  });

  it('should not show the clone option when onlyShowRepository is true', async () => {
    const user = userEvent.setup();
    await renderThreeDotsMenu();
    await user.click(getGiteaMenuButton());
    expect(queryCloneButton()).not.toBeInTheDocument();
  });

  it('should render local changes modal', async () => {
    const user = userEvent.setup();
    await renderThreeDotsMenu();
    await user.click(getGiteaMenuButton());
    await user.click(getLocalChangesButton());
    expect(getLocalChangesHeading()).toBeInTheDocument();
  });
});

const renderThreeDotsMenu = (
  props: Partial<ThreeDotsMenuProps> = {},
  allQueries: Partial<ServicesContextProps> = queriesMock,
  queryClient: QueryClient = createQueryClientMock(),
) => render(
  <ServicesContextProvider {...allQueries} client={queryClient}>
    <ThreeDotsMenu {...defaultProps} {...props}/>
  </ServicesContextProvider>
);

const getCloneButton = () => getButton(cloneButtonName);
const getLocalChangesButton = () => getButton(localChangesButtonName);
const getGiteaMenuButton = () => getButton(giteaMenuButtonName);
const getButton = (name: string) => screen.getByRole('button', { name });

const queryCloneButton = () => queryButton(cloneButtonName);
const queryButton = (name: string) => screen.queryByRole('button', { name });

const getRepositoryLink = () => getLink(repositoryLinkName);
const getLink = (name: string) => screen.getByRole('link', { name });

const getLocalChangesHeading = () => getHeading(localChangesHeading);
const getHeading = (name: string) => screen.getByRole('heading', { name });

const giteaMenuButtonName = textMock('sync_header.gitea_menu');
const cloneButtonName = textMock('sync_header.clone');
const localChangesButtonName = textMock('sync_header.local_changes');
const repositoryLinkName = textMock('sync_header.repository');
const localChangesHeading = textMock('sync_header.local_changes');
