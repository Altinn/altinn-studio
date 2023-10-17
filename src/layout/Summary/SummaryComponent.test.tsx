import React from 'react';

import { fireEvent, screen } from '@testing-library/react';

import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { renderWithProviders } from 'src/test/renderWithProviders';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { ILayoutState } from 'src/features/layout/formLayoutSlice';
import type { CompInputExternal } from 'src/layout/Input/config.generated';
import type { CompExternal } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { IValidations } from 'src/utils/validation/types';

describe('SummaryComponent', () => {
  const pageId = 'FormLayout';
  const layoutMock = (): ILayoutState =>
    getFormLayoutStateMock({
      layouts: {
        [pageId]: [
          ...['Input', 'Group', 'FileUpload', 'FileUploadWithTag', 'Checkboxes'].map(
            (t) =>
              ({
                id: t,
                type: t,
                dataModelBindings: {},
                textResourceBindings: {},
                children: [],
                maxCount: 10,
              }) as CompExternal,
          ),
        ],
      },
    });
  test('should render Group', () => {
    renderHelper({ componentRef: 'Group' });
    expect(screen.getByTestId('summary-group-component')).toBeInTheDocument();
  });
  test('should render file upload', () => {
    renderHelper({ componentRef: 'FileUpload' });
    expect(screen.getByTestId('attachment-summary-component')).toBeInTheDocument();
  });
  test('should render file upload with tag', () => {
    renderHelper({ componentRef: 'FileUploadWithTag' });
    expect(screen.getByTestId('attachment-with-tag-summary')).toBeInTheDocument();
  });
  test('should render checkboxes', () => {
    renderHelper({ componentRef: 'Checkboxes' });
    expect(screen.getByTestId('multiple-choice-summary')).toBeInTheDocument();
  });
  test('should render default', () => {
    renderHelper({ componentRef: 'Input' });
    expect(screen.getByTestId('summary-item-simple')).toBeInTheDocument();
  });
  test('should render with validation message', () => {
    renderHelper(
      { componentRef: 'Input' },
      {
        [pageId]: {
          ['Input']: {
            simpleBinding: {
              errors: ['Error message'],
              warnings: [],
            },
          },
        },
      },
    );
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
  test('should not render if hidden', () => {
    const otherLayout = {
      ...layoutMock(),
    };
    const components = (otherLayout.layouts && otherLayout.layouts[pageId]) || [];
    for (const component of components) {
      if (component.id === 'Input') {
        component.hidden = true;
      }
    }
    const { container } = renderHelper({ componentRef: 'Input' }, {}, otherLayout);
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.firstChild).toBeNull();
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.childElementCount).toBe(0);
  });

  test('should get title text from resource or default', () => {
    const otherLayout = {
      ...layoutMock(),
    };
    const firstComponent =
      otherLayout.layouts && pageId && otherLayout.layouts[pageId] && otherLayout.layouts[pageId][0];

    if (firstComponent) {
      (firstComponent as CompInputExternal).textResourceBindings = {
        title: 'default title',
      };
    }

    renderHelper({ componentRef: 'Input' }, {}, otherLayout);
    expect(screen.getByText('default title')).toBeInTheDocument();
  });

  test('should respond to on change click', () => {
    const otherLayout = { ...layoutMock() };
    otherLayout.uiConfig.currentView = 'otherPage';

    renderHelper({ componentRef: 'Input' }, {}, otherLayout);

    const spy = jest.spyOn(FormLayoutActions, 'updateCurrentView');
    const button = screen.getByRole('button');

    expect(spy).toHaveBeenCalledTimes(0);
    button && fireEvent.click(button);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      newView: pageId,
      returnToView: 'otherPage',
      focusComponentId: 'Input',
    });
  });

  const renderHelper = (props: { componentRef: string }, validations: IValidations = {}, mockLayout = layoutMock()) => {
    function Wrapper() {
      const node = useResolvedNode('mySummary') as LayoutNode<'Summary'>;

      return <SummaryComponent summaryNode={node} />;
    }

    const layoutPage = mockLayout.layouts && mockLayout.layouts[pageId];
    layoutPage?.push({
      type: 'Summary',
      id: 'mySummary',
      componentRef: props.componentRef,
    });

    return renderWithProviders(<Wrapper />, {
      preloadedState: {
        ...getInitialStateMock(),
        formLayout: mockLayout,
        formValidations: {
          validations,
          error: null,
          invalidDataTypes: [],
        },
      },
    });
  };
});
