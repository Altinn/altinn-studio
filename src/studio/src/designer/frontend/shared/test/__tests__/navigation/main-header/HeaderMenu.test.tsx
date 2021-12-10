import 'jest';
import * as React from 'react';
import { mount } from 'enzyme';
import * as networking from '../../../../utils/networking';
import { HeaderContext } from '../../../../navigation/main-header/Header';
import { HeaderMenu } from '../../../../navigation/main-header/HeaderMenu';

describe('Shared > Navigation > Main Header > HeaderMenu', () => {
  const setSelectedContextMock = jest.fn();
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
    setSelectedContext: setSelectedContextMock,
    user: {
      full_name: 'John Smith',
      avatar_url: 'avatar_url',
      login: 'login',
    },
  };

  it('should render', () => {
    const component = mount(
      <HeaderContext.Provider value={headerContextValue}>
        <HeaderMenu language={{}} />
      </HeaderContext.Provider>,
    );

    expect(component.isEmptyRender()).toBe(false);
  });

  it('should call gitea logout api when clicking log out', async () => {
    const postSpy = jest.spyOn(networking, 'post').mockResolvedValue(null);

    const component = mount(
      <HeaderContext.Provider value={headerContextValue}>
        <HeaderMenu language={{}} />
      </HeaderContext.Provider>,
    );
    component.find('#profile-icon-button').hostNodes().simulate('click');
    component.find('#menu-logout').hostNodes().simulate('click');
    expect(postSpy).toHaveBeenCalledWith(`${window.location.origin}/repos/user/logout`);
  });


  it.each(['self', 'all'])('should call setSelectedContext with reserved keyword when setting context to %p', (context) => {
    const component = mount(
      <HeaderContext.Provider value={headerContextValue}>
        <HeaderMenu language={{}} />
      </HeaderContext.Provider>,
    );
    component.find('#profile-icon-button').hostNodes().simulate('click');
    component.find(`#menu-${context}`).hostNodes().simulate('click');
    expect(setSelectedContextMock).toHaveBeenCalledWith(context);
  });

  it('should call setSelectedContext with org-id when selecting org as context', () => {
    const component = mount(
      <HeaderContext.Provider value={headerContextValue}>
        <HeaderMenu language={{}} />
      </HeaderContext.Provider>,
    );
    component.find('#profile-icon-button').hostNodes().simulate('click');
    component.find('#menu-org-1').hostNodes().simulate('click');
    expect(setSelectedContextMock).toHaveBeenCalledWith(1);
  });
});
