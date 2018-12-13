import * as React from 'react';
import { MemoryRouter } from 'react-router';
import * as renderer from 'react-test-renderer';
import LeftDrawerMenu from '../src/navigation/drawer/LeftDrawerMenu';
//import { createRender } from '@material-ui/core/test-utils';

describe('render left drawer menu', () => {
  let mockMenuType: string;
  let mockactiveLeftMenuSelection: string;

  it('renders left drawer menu for create option in header without crashing', () => {
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

  it('renders left drawer menu for about option in header without crashing', () => {
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

  it('renders left drawer menu for language option in header without crashing', () => {
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

  it('renders left drawer menu for language option in header without crashing', () => {
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

  it('renders left drawer menu for language option in header without crashing', () => {
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

describe('returns empty div without crashing', () => {
  let mockMenuType: string;
  let mockactiveLeftMenuSelection: string;

  it('returns empty div when the menutype is not valid(null or undefined)', () => {
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

  it('returns empty div when the menutype is not valid(null or undefined)', () => {
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

  it('returns empty div when the menutype is not valid(empty string)', () => {
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

  it('returns empty div when the menutype is not valid(doesnt exist in the menu setting)', () => {
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
