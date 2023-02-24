import {
  behavesLikeDataTask,
  createRepeatingGroupComponents,
  extractBottomButtons,
  findChildren,
  getRepeatingGroups,
  hasRequiredFields,
  mapFileUploadersWithTag,
  removeRepeatingGroupFromUIConfig,
  setMappingForRepeatingGroupComponent,
  topLevelComponents,
} from 'src/utils/formLayout';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayout, ILayoutComponent } from 'src/layout/layout';
import type { IAttachmentState } from 'src/shared/resources/attachments';
import type { ILayoutSets, IMapping, IRepeatingGroups, ITextResource } from 'src/types';

describe('setMappingForRepeatingGroupComponent', () => {
  it('should replace indexed mapping with the current index', () => {
    const mapping: IMapping = {
      'some.group[{0}].field1': 'mappedGroupField1',
      'some.group[{0}].field2': 'mappedGroupField2',
      'some.regular.field': 'mappedRegularField',
    };
    const expectedResult: IMapping = {
      'some.group[2].field1': 'mappedGroupField1',
      'some.group[2].field2': 'mappedGroupField2',
      'some.regular.field': 'mappedRegularField',
    };
    const result = setMappingForRepeatingGroupComponent(mapping, 2);
    expect(result).toEqual(expectedResult);
  });

  it('should replace indexed mapping with correct index for nested groups', () => {
    const mapping: IMapping = {
      'some.group[{0}].group[{1}].field1': 'mappedGroupField1',
      'some.group[{0}].group[{1}].field2': 'mappedGroupField2',
      'some.regular.field': 'mappedRegularField',
    };
    const expectedResult: IMapping = {
      'some.group[2].group[3].field1': 'mappedGroupField1',
      'some.group[2].group[3].field2': 'mappedGroupField2',
      'some.regular.field': 'mappedRegularField',
    };

    const firstIteration = setMappingForRepeatingGroupComponent(mapping, 2);
    const result = setMappingForRepeatingGroupComponent(firstIteration, 3);

    expect(result).toEqual(expectedResult);
  });
});

const testLayout: ILayout = [
  {
    id: 'Group1',
    type: 'Group',
    dataModelBindings: {
      group: 'Group1',
    },
    children: ['field1', 'Group2'],
    maxCount: 3,
  },
  {
    id: 'Group2',
    type: 'Group',
    dataModelBindings: {
      group: 'Group1.Group2',
    },
    maxCount: 4,
    children: ['field2'],
  },
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
  },
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
  },
];

