import * as React from 'react';
import { MemoryRouter } from 'react-router';
import * as renderer from 'react-test-renderer';
import LeftDrawerMenu from '../src/navigation/drawer/LeftDrawerMenu';

describe('render left drawer menu', () => {
  let mockMenuType: string;
  let mockactiveLeftMenuSelection: string;

  beforeEach(() => {
    mockMenuType = 'create';
    mockactiveLeftMenuSelection = 'gui';
  });

  it('renders left drawer menu for create option in header without crashing', () => {
    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu menuType={mockMenuType} activeLeftMenuSelection={mockactiveLeftMenuSelection} />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  beforeEach(() => {
    mockMenuType = 'about';
    mockactiveLeftMenuSelection = 'about';
  });

  it('renders left drawer menu for about option in header without crashing', () => {
    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu menuType={mockMenuType} activeLeftMenuSelection={mockactiveLeftMenuSelection} />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  beforeEach(() => {
    mockMenuType = 'language';
    mockactiveLeftMenuSelection = 'language';
  });

  it('renders left drawer menu for language option in header without crashing', () => {
    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu menuType={mockMenuType} activeLeftMenuSelection={mockactiveLeftMenuSelection} />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  beforeEach(() => {
    mockMenuType = 'test';
    mockactiveLeftMenuSelection = 'test';
  });

  it('renders left drawer menu for language option in header without crashing', () => {
    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu menuType={mockMenuType} activeLeftMenuSelection={mockactiveLeftMenuSelection} />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  beforeEach(() => {
    mockMenuType = 'publish';
    mockactiveLeftMenuSelection = 'publish';
  });

  it('renders left drawer menu for language option in header without crashing', () => {
    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu menuType={mockMenuType} activeLeftMenuSelection={mockactiveLeftMenuSelection} />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });
});

describe('returns empty div without crashing', () => {

  let mockMenuType: string;
  let mockactiveLeftMenuSelection: string;

  beforeEach(() => {
    mockMenuType = undefined;
    mockactiveLeftMenuSelection = undefined;
  });

  it('returns empty div when the menutype is not valid(null or undefined)', () => {
    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu menuType={mockMenuType} activeLeftMenuSelection={mockactiveLeftMenuSelection} />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  beforeEach(() => {
    mockMenuType = null;
    mockactiveLeftMenuSelection = null;
  });

  it('returns empty div when the menutype is not valid(null or undefined)', () => {
    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu menuType={mockMenuType} activeLeftMenuSelection={mockactiveLeftMenuSelection} />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  beforeEach(() => {
    mockMenuType = '';
    mockactiveLeftMenuSelection = '';
  });

  it('returns empty div when the menutype is not valid(empty string)', () => {
    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu menuType={mockMenuType} activeLeftMenuSelection={mockactiveLeftMenuSelection} />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });

  beforeEach(() => {
    mockMenuType = 'testmock';
    mockactiveLeftMenuSelection = 'testmock';
  });

  it('returns empty div when the menutype is not valid(doesnt exist in the menu setting)', () => {
    const rendered =
      renderer.create(
        <MemoryRouter>
          <LeftDrawerMenu menuType={mockMenuType} activeLeftMenuSelection={mockactiveLeftMenuSelection} />
        </MemoryRouter>,
      );
    expect(rendered).toMatchSnapshot();
  });
});
