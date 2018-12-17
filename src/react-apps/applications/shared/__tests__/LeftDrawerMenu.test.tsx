import * as React from 'react';
import { MemoryRouter } from 'react-router';
import * as renderer from 'react-test-renderer';
import LeftDrawerMenu from '../src/navigation/drawer/LeftDrawerMenu';

describe('LeftDrawerMenu.tsx', () => {
  describe('render left drawer menu', () => {
    describe('when mockmenutype is create', () => {
      let mockMenuType: string;
      let mockactiveLeftMenuSelection: string;

      beforeEach(() => {
        mockMenuType = 'create';
        mockactiveLeftMenuSelection = 'gui';
      });

      it('should render left drawer menu for create option in header that matches the snapshot', () => {
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

    describe('when mockmenutype is about', () => {
      let mockMenuType: string;
      let mockactiveLeftMenuSelection: string;

      beforeEach(() => {
        mockMenuType = 'about';
        mockactiveLeftMenuSelection = 'about';
      });

      it('should render left drawer menu for about option in header that matches the snapshot', () => {
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

    describe('when mockmenutype is language', () => {
      let mockMenuType: string;
      let mockactiveLeftMenuSelection: string;

      beforeEach(() => {
        mockMenuType = 'language';
        mockactiveLeftMenuSelection = 'language';
      });

      it('should render left drawer menu for language option in header that matches the snapshot', () => {
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

    describe('when mockmenutype is test', () => {
      let mockMenuType: string;
      let mockactiveLeftMenuSelection: string;

      beforeEach(() => {
        mockMenuType = 'test';
        mockactiveLeftMenuSelection = 'test';
      });

      it('should render left drawer menu for test option in header that matches the snapshot', () => {
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

    describe('when mockmenutype is publish', () => {
      let mockMenuType: string;
      let mockactiveLeftMenuSelection: string;

      beforeEach(() => {
        mockMenuType = 'publish';
        mockactiveLeftMenuSelection = 'publish';
      });

      it('should render left drawer menu for publish option in header that matches the snapshot', () => {
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

    describe('when mockmenutype is undefined', () => {
      let mockMenuType: string;
      let mockactiveLeftMenuSelection: string;

      beforeEach(() => {
        mockMenuType = undefined;
        mockactiveLeftMenuSelection = undefined;
      });

      it('should return an empty div when the menutype is undefined) that matches the snapshot', () => {
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

    describe('when mockmenutype is null', () => {
      let mockMenuType: string;
      let mockactiveLeftMenuSelection: string;

      beforeEach(() => {
        mockMenuType = null;
        mockactiveLeftMenuSelection = null;
      });

      it('should return an empty div when the menutype is null that matches the snapshot', () => {
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

    describe('when mockmenutype is empty string', () => {
      let mockMenuType: string;
      let mockactiveLeftMenuSelection: string;

      beforeEach(() => {
        mockMenuType = '';
        mockactiveLeftMenuSelection = '';
      });

      it('should return an empty div when the menutype is empty string that matches the snapshot', () => {
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

    describe('when mock value is invalid menutype', () => {
      let mockMenuType: string;
      let mockactiveLeftMenuSelection: string;

      beforeEach(() => {
        mockMenuType = 'testmock';
        mockactiveLeftMenuSelection = 'testmock';
      });

      it('should return empty div when the menutype is not valid(doesnt exist in the menu setting)', () => {
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
  });
});
