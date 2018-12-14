import * as React from 'react';
import { MemoryRouter } from 'react-router';
import * as renderer from 'react-test-renderer';
import LeftDrawerMenu from '../src/navigation/drawer/LeftDrawerMenu';

describe('render left drawer menu', () => {
  let mockMenuType: string;
  let mockactiveLeftMenuSelection: string;

  it('should render left drawer menu for create option in header that matches the snapshot', () => {
    mockMenuType = 'create';
    mockactiveLeftMenuSelection = 'gui';

    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu
            menuType={mockMenuType}
            activeLeftMenuSelection={mockactiveLeftMenuSelection}
          />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  it('should render left drawer menu for about option in header that matches the snapshot', () => {
    mockMenuType = 'about';
    mockactiveLeftMenuSelection = 'about';

    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu
            menuType={mockMenuType}
            activeLeftMenuSelection={mockactiveLeftMenuSelection}
          />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  it('should render left drawer menu for language option in header that matches the snapshot', () => {
    mockMenuType = 'language';
    mockactiveLeftMenuSelection = 'language';

    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu
            menuType={mockMenuType}
            activeLeftMenuSelection={mockactiveLeftMenuSelection}
          />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  it('should render left drawer menu for test option in header that matches the snapshot', () => {
    mockMenuType = 'test';
    mockactiveLeftMenuSelection = 'test';

    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu
            menuType={mockMenuType}
            activeLeftMenuSelection={mockactiveLeftMenuSelection}
          />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  it('should render left drawer menu for publish option in header that matches the snapshot', () => {
    mockMenuType = 'publish';
    mockactiveLeftMenuSelection = 'publish';

    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu
            menuType={mockMenuType}
            activeLeftMenuSelection={mockactiveLeftMenuSelection}
          />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });
});

describe('returns empty div for null,undefined or invalid  property values', () => {
  let mockMenuType: string;
  let mockactiveLeftMenuSelection: string;

  it('should return an empty div when the menutype is undefined) that matches the snapshot', () => {
    mockMenuType = undefined;
    mockactiveLeftMenuSelection = undefined;

    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu
            menuType={mockMenuType}
            activeLeftMenuSelection={mockactiveLeftMenuSelection}
          />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  it('should return an empty div when the menutype is null that matches the snapshot', () => {
    mockMenuType = null;
    mockactiveLeftMenuSelection = null;

    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu
            menuType={mockMenuType}
            activeLeftMenuSelection={mockactiveLeftMenuSelection}
          />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  it('should return an empty div when the menutype is empty string that matches the snapshot', () => {
    mockMenuType = '';
    mockactiveLeftMenuSelection = '';

    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu
            menuType={mockMenuType}
            activeLeftMenuSelection={mockactiveLeftMenuSelection}
          />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  it('should return empty div when the menutype is not valid(doesnt exist in the menu setting)', () => {
    mockMenuType = 'testmock';
    mockactiveLeftMenuSelection = 'testmock';

    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu
            menuType={mockMenuType}
            activeLeftMenuSelection={mockactiveLeftMenuSelection}
          />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });
});
