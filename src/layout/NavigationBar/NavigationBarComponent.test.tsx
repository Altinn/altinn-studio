import React from 'react';

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { NavigationBarComponent } from 'src/layout/NavigationBar/NavigationBarComponent';
import { mockMediaQuery, renderGenericComponentTest } from 'src/testUtils';
import type { RenderGenericComponentTestProps } from 'src/testUtils';

const { setScreenWidth } = mockMediaQuery(600);

interface Props extends Partial<RenderGenericComponentTestProps<'NavigationBar'>> {
  dispatch?: (...props: any[]) => any;
}

const render = ({ dispatch = jest.fn() }: Props = {}) => {
  const user = userEvent.setup();
  renderGenericComponentTest({
    type: 'NavigationBar',
    renderer: (props) => <NavigationBarComponent {...props} />,
    component: {
      id: 'nav1',
    },
    manipulateState: (state) => {
      state.formLayout = {
        error: null,
        layoutsets: null,
        uiConfig: {
          tracks: {
            order: ['page1', 'page2', 'page3'],
            hiddenExpr: {},
            hidden: [],
          },
          currentView: 'page1',
          autoSave: false,
          focus: 'focus',
          hiddenFields: [],
          repeatingGroups: {},
          excludePageFromPdf: [],
          excludeComponentFromPdf: [],
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
      };
      state.language = {
        language: {},
        error: null,
      };
    },
    manipulateStore: (store) => {
      store.dispatch = dispatch;
    },
  });

  return { user };
};

describe('NavigationBar', () => {
  describe('Desktop', () => {
    beforeEach(() => {
      setScreenWidth(1366);
    });

    it('should show navigation menu, and not show navigation menu toggle button', async () => {
      render();

      expect(screen.getByTestId('navigation-menu')).toHaveProperty('hidden', false);

      expect(
        screen.queryByRole('button', {
          name: /1\/3 page1/i,
        }),
      ).not.toBeInTheDocument();
    });

    it('should dispatch action when navigating to another page', async () => {
      const dispatchMock = jest.fn();
      const { user } = render({ dispatch: dispatchMock });

      const btn = screen.getByText(/3\. page3/i);

      await act(() => user.click(btn));

      expect(dispatchMock).toHaveBeenCalledWith({
        payload: {
          newView: 'page3',
          runValidations: undefined,
        },
        type: FormLayoutActions.updateCurrentView.type,
      });
    });

    it('should not dispatch action when navigating to the same page', async () => {
      const dispatchMock = jest.fn();
      const { user } = render({ dispatch: dispatchMock });

      await act(() =>
        user.click(
          screen.getByRole('button', {
            name: /1\. page1/i,
          }),
        ),
      );

      expect(dispatchMock).not.toHaveBeenCalled();
    });
  });

  describe('Mobile', () => {
    beforeEach(() => {
      setScreenWidth(500);
    });

    it('should automatically focus the first item in the navigation menu when it is displayed', async () => {
      const { user } = render();

      const toggleButton = screen.getByRole('button', {
        name: /1\/3 page1/i,
      });

      await act(() => user.click(toggleButton));

      const firstNavButton = screen.getByRole('button', {
        name: /1\. page1/i,
      });

      expect(firstNavButton).toHaveFocus();
    });

    it('should dispatch action when navigating to another page', async () => {
      const dispatchMock = jest.fn();
      const { user } = render({ dispatch: dispatchMock });

      await act(() =>
        user.click(
          screen.getByRole('button', {
            name: /1\/3 page1/i,
          }),
        ),
      );

      await act(() =>
        user.click(
          screen.getByRole('button', {
            name: /3\. page3/i,
          }),
        ),
      );

      expect(dispatchMock).toHaveBeenCalledWith({
        payload: {
          newView: 'page3',
          runValidations: undefined,
        },
        type: FormLayoutActions.updateCurrentView.type,
      });
    });

    it('should not dispatch action when navigating to the same page', async () => {
      const dispatchMock = jest.fn();
      const { user } = render({ dispatch: dispatchMock });

      await act(() =>
        user.click(
          screen.getByRole('button', {
            name: /1\/3 page1/i,
          }),
        ),
      );

      await act(() =>
        user.click(
          screen.getByRole('button', {
            name: /1\. page1/i,
          }),
        ),
      );

      expect(dispatchMock).not.toHaveBeenCalled();
    });
  });
});