describe('getRepeatingGroups', () => {
  it('should handle nested groups', () => {
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
        index: 2,
        dataModelBinding: 'Group1',
        editIndex: -1,
        multiPageIndex: -1,
      },
      'Group2-0': {
        index: 0,
        baseGroupId: 'Group2',
        dataModelBinding: 'Group1.Group2',
        editIndex: -1,
        multiPageIndex: -1,
      },
      'Group2-1': {
        index: 4,
        baseGroupId: 'Group2',
        dataModelBinding: 'Group1.Group2',
        editIndex: -1,
        multiPageIndex: -1,
      },
      'Group2-2': {
        index: 1,
        baseGroupId: 'Group2',
        dataModelBinding: 'Group1.Group2',
        editIndex: -1,
        multiPageIndex: -1,
      },
    };
    const result = getRepeatingGroups(testLayout, formData);
    expect(result).toEqual(expected);
  });

  it('should handle nested groups with index above 9', () => {
    const formData = {
      'Group1[0].prop1': 'value-0-1',
      'Group1[0].Group2[0].group2prop': 'group2-0-0-value',
      'Group1[1].prop1': 'value-1-1',
      'Group1[1].Group2[0].group2prop': 'group2-1-0-value',
      'Group1[1].Group2[1].group2prop': 'group2-1-1-value',
      'Group1[1].Group2[2].group2prop': 'group2-1-2-value',
      'Group1[1].Group2[3].group2prop': 'group2-1-3-value',
      'Group1[1].Group2[4].group2prop': 'group2-1-3-value',
      'Group1[1].Group2[5].group2prop': 'group2-1-3-value',
      'Group1[1].Group2[6].group2prop': 'group2-1-3-value',
      'Group1[1].Group2[7].group2prop': 'group2-1-3-value',
      'Group1[1].Group2[8].group2prop': 'group2-1-3-value',
      'Group1[1].Group2[9].group2prop': 'group2-1-3-value',
      'Group1[1].Group2[10].group2prop': 'group2-1-3-value',
      'Group1[2].prop1': 'value-2-1',
      'Group1[2].Group2[0].group2prop': 'group2-2-1-value',
      'Group1[2].Group2[1].group2prop': 'group2-2-2-value',
    };
    const expected = {
      Group1: {
        index: 2,
        dataModelBinding: 'Group1',
        editIndex: -1,
        multiPageIndex: -1,
      },
      'Group2-0': {
        index: 0,
        baseGroupId: 'Group2',
        dataModelBinding: 'Group1.Group2',
        editIndex: -1,
        multiPageIndex: -1,
      },
      'Group2-1': {
        index: 10,
        baseGroupId: 'Group2',
        dataModelBinding: 'Group1.Group2',
        editIndex: -1,
        multiPageIndex: -1,
      },
      'Group2-2': {
        index: 1,
        baseGroupId: 'Group2',
        dataModelBinding: 'Group1.Group2',
        editIndex: -1,
        multiPageIndex: -1,
      },
    };

    const result = getRepeatingGroups(testLayout, formData);
    expect(result).toEqual(expected);
  });

  it('should correctly handle out-of-order formData', () => {
    const formData = {
      'Group1[2].prop1': 'value-2-1',
      'Group1[2].Group2[1].group2prop': 'group2-2-2-value',
      'Group1[2].Group2[0].group2prop': 'group2-2-1-value',
      'Group1[1].prop1': 'value-1-1',
      'Group1[1].Group2[3].group2prop': 'group2-1-3-value',
      'Group1[1].Group2[4].group2prop': 'group2-1-3-value',
      'Group1[1].Group2[0].group2prop': 'group2-1-0-value',
      'Group1[1].Group2[1].group2prop': 'group2-1-1-value',
      'Group1[1].Group2[2].group2prop': 'group2-1-2-value',
      'Group1[0].Group2[0].group2prop': 'group2-0-0-value',
      'Group1[0].prop1': 'value-0-1',
    };
    const expected = {
      Group1: {
        index: 2,
        dataModelBinding: 'Group1',
        editIndex: -1,
        multiPageIndex: -1,
      },
      'Group2-0': {
        index: 0,
        baseGroupId: 'Group2',
        dataModelBinding: 'Group1.Group2',
        editIndex: -1,
        multiPageIndex: -1,
      },
      'Group2-1': {
        index: 4,
        baseGroupId: 'Group2',
        dataModelBinding: 'Group1.Group2',
        editIndex: -1,
        multiPageIndex: -1,
      },
      'Group2-2': {
        index: 1,
        baseGroupId: 'Group2',
        dataModelBinding: 'Group1.Group2',
        editIndex: -1,
        multiPageIndex: -1,
      },
    };
    const result = getRepeatingGroups(testLayout, formData);
    expect(result).toEqual(expected);
  });

  it('should return correct count', () => {
    const testLayout: ILayout = [
      {
        id: 'Group1',
        type: 'Group',
        dataModelBindings: {
          group: 'Group1',
        },
        children: ['field1'],
        maxCount: 3,
      },
      {
        id: 'Group2',
        type: 'Group',
        dataModelBindings: {
          group: 'Group2',
        },
        children: ['field2'],
        maxCount: 3,
      },
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
      },
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
      },
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
        index: 3,
        dataModelBinding: 'Group1',
        editIndex: -1,
        multiPageIndex: -1,
      },
      Group2: {
        index: 2,
        dataModelBinding: 'Group2',
        editIndex: -1,
        multiPageIndex: -1,
      },
    };
    const result = getRepeatingGroups(testLayout, formData);
    expect(result).toEqual(expected);
  });
  it('should return correct index from unordered formdata', () => {
    const testLayout: ILayout = [
      {
        id: 'Group1',
        type: 'Group',
        dataModelBindings: {
          group: 'Group1',
        },
        children: ['field1'],
        maxCount: 99,
      },
      {
        id: 'field1',
        type: 'Input',
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
    ];
    const formData = {
      'Group1[0].prop': 'value-0',
      'Group1[1].prop': 'value-1',
      'Group1[12].prop': 'value-1',
      'Group1[2].prop': 'value-2',
      'Group1[3].prop': 'value-3',
      'Group1[4].prop': 'value-0',
      'Group1[5].prop': 'value-1',
      'Group1[6].prop': 'value-2',
      'Group1[7].prop': 'value-3',
      'Group1[8].prop': 'value-3',
      'Group1[9].prop': 'value-3',
    };
    const expected = {
      Group1: {
        index: 12,
        dataModelBinding: 'Group1',
        editIndex: -1,
        multiPageIndex: -1,
      },
    };
    const result = getRepeatingGroups(testLayout, formData);
    expect(result).toEqual(expected);
  });
});

