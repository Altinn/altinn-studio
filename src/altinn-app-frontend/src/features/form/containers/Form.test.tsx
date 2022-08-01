import * as React from 'react';
import { Route } from 'react-router-dom';

import { getFormLayoutStateMock } from '__mocks__/formLayoutStateMock';
import { screen, within } from '@testing-library/react';
import {
  MemoryRouterWithRedirectingRoot,
  renderWithProviders,
} from 'testUtils';
import type { PreloadedState } from '@reduxjs/toolkit';

import { Form } from 'src/features/form/containers/Form';
import type {
  ILayout,
  ILayoutComponent,
  ILayoutEntry,
} from 'src/features/form/layout';
import type { RootState } from 'src/store';

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
      disabled: false,
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
      disabled: false,
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
      disabled: false,
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

  it('should render components and groups', () => {
    renderForm();
    expect(screen.getByText('First title')).toBeInTheDocument();
    expect(screen.getByText('Second title')).toBeInTheDocument();
    expect(screen.getByText('Third title')).toBeInTheDocument();
  });

  it('should render DisplayGroupContainer and children if group is non repeating', () => {
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
        disabled: false,
      },
    ];

    renderForm(layoutWithNonRepGroup);
    const container = screen.getByTestId('display-group-container');
    expect(container).toBeInTheDocument();
    expect(
      within(container).getByText('Title from non repeating child'),
    ).toBeInTheDocument();
  });

  it('should render PanelGroupContainer and children if group has panel prop', () => {
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
        disabled: false,
      },
    ];

    renderForm(layoutWithPanelGroup);
    const container = screen.getByTestId('panel-group-container');
    expect(container).toBeInTheDocument();
    expect(
      within(container).getByText('Title from panel child'),
    ).toBeInTheDocument();
  });

  it('should render navbar', () => {
    const layoutWithNavBar: ILayout = [
      ...mockComponents,
      {
        id: 'navBar',
        type: 'NavigationBar',
      } as ILayoutComponent,
    ];
    renderForm(layoutWithNavBar);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('1. FormLayout')).toBeInTheDocument();
  });

  it('should not render ErrorReport when there are no validation errors', () => {
    renderForm(mockComponents);
    expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
  });

  it('should render ErrorReport when there are validation errors', () => {
    renderForm(
      mockComponents,
      mockValidations({
        component1: {
          simpleBinding: {
            errors: ['some error message'],
          },
        },
      }),
    );
    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();
  });

  it('should render ErrorReport when there are unmapped validation errors', () => {
    renderForm(
      mockComponents,
      mockValidations({
        unmapped: {
          simpleBinding: {
            errors: ['some error message'],
          },
        },
      }),
    );
    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();
  });

  it('should separate NavigationButtons and display them inside ErrorReport', () => {
    renderForm(
      [
        ...mockComponents,
        {
          id: 'bottomNavButtons',
          type: 'NavigationButtons',
        },
      ],
      mockValidations({
        component1: {
          simpleBinding: {
            errors: ['some error message'],
          },
        },
      }),
    );
    const errorReport = screen.getByTestId('ErrorReport');
    expect(errorReport).toBeInTheDocument();

    expect(screen.getByTestId('NavigationButtons')).toBeInTheDocument();

    expect(
      within(errorReport).getByTestId('NavigationButtons'),
    ).toBeInTheDocument();
  });

  it('should render a summary component', () => {
    const summaryComponent: ILayoutEntry[] = [
      ...mockComponents,
      {
        id: 'the-summary',
        type: 'Summary',
        pageRef: 'FormLayout',
        componentRef: 'field1',
      } as unknown as ILayoutEntry,
    ];
    renderForm(summaryComponent as ILayout);
    expect(screen.getByTestId('summary-component')).toBeInTheDocument();
  });

  function renderForm(
    layout = mockComponents,
    customState: PreloadedState<RootState> = {},
  ) {
    renderWithProviders(
      <MemoryRouterWithRedirectingRoot
        to={'/instance/123456/75154373-aed4-41f7-95b4-e5b5115c2edc'}
      >
        <Route
          path={'/instance/:partyId/:instanceGuid'}
          element={<Form />}
        />
      </MemoryRouterWithRedirectingRoot>,
      {
        preloadedState: {
          ...customState,
          formLayout: getFormLayoutStateMock({
            layouts: {
              FormLayout: layout,
            },
          }),
        },
      },
    );
  }

  function mockValidations(
    validations: RootState['formValidations']['validations'][string],
  ): Partial<RootState> {
    return {
      formValidations: {
        error: null,
        invalidDataTypes: [],
        currentSingleFieldValidation: {},
        validations: {
          page1: validations,
        },
      },
    };
  }
});
