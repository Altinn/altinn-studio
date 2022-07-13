import * as React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMediaQuery, renderWithProviders } from '../../../testUtils';
import { NavigationBar } from './NavigationBar';
import type { INavigationBar } from './NavigationBar';
import { setupStore } from 'src/store';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';

const { setScreenWidth } = mockMediaQuery(600);

const render = ({ props = {}, dispatch = jest.fn() } = {}) => {
  const allProps = {
    triggers: [],
    ...props,
  } as INavigationBar;

  const store = setupStore({
    formLayout: {
      error: null,
      layoutsets: null,
      uiConfig: {
        layoutOrder: ['page1', 'page2', 'page3'],
        currentView: 'page1',
        autoSave: false,
        focus: 'focus',
        hiddenFields: [],
      },
      layouts: {
        page1: [
          {
            id: 'nav1',
            type: 'NavigationBar',
            textResourceBindings: {
              next: 'Kort svar',
              back: 'back',
            },
            dataModelBindings: {},
          },
          {
            id: 'd966374c-5e22-4b87-9581-0d3d1ccd40ed',
            type: 'Input',
            textResourceBindings: {
              title: 'page1',
            },
            dataModelBindings: {
              simpleBinding: 'InternInformasjon.periodeFritekst',
            },
            required: true,
            readOnly: false,
          },
        ],
        page2: [
          {
            id: 'nav2',
            type: 'NavigationBar',
            textResourceBindings: {
              next: 'Kort svar',
              back: 'back',
            },
            dataModelBindings: {},
          },
          {
            id: '0be94b72-f885-48e6-bd43-e64839a62708',
            type: 'Input',
            textResourceBindings: {
              title: 'page2',
            },
            dataModelBindings: {
              simpleBinding: 'InternInformasjon.raNummer',
            },
            required: true,
            readOnly: false,
          },
        ],
        page3: [
          {
            id: 'nav3',
            type: 'NavigationBar',
            textResourceBindings: {
              next: 'Kort svar',
              back: 'back',
            },
            dataModelBindings: {},
          },
          {
            id: '0bb8b04f-1d57-4c55-94a8-b53290c692d7',
            type: 'Input',
            textResourceBindings: {
              title: 'page3',
            },
            dataModelBindings: {
              simpleBinding: 'InternInformasjon.sendtFraSluttbrukersystem',
            },
            required: true,
            readOnly: false,
          },
        ],
      },
    },
  });

  store.dispatch = dispatch;

  renderWithProviders(<NavigationBar {...allProps} />, {
    store,
  });
};

describe('NavigationBar', () => {
  describe('Desktop', () => {
    beforeEach(() => {
      setScreenWidth(1366);
    });

    it('should show navigation menu, and not show navigation menu toggle button', async () => {
      render();

      expect(screen.getByTestId('navigation-menu')).toHaveProperty(
        'hidden',
        false,
      );

      expect(
        screen.queryByRole('button', {
          name: /1\/3 page1/i,
        }),
      ).not.toBeInTheDocument();
    });

    it('should dispatch action when navigating to another page', async () => {
      const dispatchMock = jest.fn();
      render({ dispatch: dispatchMock });

      const btn = screen.getByText(/3\. page3/i);

      await userEvent.click(btn);

      expect(dispatchMock).toHaveBeenCalledWith({
        payload: {
          newView: 'page3',
          runValidations: null,
        },
        type: FormLayoutActions.updateCurrentView.type,
      });
    });

    it('should not dispatch action when navigating to the same page', async () => {
      const dispatchMock = jest.fn();
      render({ dispatch: dispatchMock });

      await userEvent.click(
        screen.getByRole('button', {
          name: /1\. page1/i,
        }),
      );

      expect(dispatchMock).not.toHaveBeenCalled();
    });
  });

  describe('Mobile', () => {
    beforeEach(() => {
      setScreenWidth(500);
    });

    it('should hide navigation buttons and show a button to toggle the navigation menu', async () => {
      render();

      expect(screen.getByTestId('navigation-menu')).toHaveProperty(
        'hidden',
        true,
      );
      expect(
        screen.getByRole('button', {
          name: /1\/3 page1/i,
        }),
      ).toBeInTheDocument();
    });

    it('should show navigation buttons when clicking navigation toggle button, and hide toggle button', async () => {
      render();

      const navMenu = screen.getByTestId('navigation-menu');
      const toggleButton = screen.getByRole('button', {
        name: /1\/3 page1/i,
      });

      expect(navMenu).toHaveProperty('hidden', true);
      expect(toggleButton).toHaveProperty('hidden', false);

      await userEvent.click(toggleButton);

      expect(navMenu).toHaveProperty('hidden', false);
      expect(toggleButton).toHaveProperty('hidden', true);
    });

    it('should automatically focus the first item in the navigation menu when it is displayed', async () => {
      render();

      const toggleButton = screen.getByRole('button', {
        name: /1\/3 page1/i,
      });

      await userEvent.click(toggleButton);

      const firstNavButton = screen.getByRole('button', {
        name: /1\. page1/i,
      });

      expect(firstNavButton).toHaveFocus();
    });

    it('should dispatch action when navigating to another page', async () => {
      const dispatchMock = jest.fn();
      render({ dispatch: dispatchMock });

      await userEvent.click(
        screen.getByRole('button', {
          name: /1\/3 page1/i,
        }),
      );

      await userEvent.click(
        screen.getByRole('button', {
          name: /3\. page3/i,
        }),
      );

      expect(dispatchMock).toHaveBeenCalledWith({
        payload: {
          newView: 'page3',
          runValidations: null,
        },
        type: FormLayoutActions.updateCurrentView.type,
      });
    });

    it('should not dispatch action when navigating to the same page', async () => {
      const dispatchMock = jest.fn();
      render({ dispatch: dispatchMock });

      await userEvent.click(
        screen.getByRole('button', {
          name: /1\/3 page1/i,
        }),
      );

      await userEvent.click(
        screen.getByRole('button', {
          name: /1\. page1/i,
        }),
      );

      expect(dispatchMock).not.toHaveBeenCalled();
    });
  });
});