describe('removeRepeatingGroupFromUIConfig', () => {
  it('should delete given index', () => {
    const repeatingGroups: IRepeatingGroups = {
      Group: {
        index: 1,
      },
      'Group2-0': {
        index: 2,
      },
      'Group2-1': {
        index: 3,
      },
    };
    const result = removeRepeatingGroupFromUIConfig(repeatingGroups, 'Group2', 1, false);
    const expected: IRepeatingGroups = {
      Group: {
        index: 1,
      },
      'Group2-0': {
        index: 2,
      },
    };
    expect(result).toEqual(expected);
  });

  it('should shift successfully', () => {
    const repeatingGroups: IRepeatingGroups = {
      Group: {
        index: 1,
      },
      'Group2-0': {
        index: 2,
      },
      'Group2-1': {
        index: 3,
      },
    };
    const result = removeRepeatingGroupFromUIConfig(repeatingGroups, 'Group2', 0, true);
    const expected: IRepeatingGroups = {
      Group: {
        index: 1,
      },
      'Group2-0': {
        index: 3,
      },
    };
    expect(result).toEqual(expected);
  });
});

describe('createRepeatingGroupComponents', () => {
  it('should handle text resources with variables', () => {
    const testLayout: ILayout = [
      {
        id: 'Group1',
        type: 'Group',
        dataModelBindings: {
          group: 'Group1',
        },
        children: ['field1'],
        maxCount: 3,
      },
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
      },
    ];
    const mockTextResources = [
      {
        id: 'title-w-variable',
        value: 'Test 123 {0}',
        unparsedValue: 'Test 123 {0}',
        variables: [
          {
            key: 'Group1[{0}].prop1',
            dataSource: 'dataModel.default',
          },
        ],
      },
    ];

    const container = testLayout[0] as ExprUnresolved<ILayoutGroup>;
    const component = testLayout[1] as ExprUnresolved<ILayoutComponent>;
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

  it('should leave panel groups and children untouched', () => {
    const testLayout: ILayout = [
      {
        id: 'Group1',
        type: 'Group',
        dataModelBindings: {
          group: 'Group1',
        },
        children: ['field1', 'panel-group'],
        maxCount: 3,
      },
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
      },
      {
        id: 'panel-group',
        type: 'Group',
        dataModelBindings: {
          group: 'Group1',
        },
        children: ['panel-group-child'],
        panel: {
          groupReference: {
            group: 'some-group',
          },
        },
      },
      {
        id: 'panel-group-child',
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
      },
    ];

    const container = testLayout[0] as ExprUnresolved<ILayoutGroup>;
    const components = testLayout.splice(0, 1);

    const result = createRepeatingGroupComponents(container, components, 0, []);

    expect(result[0]).not.toEqual(components[0]);
    expect(result[1]).toEqual(components[1]);
    expect(result[2]).toEqual(components[2]);
  });

  it('baseComponentId should never contain group index', () => {
    const groupProps: Pick<
      ExprUnresolved<ILayoutGroup>,
      'type' | 'dataModelBindings' | 'textResourceBindings' | 'maxCount'
    > = {
      type: 'Group',
      dataModelBindings: {},
      textResourceBindings: { label: 't' },
      maxCount: 3,
    };
    const layout: (ILayout[number] & {
      baseComponentId: string;
    })[] = [
      {
        id: 'first-0',
        baseComponentId: 'first',
        children: ['second'],
        ...groupProps,
      },
      {
        id: 'second-0-1',
        baseComponentId: 'second',
        children: ['third'],
        ...groupProps,
      },
      {
        id: 'third-0-1-1',
        baseComponentId: 'third',
        children: ['fourth'],
        ...groupProps,
      },
      {
        id: 'input-0-1-1-2',
        type: 'Input',
        baseComponentId: 'input',
        dataModelBindings: {},
        textResourceBindings: { label: 't' },
      },
    ];

    const mockTextResources: ITextResource[] = [
      {
        id: 't',
        value: 'Text',
      },
    ];

    const result = createRepeatingGroupComponents(
      layout[0] as ExprUnresolved<ILayoutGroup>,
      layout,
      1,
      mockTextResources,
    );

    const allBaseComponentIds: string[] = [];
    const findBaseComponentId = (obj: any) => {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          findBaseComponentId(item);
        }
        return;
      }
      for (const key of Object.keys(obj)) {
        if (key === 'baseComponentId') {
          allBaseComponentIds.push(obj[key]);
        }
        if (typeof obj[key] === 'object') {
          findBaseComponentId(obj[key]);
        }
      }
    };

    findBaseComponentId(result);
    const numericBaseComponentIds = allBaseComponentIds.filter((id) => id.match(/\d+/));

    expect(numericBaseComponentIds).toEqual([]);
  });
});

