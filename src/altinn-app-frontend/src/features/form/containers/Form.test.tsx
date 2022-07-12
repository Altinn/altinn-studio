import * as React from 'react';
import { Form } from './Form';
import type { PreloadedState } from '@reduxjs/toolkit';
import type { RootState } from 'src/store';
import { renderWithProviders, mockMediaQuery } from 'src/../testUtils';
import type { ILayout, ILayoutComponent } from '../layout';
import { getFormLayoutStateMock } from 'src/../__mocks__/formLayoutStateMock';
import { screen, within } from '@testing-library/react';

const { setScreenWidth } = mockMediaQuery(992);

describe('Form.tsx', () => {
  beforeAll(() => {
    // Set screen size to desktop
    setScreenWidth(1200);
  });

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
      type: 'group',
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
        type: 'group',
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
        type: 'group',
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

  function renderForm(
    layout = mockComponents,
    customState: PreloadedState<RootState> = {},
  ) {
    renderWithProviders(<Form />, {
      preloadedState: {
        ...customState,
        formLayout: getFormLayoutStateMock({
          layouts: {
            FormLayout: layout,
          },
        }),
      },
    });
  }
});
