import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import type { AltinnHeaderProfileProps } from './AltinnHeaderProfile';
import { AltinnHeaderProfile } from './AltinnHeaderProfile';
import { textMock } from '../../../../../testing/mocks/i18nMock';

describe('AltinnHeaderProfile', () => {
  it('should render users name if user and org are the same', () => {
    render({ org: 'test-user' });
    expect(screen.getByText('test-user')).toBeInTheDocument();
  });

  it('should render users full name if it exists', () => {
    render({
      org: 'test-user',
      user: {
        avatar_url: 'avatar_url',
        email: 'test@email.com',
        full_name: 'Test User',
        id: 1,
        login: 'test-user',
        userType: 0,
      },
    });
    expect(screen.queryByText('test-user')).not.toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should render users name and name of org the user represents', () => {
    render({ org: 'test-org' });
    expect(
      screen.getByText(
        textMock('shared.header_user_for_org', { user: 'test-user', org: 'Test Org' }),
      ),
    ).toBeInTheDocument();
  });
});

export const render = (props?: Partial<AltinnHeaderProfileProps>) => {
  const defaultProps: AltinnHeaderProfileProps = {
    org: 'test-org',
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
    user: {
      avatar_url: 'avatar_url',
      email: 'test@email.com',
      full_name: undefined,
      id: 1,
      login: 'test-user',
      userType: 0,
    },
  };

  return rtlRender(<AltinnHeaderProfile {...defaultProps} {...props} />);
};
