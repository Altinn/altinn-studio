import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { PageValidation } from '@app/layout-contract/generated/common.generated';
import type { CompNavigationBarExternal } from '@app/layout-contract/generated/components/NavigationBar/config.generated';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { NavigationBarComponent } from 'src/layout/NavigationBar/NavigationBarComponent';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

const { setScreenWidth } = mockMediaQuery(600);

interface RenderProps {
  component?: Pick<CompNavigationBarExternal, 'validateOnForward' | 'validateOnBackward'>;
  currentPageId?: 'page1' | 'page2';
  pageValidation?: PageValidation;
  taskValidation?: PageValidation;
  appValidation?: PageValidation;
  emptyRequiredFields?: boolean;
}

const render = async ({
  component,
  currentPageId = 'page1',
  pageValidation,
  taskValidation,
  appValidation,
  emptyRequiredFields = false,
}: RenderProps = {}) => {
  window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
    ui.folders.Task_1 = {
      defaultDataType: defaultDataTypeMock,
      pages: {
        order: ['page1', 'page2', 'page3'],
        validationOnNavigation: taskValidation,
      },
    };
    ui.settings = { ...ui.settings, validationOnNavigation: appValidation };
  });

  return await renderGenericComponentTest({
    type: 'NavigationBar',
    renderer: (props) => <NavigationBarComponent {...props} />,
    component: {
      id: currentPageId === 'page1' ? 'nav1' : 'nav2',
      ...component,
    },
    initialPage: currentPageId,
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          if (emptyRequiredFields) {
            obj.dataModels[defaultDataTypeMock].initialData = {};
          }
          obj.layouts = {
            page1: {
              data: {
                validationOnNavigation: pageValidation,
                layout: [
                  {
                    id: 'nav1',
                    type: 'NavigationBar',
                    ...component,
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
                validationOnNavigation: pageValidation,
                layout: [
                  {
                    id: 'nav2',
                    type: 'NavigationBar',
                    ...component,
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
                validationOnNavigation: pageValidation,
                layout: [
                  {
                    id: 'nav3',
                    type: 'NavigationBar',
                    ...component,
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
          };
        }),
    },
  });
};

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

  describe('Validation precedence', () => {
    beforeEach(() => setScreenWidth(1366));

    const requiredValidation: PageValidation = { page: 'current', show: ['Required'] };
    const customValidation: PageValidation = { page: 'current', show: ['CustomBackend'] };
    const validationSources = [
      { level: 'page', pageValidation: requiredValidation },
      { level: 'task', taskValidation: requiredValidation },
      { level: 'app', appValidation: requiredValidation },
    ];

    test.each(validationSources)('inherits $level validation without a forward override', async (source) => {
      const { routerRef } = await render({ ...source, emptyRequiredFields: true });

      await userEvent.click(screen.getByRole('button', { name: /2\. page2/i }));

      expect(routerRef.current?.state.location.pathname).toMatch(/\/page1$/);
    });

    test.each(validationSources)('component validation can relax $level validation', async (source) => {
      const { routerRef } = await render({
        ...source,
        component: { validateOnForward: customValidation },
        emptyRequiredFields: true,
      });

      await userEvent.click(screen.getByRole('button', { name: /2\. page2/i }));

      await waitFor(() => expect(routerRef.current?.state.location.pathname).toMatch(/\/page2$/));
    });

    test.each([
      { level: 'page', pageValidation: customValidation },
      { level: 'task', taskValidation: customValidation },
      { level: 'app', appValidation: customValidation },
    ])('component validation can tighten $level validation', async (source) => {
      const { routerRef } = await render({
        ...source,
        component: { validateOnForward: requiredValidation },
        emptyRequiredFields: true,
      });

      await userEvent.click(screen.getByRole('button', { name: /2\. page2/i }));

      expect(routerRef.current?.state.location.pathname).toMatch(/\/page1$/);
    });

    test.each(validationSources)('explicit backward validation is honored with $level defaults', async (source) => {
      const { routerRef } = await render({
        ...source,
        component: { validateOnBackward: requiredValidation },
        currentPageId: 'page2',
        emptyRequiredFields: true,
      });

      await userEvent.click(screen.getByRole('button', { name: /1\. page1/i }));

      expect(routerRef.current?.state.location.pathname).toMatch(/\/page2$/);
    });

    test.each(validationSources)('does not inherit $level validation for backward navigation', async (source) => {
      const { routerRef } = await render({ ...source, currentPageId: 'page2', emptyRequiredFields: true });

      await userEvent.click(screen.getByRole('button', { name: /1\. page1/i }));

      await waitFor(() => expect(routerRef.current?.state.location.pathname).toMatch(/\/page1$/));
    });
  });
});
