import React from 'react';

import { fireEvent, screen } from '@testing-library/react';

import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { SummaryComponent } from 'src/components/summary/SummaryComponent';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { renderWithProviders } from 'src/testUtils';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutState } from 'src/features/form/layout/formLayoutSlice';
import type { ILayoutComponent } from 'src/layout/layout';
import type { IValidations } from 'src/types';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

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
              } as ExprUnresolved<ILayoutComponent>),
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
    otherLayout.uiConfig.hiddenFields = ['Input'];
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
      firstComponent.textResourceBindings = {
        title: 'default title',
      };
    }

    renderHelper({ componentRef: 'Input' }, {}, otherLayout);
    expect(screen.getByText('default title')).toBeInTheDocument();
  });

  test('should respond to on change click', () => {
    const spy = jest.spyOn(FormLayoutActions, 'updateCurrentView');
    const otherLayout = {
      ...layoutMock(),
    };
    otherLayout.uiConfig.currentView = 'otherPage';
    // eslint-disable-next-line testing-library/render-result-naming-convention
    const theRender = renderHelper({ componentRef: 'Input' }, {}, otherLayout);

    // eslint-disable-next-line
    const button = theRender.container.querySelector<HTMLButtonElement>('button');
    button && fireEvent.click(button);
    expect(spy).toHaveBeenCalledWith({
      newView: pageId,
      returnToView: 'otherPage',
      focusComponentId: 'Input',
    });
  });

  const renderHelper = (props: { componentRef: string }, validations: IValidations = {}, mockLayout = layoutMock()) => {
    function Wrapper() {
      const node = useResolvedNode('mySummary') as LayoutNodeFromType<'Summary'>;

      return <SummaryComponent summaryNode={node} />;
    }

    const layoutPage = mockLayout.layouts && mockLayout.layouts[pageId];
    layoutPage?.push({
      type: 'Summary',
      id: 'mySummary',
      componentRef: props.componentRef,
      pageRef: pageId,
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
