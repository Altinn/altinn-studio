import React from 'react';

import { screen } from '@testing-library/react';

import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtonsComponent';
import { renderGenericComponentTest } from 'src/testUtils';
import type { ExprResolved } from 'src/features/expressions/types';
import type { ILayoutCompNavButtons } from 'src/layout/NavigationButtons/types';
import type { RenderGenericComponentTestProps } from 'src/testUtils';

describe('NavigationButton', () => {
  const navButton1: ExprResolved<ILayoutCompNavButtons> = {
    id: 'nav-button1',
    type: 'NavigationButtons',
    textResourceBindings: {},
    dataModelBindings: {},
    readOnly: false,
    required: false,
  };
  const navButton2: ExprResolved<ILayoutCompNavButtons> = {
    id: 'nav-button2',
    type: 'NavigationButtons',
    textResourceBindings: {},
    dataModelBindings: {},
    readOnly: false,
    required: false,
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
          disabled: false,
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
          disabled: false,
          textResourceBindings: {},
        },
        navButton2,
      ],
    },
    uiConfig: {
      currentView: 'layout1',
      autoSave: true,
      focus: null,
      hiddenFields: [],
      repeatingGroups: {},
      tracks: {
        order: ['layout1', 'layout2'],
        hidden: [],
        hiddenExpr: {},
      },
      excludePageFromPdf: [],
      excludeComponentFromPdf: [],
      navigationConfig: {
        layout1: {
          next: 'layout2',
        },
        layout2: {
          previous: 'layout1',
        },
      },
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