describe('mapFileUploadersWithTag', () => {
  it('should return expected uiConfig', () => {
    const testLayout: ILayout = [
      {
        id: 'file-upload-with-tag1',
        type: 'FileUploadWithTag',
        textResourceBindings: {
          title: 'VedleggTest',
          description: 'VedleggsTestBeskrivelse',
          tagTitle: 'Datatype',
        },
        dataModelBindings: {},
        maxFileSizeInMB: 25,
        maxNumberOfAttachments: 15,
        minNumberOfAttachments: 1,
        displayMode: 'simple',
        required: true,
        optionsId: 'dataTypes',
        hasCustomFileEndings: true,
        validFileEndings: ['.jpeg', '.jpg', '.pdf'],
      },
      {
        id: 'file-upload-with-tag2',
        type: 'FileUploadWithTag',
        textResourceBindings: {
          title: 'VedleggTest',
          description: 'VedleggsTestBeskrivelse',
          tagTitle: 'Datatype',
        },
        dataModelBindings: {},
        maxFileSizeInMB: 25,
        maxNumberOfAttachments: 15,
        minNumberOfAttachments: 1,
        displayMode: 'simple',
        required: true,
        optionsId: 'dataTypes',
        hasCustomFileEndings: true,
        validFileEndings: ['.jpeg', '.jpg', '.pdf'],
      },
      {
        id: 'file-upload-with-tag3',
        type: 'FileUploadWithTag',
        textResourceBindings: {
          title: 'VedleggTest',
          description: 'VedleggsTestBeskrivelse',
          tagTitle: 'Datatype',
        },
        dataModelBindings: {},
        maxFileSizeInMB: 25,
        maxNumberOfAttachments: 15,
        minNumberOfAttachments: 1,
        displayMode: 'simple',
        required: true,
        optionsId: 'dataTypes',
        hasCustomFileEndings: true,
        validFileEndings: ['.jpeg', '.jpg', '.pdf'],
      },
    ];

    const testAttachments: IAttachmentState = {
      attachments: {
        'file-upload-with-tag1': [
          {
            name: 'test-1.pdf',
            size: 18302,
            uploaded: true,
            tags: ['TAG-1'],
            id: 'id-1',
            deleting: false,
            updating: false,
          },
          {
            name: 'test-2.pdf',
            size: 22165,
            uploaded: true,
            tags: ['TAG-2'],
            id: 'id-2',
            deleting: false,
            updating: false,
          },
        ],
        'file-upload-with-tag2': [
          {
            name: 'test-3.pdf',
            size: 18302,
            uploaded: true,
            tags: ['TAG-3'],
            id: 'id-3',
            deleting: false,
            updating: false,
          },
          {
            name: 'test-4.pdf',
            size: 22165,
            uploaded: true,
            tags: ['TAG-4'],
            id: 'id-4',
            deleting: false,
            updating: false,
          },
        ],
      },
    };
    const expected = {
      'file-upload-with-tag1': {
        editIndex: -1,
        chosenOptions: {
          'id-1': 'TAG-1',
          'id-2': 'TAG-2',
        },
      },
      'file-upload-with-tag2': {
        editIndex: -1,
        chosenOptions: {
          'id-3': 'TAG-3',
          'id-4': 'TAG-4',
        },
      },
    };
    const result = mapFileUploadersWithTag(testLayout, testAttachments);
    expect(result).toEqual(expected);
  });

  it('hasRequiredFields should discover required fields', () => {
    const layout: ILayout = [
      {
        id: 'field1',
        type: 'Input',
        required: true,
      },
      {
        id: 'field2',
        type: 'Input',
        required: false,
      },
    ];
    const result = hasRequiredFields(layout);
    expect(result).toBeTruthy();
  });
});

