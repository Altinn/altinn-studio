import React from 'react';

import { render as rtlRender, screen } from '@testing-library/react';
import Router from 'react-router-dom';

import type { IHeaderContext } from './Header';
import { getOrgNameByUsername, Header, HeaderContext, SelectedContextType } from './Header';

const orgUsername = 'username1';
const orgFullName = 'Organization 1';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

describe('Header', () => {
  const orgProps = {
    avatar_url: 'avatar_url',
    description: 'description',
    id: 1,
    location: 'location',
    username: 'username1',
    website: 'website',
    full_name: 'full_name',
  };

  it(`should render org name when selected context is a org username`, () => {
    render({ selectedContext: orgUsername });
    expect(screen.getByText(orgFullName)).toBeInTheDocument();
  });

  Object.values(SelectedContextType).forEach((context) => {
    it(`should not render org name when selected context is ${context}`, () => {
      render({ selectedContext: context });
      expect(screen.queryByText(orgFullName)).not.toBeInTheDocument();
    });
  });

  describe('getOrgNameByUsername', () => {
    it('should return org name by username', () => {
      const orgs = [
        {
          ...orgProps,
          id: 1,
          full_name: 'full_name 1',
          username: 'username1',
        },
        {
          ...orgProps,
          id: 2,
          full_name: 'full_name 2',
          username: 'username2',
        },
      ];

      expect(getOrgNameByUsername('username1', orgs)).toBe('full_name 1');
      expect(getOrgNameByUsername('username2', orgs)).toBe('full_name 2');
    });

    it('should return username by username', () => {
      const orgs = [
        {
          ...orgProps,
          id: 1,
          full_name: 'full_name 1',
        },
        {
          ...orgProps,
          id: 2,
          full_name: undefined,
          username: 'username2',
        },
      ];

      expect(getOrgNameByUsername('username2', orgs)).toBe('username2');
    });

    it('should return undefined when no orgs are defined', () => {
      expect(getOrgNameByUsername('username2', undefined)).toBe(undefined);
    });
  });
});

const render = ({
  selectedContext = SelectedContextType.Self,
}: {
  selectedContext: string | SelectedContextType;
}) => {
  jest.spyOn(Router, 'useParams').mockReturnValue({ selectedContext });

  const orgProps = {
    avatar_url: 'avatar_url',
    description: 'description',
    id: 1,
    location: 'location',
    username: orgUsername,
    website: 'website',
    full_name: orgFullName,
  };

  const headerContextValue: IHeaderContext = {
    selectableOrgs: [{ ...orgProps }],
    user: {
      full_name: 'John Smith',
      avatar_url: 'avatar_url',
      login: 'login',
      email: '',
      id: 0,
      userType: 0,
    },
  };

  return rtlRender(
    <HeaderContext.Provider value={headerContextValue}>
      <Header />
    </HeaderContext.Provider>,
  );
};
