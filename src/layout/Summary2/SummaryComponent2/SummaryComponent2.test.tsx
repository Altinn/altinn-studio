import React from 'react';

import { screen } from '@testing-library/react';

import { type BackendValidationIssue } from 'src/features/validation';
import { SummaryComponent2 } from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { CompExternal, ILayoutCollection } from 'src/layout/layout';
import type { CompSummary2External } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

describe('SummaryComponent', () => {
  const layoutMock = (
    components: string[] = ['Input', 'Group', 'FileUpload', 'FileUploadWithTag', 'Checkboxes'],
  ): ILayoutCollection => ({
    FormLayout: {
      data: {
        layout: [
          ...components.map(
            (t) =>
              ({
                id: t,
                type: t,
                dataModelBindings: t === 'Input' ? { simpleBinding: 'field' } : {},
                textResourceBindings: {},
                children: [],
                maxCount: 10,
              }) as CompExternal,
          ),
        ],
      },
    },
  });
  //
  test('should render Group', async () => {
    await render({
      summary2Config: {
        type: 'Summary2',
        id: 'Summary2',
        target: {
          type: 'component',
          id: 'Group',
        },
      },
    });
    expect(screen.getByTestId('summary-group-component')).toBeInTheDocument();
  });

  test('should render component if hideEmptyFields is set to false', async () => {
    await render({
      summary2Config: {
        type: 'Summary2',
        hideEmptyFields: false,
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
      },
    });
    // expect(screen.getByTestId('summary-single-value-component'));
    expect(screen.getByTestId('summary-single-value-component')).toBeInTheDocument();
  });

  test('should not render component if its set to hide if empty', async () => {
    await render({
      summary2Config: {
        type: 'Summary2',
        hideEmptyFields: true,
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
      },
    });
    const element = screen.queryByTestId('summary-single-value-component');
    expect(element).not.toBeInTheDocument();
  });

  test('should render component if its set to hide if empty, but the field is required', async () => {
    await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'Input',
                type: 'Input',
                dataModelBindings: { simpleBinding: 'field' },
                required: true,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        hideEmptyFields: true,
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
      },
    });
    expect(screen.getByTestId('summary-single-value-component')).toBeInTheDocument();
  });

  test('should render component if its set to hide if empty, but the component is set to forceShow', async () => {
    await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'Input',
                type: 'Input',
                dataModelBindings: { simpleBinding: 'field' },
                forceShowInSummary: true,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        hideEmptyFields: true,
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
      },
    });
    expect(screen.getByTestId('summary-single-value-component')).toBeInTheDocument();
  });

  test('should hide all empty components if hideEmptyFields=true', async () => {
    await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'Input',
                type: 'Input',
                dataModelBindings: { simpleBinding: 'field' },
                required: true,
              },
              {
                id: 'Input2',
                type: 'Input',
                dataModelBindings: { simpleBinding: 'field2' },
                required: true,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        hideEmptyFields: true,
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
      },
    });
    expect(screen.getByTestId('summary-single-value-component')).toBeInTheDocument();
  });

  test('should hide all empty components if hideEmptyFields=true and the component is not required', async () => {
    await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'Input',
                type: 'Input',
                dataModelBindings: { simpleBinding: 'field' },
                required: false,
              },
              {
                id: 'Input2',
                type: 'Input',
                dataModelBindings: { simpleBinding: 'field2' },
                required: false,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        hideEmptyFields: true,
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
      },
    });
    const element = screen.queryByTestId('summary-single-value-component');
    expect(element).not.toBeInTheDocument();
  });

  type IRenderProps = {
    currentPageId?: string;
    layout?: ILayoutCollection;
    validationIssues?: BackendValidationIssue[];
    summary2Config: CompSummary2External;
  };

  const render = async ({
    currentPageId,
    layout = layoutMock(),
    validationIssues = [],
    summary2Config,
  }: IRenderProps) => {
    const layoutPage = layout.FormLayout.data.layout;
    layoutPage?.push({
      type: 'Summary2',
      id: 'mySummary2',
      hideEmptyFields: summary2Config.hideEmptyFields,
      target: {
        id: summary2Config.target?.id || '',
        type: summary2Config.target?.type,
      },
    });

    return await renderWithNode<true, LayoutNode<'Summary2'>>({
      nodeId: 'mySummary2',
      inInstance: true,
      renderer: ({ node }) => <SummaryComponent2 summaryNode={node} />,
      initialPage: currentPageId,
      queries: {
        fetchLayouts: async () => layout,
        fetchBackendValidations: async () => validationIssues,
      },
    });
  };
});
