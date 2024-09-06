import React from 'react';

import { screen } from '@testing-library/react';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtonsComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { CompNavigationButtonsExternal } from 'src/layout/NavigationButtons/config.generated';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

interface RenderProps extends Omit<Partial<RenderGenericComponentTestProps<'NavigationButtons'>>, 'component'> {
  component: CompNavigationButtonsExternal;
  currentPageId?: 'layout1' | 'layout2';
}

describe('NavigationButtons', () => {
  const navButton1: CompNavigationButtonsExternal = {
    id: 'nav-button1',
    type: 'NavigationButtons',
    textResourceBindings: {},
  };
  const navButton2: CompNavigationButtonsExternal = {
    id: 'nav-button2',
    type: 'NavigationButtons',
    showBackButton: true,
    textResourceBindings: {},
  };

  const render = async ({ component, genericProps, currentPageId = 'layout1' }: RenderProps) =>
    await renderGenericComponentTest({
      type: 'NavigationButtons',
      renderer: (props) => <NavigationButtonsComponent {...props} />,
      component,
      genericProps,
      initialPage: currentPageId,
      queries: {
        fetchLayouts: async () => ({
          layout1: {
            data: {
              layout: [
                {
                  type: 'Input',
                  id: 'mockId1',
                  dataModelBindings: {
                    simpleBinding: { dataType: defaultDataTypeMock, field: 'mockDataBinding1' },
                  },
                  readOnly: false,
                  required: false,
                  textResourceBindings: {},
                },
                ...(currentPageId === 'layout1' ? [component] : []),
              ],
            },
          },
          layout2: {
            data: {
              layout: [
                {
                  type: 'Input',
                  id: 'mockId2',
                  dataModelBindings: {
                    simpleBinding: { dataType: defaultDataTypeMock, field: 'mockDataBinding2' },
                  },
                  readOnly: false,
                  required: false,
                  textResourceBindings: {},
                },
                ...(currentPageId === 'layout2' ? [component] : []),
              ],
            },
          },
        }),
        fetchLayoutSets: async () => ({ sets: [{ dataType: 'test-data-model', id: 'message', tasks: ['Task_1'] }] }),
        fetchLayoutSettings: async () => ({ pages: { order: ['layout1', 'layout2'] } }),
      },
    });

  test('renders default NavigationButtons component', async () => {
    await render({
      component: navButton1,
    });

    expect(await screen.findByText('next')).toBeInTheDocument();
    expect(screen.queryByText('back')).not.toBeInTheDocument();
  });

  test('renders NavigationButtons component without back button if there is no previous page', async () => {
    await render({
      component: navButton2,
    });

    expect(screen.getByText('next')).toBeInTheDocument();
    expect(screen.queryByText('back')).toBeNull();
  });

  test('renders NavigationButtons component with back button if there is a previous page', async () => {
    await render({ component: navButton2, currentPageId: 'layout2' });

    expect(screen.getByText('back')).toBeInTheDocument();
  });
});
