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
  const mockLayoutId = 'FormLayout';
  const mockLayoutName = 'This is a page title';
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

    await render({ layout: layoutWithNonRepGroup });
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

    await render({ layout: layoutWithPanelGroup });
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
    await render({ layout: layoutWithNavBar });
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `1. ${mockLayoutName}` })).toBeInTheDocument();
  });

  it('should not render ErrorReport when there are no validation errors', async () => {
    await render();
    expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
  });

  it('should render ErrorReport when there are validation errors', async () => {
    await render({
      validationIssues: [
        {
          customTextKey: 'some error message',
          field: 'Group.prop1',
          dataElementId: defaultMockDataElementId,
          source: 'custom',
          severity: BackendValidationSeverity.Error,
          showImmediately: true,
        } as BackendValidationIssue,
      ],
    });

    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();
  });

  it('should render ErrorReport when there are unmapped validation errors', async () => {
    await render({
      layout: [
        ...mockComponents,
        {
          id: 'submitButton',
          type: 'Button',
          textResourceBindings: {
            title: 'Submit',
          },
        },
      ],
      validationIssues: [
        {
          code: 'some unmapped error message',
          field: 'Group[0].prop1',
          dataElementId: defaultMockDataElementId,
          severity: BackendValidationSeverity.Error,
          source: 'custom',
        } as BackendValidationIssue,
      ],
    });

    // Unmapped errors are not shown until submit is clicked
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await screen.findByTestId('ErrorReport');
  });

  it('should separate NavigationButtons and display them inside ErrorReport', async () => {
    await render({
      layout: [
        ...mockComponents,
        {
          id: 'bottomNavButtons',
          type: 'NavigationButtons',
        },
      ],
      validationIssues: [
        {
          customTextKey: 'some error message',
          field: 'Group.prop1',
          dataElementId: defaultMockDataElementId,
          source: 'custom',
          severity: BackendValidationSeverity.Error,
          showImmediately: true,
        } as BackendValidationIssue,
      ],
    });

    const errorReport = screen.getByTestId('ErrorReport');
    expect(errorReport).toBeInTheDocument();

    expect(screen.getByTestId('NavigationButtons')).toBeInTheDocument();
    expect(within(errorReport).getByTestId('NavigationButtons')).toBeInTheDocument();
  });

  it('should render a summary component', async () => {
    await render({
      layout: [
        ...mockComponents,
        {
          id: 'the-summary',
          type: 'Summary',
          componentRef: 'field1',
        } as CompSummaryExternal,
      ],
    });
    expect(screen.getByTestId('summary-the-summary')).toBeInTheDocument();
  });

  it('should not throw warning in console when page id and value are the same', async () => {
    const logWarnOnceSpy = jest.spyOn(window, 'logWarnOnce').mockImplementation(() => {});
    await render({ layoutTextValue: mockLayoutId });
    expect(logWarnOnceSpy).not.toHaveBeenCalled();
    logWarnOnceSpy.mockRestore();
  });

  it('should warn when layout does not have a text resource for the page id', async () => {
    const logWarnOnceSpy = jest.spyOn(window, 'logWarnOnce').mockImplementation(() => {});
    await render({ layoutTextId: 'otherId' });
    expect(logWarnOnceSpy).toHaveBeenCalledWith(expect.stringContaining('You have not set a page title for this page'));
    logWarnOnceSpy.mockRestore();
  });

  type RenderOptions = {
    layout?: ILayout;
    validationIssues?: BackendValidationIssue[];
    layoutTextId?: string;
    layoutTextValue?: string;
  };

  async function render({
    layout = mockComponents,
    validationIssues = [],
    layoutTextId = mockLayoutId,
    layoutTextValue = mockLayoutName,
  }: RenderOptions = {}) {
    await renderWithInstanceAndLayout({
      renderer: () => <Form />,
      initialPage: mockLayoutId,
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
        fetchLayoutSettings: () => Promise.resolve({ pages: { order: [mockLayoutId, '2', '3'] } }),
        fetchBackendValidations: () => Promise.resolve(validationIssues),
        fetchTextResources: async () => ({
          language: 'nb',
          resources: [
            {
              id: layoutTextId,
              value: layoutTextValue,
            },
          ],
        }),
      },
    });
  }
});
