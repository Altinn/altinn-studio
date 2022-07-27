import * as React from 'react';

import { getFormLayoutGroupMock } from '__mocks__/mocks';
import { renderWithProviders } from 'testUtils';

import { RepeatingGroupTable } from 'src/features/form/containers/RepeatingGroupTable';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import type {
  ILayoutComponent,
  ILayoutGroup,
  ISelectionComponentProps,
} from 'src/features/form/layout';
import type { ILayoutState } from 'src/features/form/layout/formLayoutSlice';
import type { IAttachments } from 'src/shared/resources/attachments';
import type { IOption, ITextResource } from 'src/types';

describe('RepeatingGroupTable', () => {
  let mockContainer: ILayoutGroup;
  let mockLanguage: any;
  let mockTextResources: ITextResource[];
  let mockAttachments: IAttachments;
  let mockComponents: ILayoutComponent[];
  let mockLayout: ILayoutState;
  let mockCurrentView: string;
  let mockData: any;
  let mockOptions: IOption[];
  let repeatingGroupIndex: number;
  let mockRepeatingGroupDeepCopyComponents: Array<
    Array<ILayoutComponent | ILayoutGroup>
  >;

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

    mockContainer = getFormLayoutGroupMock({});

    mockLayout = {
      layouts: {
        FormLayout: [].concat(mockContainer).concat(mockComponents),
      },
      uiConfig: {
        hiddenFields: [],
        repeatingGroups: {
          'mock-container-id': {
            index: 3,
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

    mockTextResources = [{ id: 'option.label', value: 'Value to be shown' }];

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
    const { asFragment } = renderWithProviders(
      <RepeatingGroupTable
        container={mockContainer}
        attachments={mockAttachments}
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
