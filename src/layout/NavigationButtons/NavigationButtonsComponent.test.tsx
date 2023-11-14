import React from 'react';

import { screen } from '@testing-library/react';

import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtonsComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { CompNavigationButtonsExternal } from 'src/layout/NavigationButtons/config.generated';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

describe('NavigationButton', () => {
  const navButton1: CompNavigationButtonsExternal = {
    id: 'nav-button1',
    type: 'NavigationButtons',
    textResourceBindings: {},
  };
  const navButton2: CompNavigationButtonsExternal = {
    id: 'nav-button2',
    type: 'NavigationButtons',
    textResourceBindings: {},
  };
  const mockLayout = getFormLayoutStateMock({
    layouts: {
      layout1: [
        {
          type: 'Input',
          id: 'mockId1',
          dataModelBindings: {
            simpleBinding: 'mockDataBinding1',
          },
          readOnly: false,
          required: false,
          textResourceBindings: {},
        },
        navButton1,
      ],
      layout2: [
        {
          type: 'Input',
          id: 'mockId2',
          dataModelBindings: {
            simpleBinding: 'mockDataBinding2',
          },
          readOnly: false,
          required: false,
          textResourceBindings: {},
        },
        navButton2,
      ],
    },
    uiConfig: {
      currentView: 'layout1',
      focus: null,
      hiddenFields: [],
      repeatingGroups: {},
      pageOrderConfig: {
        order: ['layout1', 'layout2'],
        hidden: [],
        hiddenExpr: {},
      },
      excludePageFromPdf: [],
      excludeComponentFromPdf: [],
    },
  });

  const render = ({
    component,
    genericProps,
    manipulateState,
  }: Partial<RenderGenericComponentTestProps<'NavigationButtons'>> = {}) => {
    renderGenericComponentTest({
      type: 'NavigationButtons',
      renderer: (props) => <NavigationButtonsComponent {...props} />,
      component,
      genericProps,
      manipulateState: manipulateState
        ? manipulateState
        : (state) => {
            state.formLayout = mockLayout;
          },
    });
  };

  test('renders default NavigationButtons component', () => {
    navButton1.showBackButton = false;
    render({
      component: {
        id: navButton1.id,
      },
    });

    expect(screen.getByText('next')).toBeTruthy();
    expect(screen.queryByText('back')).toBeFalsy();
  });

  test('renders NavigationButtons component without back button if there is no previous page', () => {
    navButton1.showBackButton = true;
    render({
      component: {
        id: navButton1.id,
      },
    });

    expect(screen.getByText('next')).toBeTruthy();
    expect(screen.queryByText('back')).toBeNull();
  });

  test('renders NavigationButtons component with back button if there is a previous page', () => {
    mockLayout.uiConfig.currentView = 'layout2';
    navButton2.showBackButton = true;
    render({
      component: {
        id: navButton2.id,
      },
    });

    expect(screen.getByText('back')).toBeTruthy();
  });
});
