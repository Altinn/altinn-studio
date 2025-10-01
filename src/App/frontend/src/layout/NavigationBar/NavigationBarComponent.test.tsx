import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { NavigationBarComponent } from 'src/layout/NavigationBar/NavigationBarComponent';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

const { setScreenWidth } = mockMediaQuery(600);

const render = async () =>
  await renderGenericComponentTest({
    type: 'NavigationBar',
    renderer: (props) => <NavigationBarComponent {...props} />,
    component: {
      id: 'nav1',
    },
    initialPage: 'page1',
    queries: {
      fetchLayoutSettings: async () => ({ pages: { order: ['page1', 'page2', 'page3'] } }),
      fetchLayouts: async () => ({
        page1: {
          data: {
            layout: [
              {
                id: 'nav1',
                type: 'NavigationBar',
              },
              {
                id: 'd966374c-5e22-4b87-9581-0d3d1ccd40ed',
                type: 'Input',
                textResourceBindings: {
                  title: 'page1',
                },
                dataModelBindings: {
                  simpleBinding: { dataType: defaultDataTypeMock, field: 'InternInformasjon.periodeFritekst' },
                },
                required: true,
                readOnly: false,
              },
            ],
          },
        },
        page2: {
          data: {
            layout: [
              {
                id: 'nav2',
                type: 'NavigationBar',
              },
              {
                id: '0be94b72-f885-48e6-bd43-e64839a62708',
                type: 'Input',
                textResourceBindings: {
                  title: 'page2',
                },
                dataModelBindings: {
                  simpleBinding: { dataType: defaultDataTypeMock, field: 'InternInformasjon.raNummer' },
                },
                required: true,
                readOnly: false,
              },
            ],
          },
        },
        page3: {
          data: {
            layout: [
              {
                id: 'nav3',
                type: 'NavigationBar',
              },
              {
                id: '0bb8b04f-1d57-4c55-94a8-b53290c692d7',
                type: 'Input',
                textResourceBindings: {
                  title: 'page3',
                },
                dataModelBindings: {
                  simpleBinding: {
                    dataType: defaultDataTypeMock,
                    field: 'InternInformasjon.sendtFraSluttbrukersystem',
                  },
                },
                required: true,
                readOnly: false,
              },
            ],
          },
        },
      }),
    },
  });

describe('NavigationBar', () => {
  describe('Desktop', () => {
    beforeEach(() => {
      setScreenWidth(1366);
    });

    it('should show navigation menu, and not show navigation menu toggle button', async () => {
      await render();

      expect(screen.getByTestId('navigation-menu')).toHaveProperty('hidden', false);

      expect(
        screen.queryByRole('button', {
          name: /1\/3 page1/i,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Mobile', () => {
    beforeEach(() => {
      setScreenWidth(500);
    });

    it('should automatically focus the first item in the navigation menu when it is displayed', async () => {
      await render();

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
      await render();

      await userEvent.click(
        screen.getByRole('button', {
          name: /1\/3 page1/i,
        }),
      );

      await userEvent.click(
        screen.getByRole('button', {
          name: /page3/i,
        }),
      );

      expect(await screen.findByRole('button', { name: /3\/3 page3/i })).toBeVisible();
    });
  });
});
