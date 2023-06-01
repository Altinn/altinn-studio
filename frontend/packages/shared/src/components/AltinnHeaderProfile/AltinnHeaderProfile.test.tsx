import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { AltinnHeaderProfile, AltinnHeaderProfileProps } from './AltinnHeaderProfile';
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
      },
    });
    expect(screen.queryByText('test-user')).not.toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should render users name and name of org the user represents', () => {
    render({ org: 'test-org' });
    expect(screen.getByText(textMock('shared.header_user_for_org'))).toBeInTheDocument();
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
      },
      updated_at: 'never',
      user_has_starred: false,
    },
    user: {
      avatar_url: 'avatar_url',
      email: 'test@email.com',
      full_name: undefined,
      id: 1,
      login: 'test-user',
    },
  };

  return rtlRender(<AltinnHeaderProfile {...defaultProps} {...props} />);
};
