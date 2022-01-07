
import '@testing-library/jest-dom/extend-expect';
import 'jest';
import * as React from 'react';
import { render } from '@testing-library/react';
import { RepeatingGroupTable } from '../../../../src/features/form/containers/RepeatingGroupTable';
import { ILayoutComponent, ILayoutGroup, ISelectionComponentProps } from '../../../../src/features/form/layout';
import { IOption, ITextResource } from '../../../../src/types';
import { ILayoutState } from '../../../../src/features/form/layout/formLayoutSlice';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';

describe('features > form > containers > RepeatingGroupTable.tsx', () => {
  let mockContainer: ILayoutGroup;
  let mockLanguage: any;
  let mockTextResources: ITextResource[];
  let mockComponents: ILayoutComponent[];
  let mockLayout: ILayoutState;
  let mockCurrentView: string;
  let mockData: any;
  let mockOptions: IOption[];
  let repeatingGroupIndex: number;
  let mockRepeatingGroupDeepCopyComponents: Array<Array<ILayoutComponent | ILayoutGroup>>;

  beforeEach(() => {
    mockOptions = [{ value: 'option.value', label: 'option.label' }];
    mockComponents = [
      {
        id: 'field1',
        type: 'Input',
        dataModelBindings: {
          simpleBinding: 'Group.prop1',
        },
        textResourceBindings: {
          title: 'Title1',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
      {
        id: 'field2',
        type: 'Input',
        dataModelBindings: {
          simpleBinding: 'Group.prop2',
        },
        textResourceBindings: {
          title: 'Title2',
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
          title: 'Title3',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
      {
        id: 'field4',
        type: 'Checkboxes',
        dataModelBindings: {
          simpleBinding: 'some-group.checkboxBinding',
        },
        textResourceBindings: {
          title: 'Title4',
        },
        readOnly: false,
        required: false,
        disabled: false,
        options: mockOptions,
      } as ISelectionComponentProps,
    ];

    mockContainer = {
      type: 'Group',
      id: 'mock-container-id',
      children: [
        'field1',
        'field2',
        'field3',
        'field4',
      ],
      maxCount: 8,
      dataModelBindings: {
        group: 'some-group',
      },
    };

    mockLayout = {
      layouts: {
        FormLayout: [].concat(mockContainer).concat(mockComponents),
      },
      uiConfig: {
        hiddenFields: [],
        repeatingGroups: {
          'mock-container-id': {
            count: 3,
          },
        },
        autoSave: false,
        currentView: 'FormLayout',
        focus: undefined,
        layoutOrder: ['FormLayout'],
      },
      error: null,
      layoutsets: null,
    };

    mockData = {
      formData: {
        'some-group[1].checkboxBinding': 'option.value',
      },
    };

    mockTextResources = [
      { id: 'option.label', value: 'Value to be shown' },
    ];

    mockCurrentView = 'FormLayout';
    repeatingGroupIndex = 3;
    mockRepeatingGroupDeepCopyComponents = createRepeatingGroupComponents(
      mockContainer,
      mockComponents,
      repeatingGroupIndex,
      mockTextResources,
    );
  });

  it('should match snapshot', () => {
    const { asFragment } = render(
      <RepeatingGroupTable
        container={mockContainer}
        language={mockLanguage}
        textResources={mockTextResources}
        components={mockComponents}
        currentView={mockCurrentView}
        editIndex={-1}
        formData={mockData}
        hiddenFields={[]}
        id={mockContainer.id}
        layout={mockLayout.layouts[mockCurrentView]}
        options={{}}
        repeatingGroupDeepCopyComponents={mockRepeatingGroupDeepCopyComponents}
        repeatingGroupIndex={repeatingGroupIndex}
        repeatingGroups={mockLayout.uiConfig.repeatingGroups}
        setEditIndex={jest.fn()}
        validations={{}}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
