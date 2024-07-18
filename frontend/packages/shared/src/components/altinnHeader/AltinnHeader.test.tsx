import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import type { AltinnHeaderProps } from './AltinnHeader';
import { AltinnHeader } from './AltinnHeader';
import { Button } from '@digdir/designsystemet-react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RepositoryType } from 'app-shared/types/global';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import { MemoryRouter } from 'react-router-dom';
import type { AltinnButtonActionItem } from './types';
import { app, org } from '@studio/testing/testids';

const mockTo: string = '/test';
const mockMenuKey: TopBarMenu = TopBarMenu.About;
const mockAction: AltinnButtonActionItem = {
  menuKey: mockMenuKey,
  to: mockTo,
};

describe('AltinnHeader', () => {
  afterEach(jest.clearAllMocks);

  it('should render heading when provided', () => {
    render({ heading: 'Test heading' });
    expect(screen.getByRole('heading', { name: 'Test heading' })).toBeInTheDocument();
  });

  it('should not render heading when not provided', () => {
    render();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should render AltinnHeaderMenu when provided', () => {
    render({
      menuItems: [
        {
          key: TopBarMenu.Preview,
          link: 'Link1',
          repositoryTypes: [RepositoryType.App, RepositoryType.DataModels],
        },
      ],
    });
    expect(screen.getByRole('link', { name: textMock('top_menu.preview') })).toBeInTheDocument();
  });

  it('should not render AltinnHeaderMenu when not provided', () => {
    render();
    expect(screen.getAllByRole('link').length).toBe(1); // Only dashboard link
  });

  it('should render AltinnHeaderMenu with only data models menu item when repositoryType is data models', () => {
    render({
      menuItems: [
        {
          key: TopBarMenu.About,
          link: 'Link1',
          repositoryTypes: [RepositoryType.App, RepositoryType.DataModels],
        },
        {
          key: TopBarMenu.DataModel,
          link: 'Link2',
          repositoryTypes: [RepositoryType.DataModels],
        },
      ],
    });
    expect(screen.getByRole('link', { name: textMock(TopBarMenu.DataModel) })).toBeInTheDocument();
    expect(screen.queryByText(textMock('about'))).not.toBeInTheDocument();
  });

  it('should render AltinnHeaderButtons when buttonActions are provided', () => {
    render({
      buttonActions: [mockAction],
    });
    expect(screen.getByRole('link', { name: textMock(mockMenuKey) })).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toEqual(1); // Profile Menu
  });

  it('should not render AltinnHeaderButtons when buttonActions are not provided', () => {
    render();
    expect(screen.getAllByRole('button').length).toEqual(1); // Only profile menu
  });

  it('should render subMenu with provided subMenuContent when showSubMenu is true', () => {
    const subMenuContentText = 'subMenuContent';
    render({
      showSubMenu: true,
      subMenuContent: <Button>{subMenuContentText}</Button>,
    });
    expect(screen.getByRole('button', { name: subMenuContentText })).toBeInTheDocument();
  });

  it('should not render AltinnSubMenu when showSubMenu is false', () => {
    const subMenuContentText = 'subMenuContent';
    render({
      showSubMenu: false,
      subMenuContent: <Button>{subMenuContentText}</Button>,
    });
    expect(screen.queryByRole('button', { name: subMenuContentText })).not.toBeInTheDocument();
  });

  it('should render Deploy header button when repo is owned by an org', () => {
    render({
      repoOwnerIsOrg: true,
      buttonActions: [mockAction],
    });
    expect(screen.getByRole('link', { name: textMock(mockMenuKey) })).toBeInTheDocument();
  });

  it('should not render Deploy header button when repo is owned by a private person', () => {
    render({
      repoOwnerIsOrg: false,
      buttonActions: [mockAction],
    });
    expect(
      screen.queryByRole('button', { name: textMock(TopBarMenu.Deploy) }),
    ).not.toBeInTheDocument();
  });
});

const render = (props: Partial<AltinnHeaderProps> = {}) => {
  const defaultProps: AltinnHeaderProps = {
    menuItems: [],
    showSubMenu: true,
    subMenuContent: null,
    app,
    org,
    user: {
      avatar_url: '',
      email: 'test@email.com',
      full_name: 'Test Testesen',
      id: 1,
      login: 'username',
      userType: 0,
    },
    repository: {
      clone_url: 'clone_url',
      description: 'description',
      full_name: 'Test App',
      html_url: 'html_url',
      id: 1,
      is_cloned_to_local: false,
      name: app,
      owner: {
        avatar_url: 'avatar_url',
        full_name: 'Test Org',
        login: org,
        email: 'test-email',
        id: 1,
        userType: 1,
      },
      updated_at: 'never',
      created_at: 'now',
      permissions: {
        pull: true,
        push: true,
        admin: true,
      },
      default_branch: 'master',
      private: false,
      empty: false,
      size: 1,
      fork: false,
      forks_count: 0,
      mirror: false,
      open_issues_count: 0,
      watchers_count: 0,
      repositoryCreatedStatus: 1,
      ssh_url: 'ssh_url',
      stars_count: 0,
      website: 'website',
    },
    buttonActions: [],
  };

  return rtlRender(
    <MemoryRouter>
      <AltinnHeader {...defaultProps} {...props} />
    </MemoryRouter>,
  );
};
