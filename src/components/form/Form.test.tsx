import React from 'react';

import { screen, within } from '@testing-library/react';

import { Form } from 'src/components/form/Form';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { CompExternal, ILayout } from 'src/layout/layout';
import type { CompSummaryExternal } from 'src/layout/Summary/config.generated';

describe('Form', () => {
  const mockComponents: ILayout = [
    {
      id: 'field1',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'Group.prop1',
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
        simpleBinding: 'Group.prop2',
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
        simpleBinding: 'Group.prop3',
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
      dataModelBindings: {
        group: 'Group',
      },
      maxCount: 3,
      children: ['field1', 'field2', 'field3'],
    },
  ];

  it('should render components and groups', async () => {
    await render();
    expect(screen.getByText('First title')).toBeInTheDocument();
    expect(screen.getByText('Second title')).toBeInTheDocument();
    expect(screen.getByText('Third title')).toBeInTheDocument();
  });

  it('should render DisplayGroupContainer and children if group is non repeating', async () => {
    const layoutWithNonRepGroup: ILayout = [
      ...mockComponents,
      {
        id: 'non-rep-group-id',
        type: 'Group',
        dataModelBindings: {
          group: 'Group',
        },
        children: ['non-rep-child'],
      },
      {
        id: 'non-rep-child',
        type: 'Input',
        dataModelBindings: {
          simpleBinding: 'Group.prop3',
        },
        textResourceBindings: {
          title: 'Title from non repeating child',
        },
        readOnly: false,
        required: false,
      },
    ];

    await render(layoutWithNonRepGroup);
    const container = screen.getByTestId('display-group-container');
    expect(container).toBeInTheDocument();
    expect(within(container).getByText('Title from non repeating child')).toBeInTheDocument();
  });

  it('should render PanelGroupContainer and children if group has panel prop', async () => {
    const layoutWithPanelGroup: ILayout = [
      ...mockComponents,
      {
        id: 'panel-group-id',
        type: 'Group',
        dataModelBindings: {
          group: 'Group',
        },
        children: ['panel-group-child'],
        panel: {
          variant: 'info',
        },
      },
      {
        id: 'panel-group-child',
        type: 'Input',
        dataModelBindings: {
          simpleBinding: 'Group.prop3',
        },
        textResourceBindings: {
          title: 'Title from panel child',
        },
        readOnly: false,
        required: false,
      },
    ];

    await render(layoutWithPanelGroup);
    const container = screen.getByTestId('panel-group-container');
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
    expect(screen.getByRole('button', { name: '1. FormLayout' })).toBeInTheDocument();
  });

  it('should not render ErrorReport when there are no validation errors', async () => {
    await render(mockComponents);
    expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
  });

  it.skip('should render ErrorReport when there are validation errors', async () => {
    await render(
      mockComponents,
      // mockValidations({
      //   component1: {
      //     simpleBinding: {
      //       errors: ['some error message'],
      //     },
      //   },
      // }),
    );
    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();
  });

  it.skip('should render ErrorReport when there are unmapped validation errors', async () => {
    await render(
      mockComponents,
      // mockValidations({
      //   unmapped: {
      //     simpleBinding: {
      //       errors: ['some error message'],
      //     },
      //   },
      // }),
    );
    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();
  });

  it.skip('should separate NavigationButtons and display them inside ErrorReport', async () => {
    await render(
      [
        ...mockComponents,
        {
          id: 'bottomNavButtons',
          type: 'NavigationButtons',
        },
      ],
      // mockValidations({
      //   component1: {
      //     simpleBinding: {
      //       errors: ['some error message'],
      //     },
      //   },
      // }),
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

  async function render(layout = mockComponents) {
    await renderWithInstanceAndLayout({
      renderer: () => <Form />,
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
      },
    });
  }

  // function mockValidations(validations: RootState['formValidations']['validations'][string]): Partial<RootState> {
  //   return {
  //     formValidations: {
  //       invalidDataTypes: [],
  //       validations: {
  //         page1: validations,
  //       },
  //     },
  //   };
  // }
});
