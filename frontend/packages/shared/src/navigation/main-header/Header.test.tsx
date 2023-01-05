import React from 'react';

import { render as rtlRender, screen } from '@testing-library/react';

import type { IHeaderContext } from './Header';
import { getOrgNameById, Header, HeaderContext, SelectedContextType } from './Header';

const orgId = 1;
const orgFullName = 'Organization 1';

describe('Header', () => {
  const orgProps = {
    avatar_url: 'avatar_url',
    description: 'description',
    id: 1,
    location: 'location',
    username: 'username',
    website: 'website',
    full_name: 'full_name',
  };

  it(`should render org name when selected context is a org id`, () => {
    render({ selectedContext: orgId });

    expect(screen.getByTestId('Header-org-name')).toBeInTheDocument();
    expect(screen.getByText(orgFullName)).toBeInTheDocument();
  });

  Object.values(SelectedContextType).forEach((context) => {
    it(`should not render org name when selected context is ${context}`, () => {
      render({ selectedContext: context });

      expect(screen.queryByTestId('Header-org-name')).not.toBeInTheDocument();
      expect(screen.queryByText(orgFullName)).not.toBeInTheDocument();
    });
  });

  describe('getOrgNameById', () => {
    it('should return org name by id', () => {
      const orgs = [
        {
          ...orgProps,
          id: 1,
          full_name: 'full_name 1',
        },
        {
          ...orgProps,
          id: 2,
          full_name: 'full_name 2',
        },
      ];

      expect(getOrgNameById(1, orgs)).toBe('full_name 1');
      expect(getOrgNameById(2, orgs)).toBe('full_name 2');
    });

    it('should return username by id', () => {
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
          username: 'username 2',
        },
      ];

      expect(getOrgNameById(2, orgs)).toBe('username 2');
    });

    it('should return undefined when no orgs are defined', () => {
      expect(getOrgNameById(2, undefined)).toBe(undefined);
    });
  });
});

const render = ({
  selectedContext = SelectedContextType.Self,
}: Pick<IHeaderContext, 'selectedContext'>) => {
  const orgProps = {
    avatar_url: 'avatar_url',
    description: 'description',
    id: orgId,
    location: 'location',
    username: 'username',
    website: 'website',
    full_name: orgFullName,
  };

  const headerContextValue = {
    selectableOrgs: [{ ...orgProps }],
    selectedContext,
    setSelectedContext: jest.fn(),
    user: {
      full_name: 'John Smith',
      avatar_url: 'avatar_url',
      login: 'login',
    },
  };

  return rtlRender(
    <HeaderContext.Provider value={headerContextValue}>
      <Header language={{}} />
    </HeaderContext.Provider>
  );
};
