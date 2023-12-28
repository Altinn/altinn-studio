import React from 'react';

import { fireEvent, screen } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { CompInputExternal } from 'src/layout/Input/config.generated';
import type { CompExternal, ILayoutCollection } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { IValidations } from 'src/utils/validation/types';

describe('SummaryComponent', () => {
  const layoutMock = (): ILayoutCollection => ({
    FormLayout: {
      data: {
        layout: [
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
  test.skip('should render with validation message', async () => {
    await render(
      { componentRef: 'Input' },
      {
        FormLayout: {
          Input: {
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
    const otherLayout = layoutMock();
    const components = otherLayout.FormLayout.data.layout;
    for (const component of components) {
      if (component.id === 'Input') {
        component.hidden = true;
      }
    }
    await render({ componentRef: 'Input' }, {}, otherLayout);

    expect(screen.queryByTestId('summary-item-simple')).not.toBeInTheDocument();
    expect(screen.queryByTestId('summary-item-group')).not.toBeInTheDocument();
    expect(screen.queryByText(/.+/)).not.toBeInTheDocument();
  });

  test('should get title text from resource or default', async () => {
    const otherLayout = layoutMock();
    const firstComponent = otherLayout.FormLayout.data.layout[0];
    (firstComponent as CompInputExternal).textResourceBindings = {
      title: 'default title',
    };

    await render({ componentRef: 'Input' }, {}, otherLayout);
    expect(screen.getByText('default title')).toBeInTheDocument();
  });

  test('should respond to on change click', async () => {
    await render({ componentRef: 'Input', currentPageId: 'otherPage' }, {});

    const button = screen.getByRole('button');

    fireEvent.click(button);
  });

  const render = async (
    props: { componentRef: string; currentPageId?: string },
    validations: IValidations = {},
    mockLayout = layoutMock(),
  ) => {
    const layoutPage = mockLayout.FormLayout.data.layout;
    layoutPage?.push({
      type: 'Summary',
      id: 'mySummary',
      componentRef: props.componentRef,
    });

    return await renderWithNode<true, LayoutNode<'Summary'>>({
      nodeId: 'mySummary',
      inInstance: true,
      renderer: ({ node }) => <SummaryComponent summaryNode={node} />,
      initialPage: props.currentPageId,
      reduxState: {
        ...getInitialStateMock(),
        formValidations: {
          validations,
          invalidDataTypes: [],
        },
      },
      queries: {
        fetchLayouts: async () => mockLayout,
      },
    });
  };
});
