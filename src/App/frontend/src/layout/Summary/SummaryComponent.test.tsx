import React from 'react';

import { act, fireEvent, screen } from '@testing-library/react';

import { defaultMockDataElementId } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { type BackendValidationIssue, BackendValidationSeverity } from 'src/features/validation';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { CompInputExternal } from 'src/layout/Input/config.generated';
import type { CompExternal, ILayoutCollection } from 'src/layout/layout';

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
                dataModelBindings:
                  t === 'Input' ? { simpleBinding: { dataType: defaultDataTypeMock, field: 'field' } } : {},
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
  test('should render with validation message', async () => {
    await render({
      componentRef: 'Input',
      validationIssues: [
        {
          customTextKey: 'Error message',
          field: 'field',
          dataElementId: defaultMockDataElementId,
          severity: BackendValidationSeverity.Error,
          source: 'custom',
          showImmediately: true,
        } as BackendValidationIssue,
      ],
    });
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
  test('should not render if hidden', async () => {
    const layout = layoutMock();
    const components = layout.FormLayout.data.layout;
    for (const component of components) {
      if (component.id === 'Input') {
        component.hidden = true;
      }
    }
    await render({ componentRef: 'Input', layout });

    expect(screen.queryByTestId('summary-item-simple')).not.toBeInTheDocument();
    expect(screen.queryByTestId('summary-item-group')).not.toBeInTheDocument();
    expect(screen.queryByText(/.+/)).not.toBeInTheDocument();
  });

  test('should get title text from resource or default', async () => {
    const layout = layoutMock();
    const firstComponent = layout.FormLayout.data.layout[0];
    (firstComponent as CompInputExternal).textResourceBindings = {
      title: 'default title',
    };

    await render({ componentRef: 'Input', layout });
    expect(screen.getByText('default title')).toBeInTheDocument();
  });

  test('should respond to on change click', async () => {
    await render({ componentRef: 'Input', currentPageId: 'otherPage' });

    const button = screen.getByRole('button');

    await act(async () => {
      fireEvent.click(button);
    });
  });

  type IRenderProps = {
    componentRef: string;
    currentPageId?: string;
    layout?: ILayoutCollection;
    validationIssues?: BackendValidationIssue[];
  };

  const render = async ({
    componentRef,
    currentPageId,
    layout = layoutMock(),
    validationIssues = [],
  }: IRenderProps) => {
    const layoutPage = layout.FormLayout.data.layout;
    layoutPage?.push({
      type: 'Summary',
      id: 'mySummary',
      componentRef,
    });

    return await renderWithInstanceAndLayout({
      renderer: <SummaryComponent summaryBaseId='mySummary' />,
      initialPage: currentPageId,
      queries: {
        fetchLayouts: async () => layout,
        fetchBackendValidations: async () => validationIssues,
        fetchLayoutSettings: async () => ({
          pages: {
            order: currentPageId ? ['FormLayout', currentPageId] : ['FormLayout'],
          },
        }),
      },
    });
  };
});
