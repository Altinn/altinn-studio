import React from 'react';

import { fireEvent, screen } from '@testing-library/react';

import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { ILayoutState } from 'src/features/form/layout/formLayoutSlice';
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
  test('should render Group', async () => {
    await render({ componentRef: 'Group' });
    expect(screen.getByTestId('summary-group-component')).toBeInTheDocument();
  });
  test('should render file upload', async () => {
    await render({ componentRef: 'FileUpload' });
    expect(screen.getByTestId('attachment-summary-component')).toBeInTheDocument();
  });
  test('should render file upload with tag', async () => {
    await render({ componentRef: 'FileUploadWithTag' });
    expect(screen.getByTestId('attachment-with-tag-summary')).toBeInTheDocument();
  });
  test('should render checkboxes', async () => {
    await render({ componentRef: 'Checkboxes' });
    expect(screen.getByTestId('multiple-choice-summary')).toBeInTheDocument();
  });
  test('should render default', async () => {
    await render({ componentRef: 'Input' });
    expect(screen.getByTestId('summary-item-simple')).toBeInTheDocument();
  });
  test('should render with validation message', async () => {
    await render(
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
  test('should not render if hidden', async () => {
    const otherLayout = {
      ...layoutMock(),
    };
    const components = (otherLayout.layouts && otherLayout.layouts[pageId]) || [];
    for (const component of components) {
      if (component.id === 'Input') {
        component.hidden = true;
      }
    }
    const { container } = await render({ componentRef: 'Input' }, {}, otherLayout);
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.firstChild).toBeNull();
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.childElementCount).toBe(0);
  });

  test('should get title text from resource or default', async () => {
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

    await render({ componentRef: 'Input' }, {}, otherLayout);
    expect(screen.getByText('default title')).toBeInTheDocument();
  });

  test('should respond to on change click', async () => {
    const otherLayout = { ...layoutMock() };
    otherLayout.uiConfig.currentView = 'otherPage';

    await render({ componentRef: 'Input' }, {}, otherLayout);

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

  const render = async (props: { componentRef: string }, validations: IValidations = {}, mockLayout = layoutMock()) => {
    const layoutPage = mockLayout.layouts && mockLayout.layouts[pageId];
    layoutPage?.push({
      type: 'Summary',
      id: 'mySummary',
      componentRef: props.componentRef,
    });

    return await renderWithNode<LayoutNode<'Summary'>>({
      nodeId: 'mySummary',
      renderer: ({ node }) => <SummaryComponent summaryNode={node} />,
      reduxState: {
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
