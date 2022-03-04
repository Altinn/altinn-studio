import 'jest';
import * as React from 'react';
import { mount } from 'enzyme';
import {
  createTheme as createThemeV4,
  ThemeProvider as ThemeProviderV4,
} from '@material-ui/core/styles';

import {
  Header,
  HeaderContext,
  getOrgNameById,
} from '../../../../navigation/main-header/Header';
import altinnTheme from '../../../../theme/altinnStudioTheme';

const themeV4 = createThemeV4(altinnTheme);

describe('Shared > Navigation > Main Header > Header', () => {
  const orgProps = {
    avatar_url: 'avatar_url',
    description: 'description',
    id: 1,
    location: 'location',
    username: 'username',
    website: 'website',
    full_name: 'full_name',
  };

  it('should render', () => {
    const headerContextValue = {
      selectableOrgs: [{ ...orgProps }],
      selectedContext: 'self',
      setSelectedContext: jest.fn(),
      user: {
        full_name: 'John Smith',
        avatar_url: 'avatar_url',
        login: 'login',
      },
    };

    const component = mount(
      <ThemeProviderV4 theme={themeV4}>
        <HeaderContext.Provider value={headerContextValue}>
          <Header language={{}} />
        </HeaderContext.Provider>
        ,
      </ThemeProviderV4>,
    );

    expect(component.isEmptyRender()).toBe(false);
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
