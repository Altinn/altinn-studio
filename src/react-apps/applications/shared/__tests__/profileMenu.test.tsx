import { shallow } from 'enzyme';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import ProfileMenuComponent from '../src/navigation/main-header/profileMenu';

describe('ProfileMenu', () => {
  let profileMenu: any;
  let rendered: any;
  let wrapper: any;

  beforeEach(() => {
    profileMenu = null;
    rendered = null;
    wrapper = null;
  });

  it('snapshot should match snapshot with default values', () => {
    rendered = renderer.create(
      <ProfileMenuComponent />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('snapshot should match snapshot with logout text', () => {
    rendered = shallow(
      <ProfileMenuComponent
        showlogout={true}
      />,
    );
    profileMenu = rendered.shallow();
    expect(profileMenu).toMatchSnapshot();
  });

  it('should have Logout text', () => {
    wrapper = shallow(
      <ProfileMenuComponent
        showlogout={true}
      />,
    );
    profileMenu = wrapper.shallow();

    expect(profileMenu.find('WithStyles(MenuItem)').render().text()).toEqual('Logout');

  });

});

describe('ProfileMenu function', () => {
  let profileMenu: any;
  let rendered: any;

  beforeEach(() => {
    profileMenu = null;
    rendered = null;
  });

  it('handleToggle() should change state', () => {
    rendered = shallow(
      <ProfileMenuComponent
        showlogout={true}
      />,
    );
    profileMenu = rendered.shallow();

    expect(profileMenu.state().open).toEqual(false);
    profileMenu.instance().handleToggle();
    expect(profileMenu.state().open).toEqual(true);
    profileMenu.instance().handleToggle();
    expect(profileMenu.state().open).toEqual(false);

    // TODO: Test chaning UI state

  });

  it('handleClose() should change state', () => {
    rendered = shallow(
      <ProfileMenuComponent
        showlogout={true}
      />,
    );
    profileMenu = rendered.shallow();

    expect(profileMenu.state().anchorEl).toEqual(null);

    profileMenu.setState({ anchorEl: 'notNull' });
    expect(profileMenu.state().anchorEl).toEqual('notNull');

    profileMenu.instance().handleClose();
    expect(profileMenu.state().anchorEl).toEqual(null);

    // TODO: Test changing UI state

  });

});
