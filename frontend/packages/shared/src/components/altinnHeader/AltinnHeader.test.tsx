import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { AltinnHeader, AltinnHeaderProps } from './AltinnHeader';
import { Button } from '@digdir/design-system-react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { RepositoryType } from 'app-shared/types/global';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import { MemoryRouter } from 'react-router-dom';

describe('AltinnHeader', () => {
  it('should render AltinnHeaderMenu', () => {
    render({
      menuItems: [
        {
          key: TopBarMenu.About,
          link: RoutePaths.Overview,
          repositoryTypes: [RepositoryType.App, RepositoryType.Datamodels],
        },
      ],
    });
    expect(screen.getByTitle('Altinn logo')).toBeInTheDocument();
  });

  it('should render AltinnHeaderButtons when buttonActions are provided', () => {
    render({
      buttonActions: [
        {
          buttonVariant: 'tertiary',
          headerButtonsClasses: undefined,
          menuKey: 'test-button',
          title: 'TestButton',
          handleClick: jest.fn(),
        },
      ],
    });
    expect(screen.getByRole('button', { name: textMock('TestButton') })).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toEqual(2); // TestButton + Profile Menu
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
});

const render = (props: Partial<AltinnHeaderProps> = {}) => {
  const defaultProps: AltinnHeaderProps = {
    menuItems: [],
    showSubMenu: true,
    subMenuContent: null,
    app: 'test-app',
    org: 'test-org',
    user: {
      avatar_url: '',
      email: 'test@email.com',
      full_name: 'Test Testesen',
      id: 1,
      login: 'username',
    },
    repository: {
      clone_url: 'clone_url',
      description: 'description',
      full_name: 'Test App',
      html_url: 'html_url',
      id: 1,
      is_cloned_to_local: false,
      name: 'test-app',
      owner: {
        avatar_url: 'avatar_url',
        full_name: 'Test Org',
        login: 'test-org',
        email: 'test-email',
        id: 1,
        UserType: 1,
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
