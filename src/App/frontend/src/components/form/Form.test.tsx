import React from 'react';

import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { defaultMockDataElementId } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { Form } from 'src/components/form/Form';
import { type BackendValidationIssue, BackendValidationSeverity } from 'src/features/validation';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { CompExternal, ILayout } from 'src/layout/layout';
import type { CompSummaryExternal } from 'src/layout/Summary/config.generated';

describe('Form', () => {
  const mockComponents: ILayout = [
    {
      id: 'field1',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.prop1' },
      },
      textResourceBindings: {
        title: 'First title',
      },
      readOnly: false,
      required: true,
    },
    {
      id: 'field2',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.prop2' },
      },
      textResourceBindings: {
        title: 'Second title',
      },
      readOnly: false,
      required: false,
    },
    {
      id: 'field3',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.prop3' },
      },
      textResourceBindings: {
        title: 'Third title',
      },
      readOnly: false,
      required: false,
    },
    {
      id: 'testGroupId',
      type: 'Group',
      children: ['field1', 'field2', 'field3'],
    },
  ];

  it('should render components and groups', async () => {
    await render();

    expect(screen.getByText('First title')).toBeInTheDocument();
    expect(screen.getByText('Second title')).toBeInTheDocument();
    expect(screen.getByText('Third title')).toBeInTheDocument();
  });

  it('should render GroupComponent and children if group is non repeating', async () => {
    const layoutWithNonRepGroup: ILayout = [
      ...mockComponents,
      {
        id: 'non-rep-group-id',
        type: 'Group',
        children: ['non-rep-child'],
      },
      {
        id: 'non-rep-child',
        type: 'Input',
        dataModelBindings: {
          simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.prop3' },
        },
        textResourceBindings: {
          title: 'Title from non repeating child',
        },
        readOnly: false,
        required: false,
      },
    ];

    await render(layoutWithNonRepGroup);
    const container = screen.getAllByTestId('display-group-container')[1];
    expect(container).toBeInTheDocument();
    expect(within(container).getByText('Title from non repeating child')).toBeInTheDocument();
  });

  it('should render GroupComponent as panel and children if group has panel prop', async () => {
    const layoutWithPanelGroup: ILayout = [
      ...mockComponents,
      {
        id: 'panel-group-id',
        type: 'Group',
        children: ['panel-group-child'],
        groupingIndicator: 'panel',
      },
      {
        id: 'panel-group-child',
        type: 'Input',
        dataModelBindings: {
          simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.prop3' },
        },
        textResourceBindings: {
          title: 'Title from panel child',
        },
        readOnly: false,
        required: false,
      },
    ];

    await render(layoutWithPanelGroup);
    const container = screen.getByTestId('fullWidthWrapper');
    expect(container).toBeInTheDocument();
    expect(within(container).getByText('Title from panel child')).toBeInTheDocument();
  });

  it('should render navbar', async () => {
    const layoutWithNavBar: ILayout = [
      ...mockComponents,
      {
        id: 'navBar',
        type: 'NavigationBar',
      } as CompExternal,
    ];
    await render(layoutWithNavBar);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1. This is a page title' })).toBeInTheDocument();
  });

  it('should not render ErrorReport when there are no validation errors', async () => {
    await render(mockComponents);
    expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
  });

  it('should render ErrorReport when there are validation errors', async () => {
    await render(mockComponents, [
      {
        customTextKey: 'some error message',
        field: 'Group.prop1',
        dataElementId: defaultMockDataElementId,
        source: 'custom',
        severity: BackendValidationSeverity.Error,
        showImmediately: true,
      } as BackendValidationIssue,
    ]);

    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();
  });

  it('should render ErrorReport when there are unmapped validation errors', async () => {
    await render(
      [
        ...mockComponents,
        {
          id: 'submitButton',
          type: 'Button',
          textResourceBindings: {
            title: 'Submit',
          },
        },
      ],
      [
        {
          code: 'some unmapped error message',
          field: 'Group[0].prop1',
          dataElementId: defaultMockDataElementId,
          severity: BackendValidationSeverity.Error,
          source: 'custom',
        } as BackendValidationIssue,
      ],
    );

    // Unmapped errors are not shown until submit is clicked
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await screen.findByTestId('ErrorReport');
  });

  it('should separate NavigationButtons and display them inside ErrorReport', async () => {
    await render(
      [
        ...mockComponents,
        {
          id: 'bottomNavButtons',
          type: 'NavigationButtons',
        },
      ],
      [
        {
          customTextKey: 'some error message',
          field: 'Group.prop1',
          dataElementId: defaultMockDataElementId,
          source: 'custom',
          severity: BackendValidationSeverity.Error,
          showImmediately: true,
        } as BackendValidationIssue,
      ],
    );

    const errorReport = screen.getByTestId('ErrorReport');
    expect(errorReport).toBeInTheDocument();

    expect(screen.getByTestId('NavigationButtons')).toBeInTheDocument();
    expect(within(errorReport).getByTestId('NavigationButtons')).toBeInTheDocument();
  });

  it('should render a summary component', async () => {
    await render([
      ...mockComponents,
      {
        id: 'the-summary',
        type: 'Summary',
        componentRef: 'field1',
      } as CompSummaryExternal,
    ]);
    expect(screen.getByTestId('summary-the-summary')).toBeInTheDocument();
  });

  async function render(layout = mockComponents, validationIssues: BackendValidationIssue[] = []) {
    await renderWithInstanceAndLayout({
      renderer: () => <Form />,
      initialPage: 'FormLayout',
      queries: {
        fetchFormData: async () => ({
          Group: [
            {
              prop1: 'value1',
              prop2: 'value2',
              prop3: 'value3',
            },
          ],
        }),
        fetchLayouts: () =>
          Promise.resolve({
            FormLayout: {
              data: {
                layout,
              },
            },
          }),
        fetchLayoutSettings: () => Promise.resolve({ pages: { order: ['FormLayout', '2', '3'] } }),
        fetchBackendValidations: () => Promise.resolve(validationIssues),
        fetchTextResources: async () => ({
          language: 'nb',
          resources: [
            {
              id: 'FormLayout',
              value: 'This is a page title',
            },
          ],
        }),
      },
    });
  }
});
