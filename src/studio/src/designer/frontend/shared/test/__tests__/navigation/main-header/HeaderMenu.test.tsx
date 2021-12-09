import 'jest';
import * as React from 'react';
import { mount } from 'enzyme';

import { HeaderContext } from '../../../../navigation/main-header/Header';
import { HeaderMenu } from '../../../../navigation/main-header/HeaderMenu';

describe('Shared > Navigation > Main Header > HeaderMenu', () => {
  it('should render', () => {
    const headerContextValue = {
      selectableOrgs: [
        {
          avatar_url: 'avatar_url',
          description: 'description',
          id: 1,
          location: 'location',
          username: 'username',
          website: 'website',
          full_name: 'full_name',
        },
      ],
      selectedContext: 'self',
      setSelectedContext: jest.fn(),
      user: {
        full_name: 'John Smith',
        avatar_url: 'avatar_url',
        login: 'login',
      },
    };

    const component = mount(
      <HeaderContext.Provider value={headerContextValue}>
        <HeaderMenu language={{}} />
      </HeaderContext.Provider>,
    );

    expect(component.isEmptyRender()).toBe(false);
  });
});
