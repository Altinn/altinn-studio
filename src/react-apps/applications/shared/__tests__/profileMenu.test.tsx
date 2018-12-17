import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import ProfileMenuComponent from '../src/navigation/main-header/profileMenu';

describe('ProfileMenu', () => {
  let profileMenu: any;
  let rendered: any;

  afterEach(() => {
    profileMenu = null;
    rendered = null;
  });

  it('should match snapshot', () => {
    rendered = shallow(<ProfileMenuComponent />);
    profileMenu = rendered.shallow();
    expect(profileMenu).toMatchSnapshot();
  });

  it('should match snapshot with logout text', () => {
    rendered = shallow(
      <ProfileMenuComponent
        showlogout={true}
      />,
    );
    profileMenu = rendered.shallow();
    expect(profileMenu).toMatchSnapshot();
  });
});

describe('ProfileMenu function', () => {
  let profileMenu: any;
  let rendered: any;

  afterEach(() => {
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

  });

});