describe('findChildren', () => {
  it('should work with simple layouts', () => {
    const result1 = findChildren(testLayout);
    expect(result1).toHaveLength(2);

    const result2 = findChildren(testLayout, { rootGroupId: 'Group2' });
    expect(result2).toHaveLength(1);
    expect(result2[0].id).toEqual('field2');

    const result3 = findChildren(testLayout, {
      matching: (c) => c.id === 'field1',
    });
    expect(result3).toHaveLength(1);
    expect(result3[0].id).toEqual('field1');

    const result4 = findChildren(testLayout, {
      matching: (c) => c.id === 'field1',
      rootGroupId: 'Group2',
    });
    expect(result4).toHaveLength(0);
  });

  it('should work with multi-page groups', () => {
    const layout: ILayout = [
      {
        id: 'field1',
        type: 'Input',
      },
      {
        id: 'group1',
        type: 'Group',
        children: ['0:field2', '1:field3'],
        edit: { multiPage: true },
      },
      {
        id: 'field2',
        required: true,
        type: 'Input',
      },
      {
        id: 'field3',
        required: false,
        type: 'Input',
      },
    ];

    const result1 = findChildren(layout, {
      matching: (c) => c.required === true,
      rootGroupId: 'group1',
    });

    expect(result1).toHaveLength(1);
    expect(result1[0].id).toEqual('field2');

    const result2 = findChildren(layout, {
      rootGroupId: 'group1',
    });

    expect(result2).toHaveLength(2);
    expect(result2.map((c) => c.id)).toEqual(['field2', 'field3']);
  });

  it('should work with nested groups out-of-order', () => {
    const layout: ILayout = [
      {
        id: 'field1',
        type: 'Input',
      },
      {
        id: 'group0',
        type: 'Group',
        children: ['field4'],
        maxCount: 3,
      },
      {
        id: 'group1',
        type: 'Group',
        children: ['field2', 'field3', 'group0'],
        maxCount: 3,
      },
      {
        id: 'field2',
        required: true,
        type: 'Input',
      },
      {
        id: 'field3',
        required: false,
        type: 'Input',
      },
      {
        id: 'field4',
        required: true,
        type: 'Input',
      },
    ];

    const result1 = findChildren(layout, {
      matching: (c) => c.required === true,
    });

    expect(result1).toHaveLength(2);
    expect(result1.map((c) => c.id)).toEqual(['field2', 'field4']);

    const result2 = findChildren(layout, {
      rootGroupId: 'group1',
    });

    expect(result2).toHaveLength(3);
    expect(result2.map((c) => c.id)).toEqual(['field2', 'field3', 'field4']);
  });
});

function onlyIds(layout: ILayout): string[] {
  return layout.map((c) => c.id);
}

describe('topLevelComponents', () => {
  it('should only return the test layout group', () => {
    const output = topLevelComponents(testLayout);
    expect(onlyIds(output)).toEqual(['Group1']);
  });
  it('should also include a free-standing top level component', () => {
    const output = topLevelComponents([
      ...testLayout,
      {
        id: 'freeStanding',
        type: 'Button',
      },
    ]);
    expect(onlyIds(output)).toEqual(['Group1', 'freeStanding']);
  });
});

describe('extractBottomButtons', () => {
  it('should not extract anything from the test layout', () => {
    expect(extractBottomButtons(testLayout)).toEqual([testLayout, []]);
  });

  it('should extract a button from the end of the test layout', () => {
    const [layout, extractedButtons] = extractBottomButtons([
      ...topLevelComponents(testLayout),
      {
        id: 'bottomButton',
        type: 'Button',
      },
    ]);
    expect(onlyIds(layout)).toEqual(['Group1']);
    expect(onlyIds(extractedButtons)).toEqual(['bottomButton']);
  });

  it('should leave a bottom on the top alone', () => {
    const [, extractedButtons] = extractBottomButtons([
      {
        id: 'topButton',
        type: 'NavigationButtons',
      },
      ...testLayout,
      {
        id: 'bottomButton',
        type: 'NavigationButtons',
      },
    ]);
    expect(onlyIds(extractedButtons)).toEqual(['bottomButton']);
  });
});

describe('behavesLikeDataTask', () => {
  const layoutSets: ILayoutSets = {
    sets: [
      { id: 'set_1', dataType: 'SomeType', tasks: ['Task_1'] },
      { id: 'set_2', dataType: 'SomeType', tasks: ['Task_2'] },
    ],
  };
  it('should return true if a given task has configured a layout set', () => {
    const task = 'Task_1';
    const result = behavesLikeDataTask(task, layoutSets);
    expect(result).toBe(true);
  });

  it('should return false if a given task is not configured as a layout set', () => {
    const task = 'Task_3';
    const result = behavesLikeDataTask(task, layoutSets);
    expect(result).toBe(false);
  });
});
