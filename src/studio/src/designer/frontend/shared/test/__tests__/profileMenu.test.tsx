import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as render from 'react-test-renderer';
import ProfileMenuComponent from '../../navigation/main-header/profileMenu';

describe('ProfileMenu', () => {
  let rendered: any;

  afterEach(() => {
    rendered = null;
  });

  it('should match snapshot', () => {
    rendered = render.create(<ProfileMenuComponent />);
    expect(rendered).toMatchSnapshot();
  });

  it('should match snapshot with logout text', () => {
    rendered = render.create(
      <ProfileMenuComponent
        showlogout={true}
      />,
    );
    expect(rendered).toMatchSnapshot();
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
