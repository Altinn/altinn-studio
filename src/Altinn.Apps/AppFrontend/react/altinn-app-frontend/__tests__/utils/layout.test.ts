import 'jest';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../../src/features/form/layout';
import { IAttachmentState } from '../../src/shared/resources/attachments/attachmentReducer';
import { IRepeatingGroups } from '../../src/types';
import { createRepeatingGroupComponents, getFileUploadersWithTag, getRepeatingGroups, removeRepeatingGroupFromUIConfig } from '../../src/utils/formLayout';

describe('>>> layout.ts', () => {
  it('+++ getRepeatingGroups should handle nested groups', () => {
    const testLayout: ILayout = [
      {
        id: 'Group1',
        type: 'group',
        dataModelBindings: {
          group: 'Group1',
        },
        children: [
          'field1',
          'Group2',
        ],
        maxCount: 3,
      } as ILayoutGroup,
      {
        id: 'Group2',
        type: 'Group',
        dataModelBindings: {
          group: 'Group1.Group2',
        },
        maxCount: 4,
        children: [
          'field2',
        ],
      } as ILayoutGroup,
      {
        id: 'field1',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group1.prop1',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      } as ILayoutComponent,
      {
        id: 'field2',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group1.Group2.prop1',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      } as ILayoutComponent,
    ];
    const formData = {
      'Group1[0].prop1': 'value-0-1',
      'Group1[0].Group2[0].group2prop': 'group2-0-0-value',
      'Group1[1].prop1': 'value-1-1',
      'Group1[1].Group2[0].group2prop': 'group2-1-0-value',
      'Group1[1].Group2[1].group2prop': 'group2-1-1-value',
      'Group1[1].Group2[2].group2prop': 'group2-1-2-value',
      'Group1[1].Group2[3].group2prop': 'group2-1-3-value',
      'Group1[1].Group2[4].group2prop': 'group2-1-3-value',
      'Group1[2].prop1': 'value-2-1',
      'Group1[2].Group2[0].group2prop': 'group2-2-1-value',
      'Group1[2].Group2[1].group2prop': 'group2-2-2-value',
    };
    const expected = {
      Group1: {
        count: 2,
        dataModelBinding: 'Group1',
        editIndex: -1,
      },
      'Group2-0': {
        count: 0,
        baseGroupId: 'Group2',
        editIndex: -1,
      },
      'Group2-1': {
        count: 4,
        baseGroupId: 'Group2',
        editIndex: -1,
      },
      'Group2-2': {
        count: 1,
        baseGroupId: 'Group2',
        editIndex: -1,
      },
    };
    const result = getRepeatingGroups(testLayout, formData);
    expect(result).toEqual(expected);
  });

  it('+++ getRepeatingGroups should return correct count', () => {
    const testLayout: ILayout = [
      {
        id: 'Group1',
        type: 'group',
        dataModelBindings: {
          group: 'Group1',
        },
        children: [
          'field1',
        ],
        maxCount: 3,
      } as ILayoutGroup,
      {
        id: 'Group2',
        type: 'group',
        dataModelBindings: {
          group: 'Group2',
        },
        children: [
          'field2',
        ],
        maxCount: 3,
      } as ILayoutGroup,
      {
        id: 'field1',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group.prop1',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      } as ILayoutComponent,
      {
        id: 'field2',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group2.prop1',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      } as ILayoutComponent,
    ];
    const formData = {
      'Group1[0].prop1': 'value-0-1',
      'Group1[1].prop1': 'value-1-1',
      'Group1[2].prop1': 'value-2-1',
      'Group1[3].prop1': 'value-3-1',
      'Group2[0].prop1': 'value-0-1',
      'Group2[1].prop1': 'value-1-1',
      'Group2[2].prop1': 'value-2-1',
    };
    const expected = {
      Group1: {
        count: 3,
        dataModelBinding: 'Group1',
        editIndex: -1,
      },
      Group2: {
        count: 2,
        dataModelBinding: 'Group2',
        editIndex: -1,
      },
    };
    const result = getRepeatingGroups(testLayout, formData);
    expect(result).toEqual(expected);
  });

  it('+++ removeRepeatingGroupFromUIConfig should delete given index', () => {
    const repeatingGroups: IRepeatingGroups = {
      Group: {
        count: 1,
      },
      'Group2-0': {
        count: 2,
      },
      'Group2-1': {
        count: 3,
      },
    };
    const result = removeRepeatingGroupFromUIConfig(repeatingGroups, 'Group2', 1, false);
    const expected: IRepeatingGroups = {
      Group: {
        count: 1,
      },
      'Group2-0': {
        count: 2,
      },
    };
    expect(result).toEqual(expected);
  });

  it('+++ removeRepeatingGroupFromUIConfig should shift successfully', () => {
    const repeatingGroups: IRepeatingGroups = {
      Group: {
        count: 1,
      },
      'Group2-0': {
        count: 2,
      },
      'Group2-1': {
        count: 3,
      },
    };
    const result = removeRepeatingGroupFromUIConfig(repeatingGroups, 'Group2', 0, true);
    const expected: IRepeatingGroups = {
      Group: {
        count: 1,
      },
      'Group2-0': {
        count: 3,
      },
    };
    expect(result).toEqual(expected);
  });

  it('+++ createRepeatingGroupComponents should handle text resources with variables', () => {
    const testLayout: ILayout = [
      {
        id: 'Group1',
        type: 'group',
        dataModelBindings: {
          group: 'Group1',
        },
        children: [
          'field1',
        ],
        maxCount: 3,
      } as ILayoutGroup,
      {
        id: 'field1',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group1.prop1',
        },
        textResourceBindings: {
          title: 'title-w-variable',
        },
        readOnly: false,
        required: false,
        disabled: false,
      } as ILayoutComponent,
    ];
    const mockTextResources = [
      {
        id: 'title-w-variable',
        value: 'Test 123 {0}',
        unparsedValue: 'Test 123 {0}',
        variables: [{
          key: 'Group1[{0}].prop1',
          dataSource: 'dataModel.default',
        }],
      },
    ];

    const container: ILayoutGroup = testLayout[0] as ILayoutGroup;
    const component : ILayoutComponent = testLayout[1] as ILayoutComponent;
    const expected = [
      [
        {
          ...testLayout[1],
          id: `${component.id}-0`,
          hidden: false,
          baseComponentId: 'field1',
          dataModelBindings: {
            simple: 'Group1[0].prop1',
          },
          textResourceBindings: {
            title: 'title-w-variable-0',
          },
        },
      ],
      [
        {
          ...testLayout[1],
          id: `${component.id}-1`,
          hidden: false,
          baseComponentId: 'field1',
          dataModelBindings: {
            simple: 'Group1[1].prop1',
          },
          textResourceBindings: {
            title: 'title-w-variable-1',
          },
        },
      ],
    ];

    const result = createRepeatingGroupComponents(container, [testLayout[1]], 1, mockTextResources);

    expect(result).toEqual(expected);
  });

  it('+++ getFileUploadersWithTag should return expected uiConfig', () => {
    const testLayout: ILayout = [
      {
        id: 'file-upload-with-tag-1',
        type: 'FileUploadWithTag',
        textResourceBindings: {
          title: 'VedleggTest',
          description: 'VedleggsTestBeskrivelse',
          tagTitle: 'Datatype'
        },
        dataModelBindings: {},
        maxFileSizeInMB: 25,
        maxNumberOfAttachments: 15,
        minNumberOfAttachments: 1,
        displayMode: 'simple',
        required: true,
        optionsId: 'dataTypes',
        hasCustomFileEndings: true,
        validFileEndings: [
          '.jpeg',
          '.jpg',
          '.pdf'
        ]
      } as ILayoutComponent,
      {
        id: 'file-upload-with-tag-2',
        type: 'FileUploadWithTag',
        textResourceBindings: {
          title: 'VedleggTest',
          description: 'VedleggsTestBeskrivelse',
          tagTitle: 'Datatype'
        },
        dataModelBindings: {},
        maxFileSizeInMB: 25,
        maxNumberOfAttachments: 15,
        minNumberOfAttachments: 1,
        displayMode: 'simple',
        required: true,
        optionsId: 'dataTypes',
        hasCustomFileEndings: true,
        validFileEndings: [
          '.jpeg',
          '.jpg',
          '.pdf'
        ]
      } as ILayoutComponent,
      {
        id: 'file-upload-with-tag-3',
        type: 'FileUploadWithTag',
        textResourceBindings: {
          title: 'VedleggTest',
          description: 'VedleggsTestBeskrivelse',
          tagTitle: 'Datatype'
        },
        dataModelBindings: {},
        maxFileSizeInMB: 25,
        maxNumberOfAttachments: 15,
        minNumberOfAttachments: 1,
        displayMode: 'simple',
        required: true,
        optionsId: 'dataTypes',
        hasCustomFileEndings: true,
        validFileEndings: [
          '.jpeg',
          '.jpg',
          '.pdf'
        ]
      } as ILayoutComponent
    ];
    const testAttachments: IAttachmentState = {
      attachments: {
        'file-upload-with-tag-1': [
          {
            name: 'test-1.pdf',
            size: 18302,
            uploaded: true,
            tags: [
              'TAG-1'
            ],
            id: 'id-1',
            deleting: false,
            updating: false
          },
          {
            name: 'test-2.pdf',
            size: 22165,
            uploaded: true,
            tags: [
              'TAG-2'
            ],
            id: 'id-2',
            deleting: false,
            updating: false
          }
        ],
        'file-upload-with-tag-2': [
          {
            name: 'test-3.pdf',
            size: 18302,
            uploaded: true,
            tags: [
              'TAG-3'
            ],
            id: 'id-3',
            deleting: false,
            updating: false
          },
          {
            name: 'test-4.pdf',
            size: 22165,
            uploaded: true,
            tags: [
              'TAG-4'
            ],
            id: 'id-4',
            deleting: false,
            updating: false
          }
        ],
      }
    };
    const expected = {
      'file-upload-with-tag-1': {
        editIndex: -1,
        chosenOptions: {
          'id-1': 'TAG-1',
          'id-2': 'TAG-2'
        }
      },
      'file-upload-with-tag-2': {
        editIndex: -1,
        chosenOptions: {
          'id-3': 'TAG-3',
          'id-4': 'TAG-4'
        }
      },
      'file-upload-with-tag-3': {
        editIndex: -1,
        chosenOptions: {
        }
      }
    };
    const result = getFileUploadersWithTag(testLayout, testAttachments);
    expect(result).toEqual(expected);
  });
});
