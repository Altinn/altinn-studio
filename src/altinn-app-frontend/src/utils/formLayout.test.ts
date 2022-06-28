import type {
  ILayout,
  ILayoutComponent,
  ILayoutGroup,
} from "src/features/form/layout";
import type { IAttachmentState } from "src/shared/resources/attachments/attachmentReducer";
import type { IRepeatingGroups, IMapping, ITextResource } from "src/types";

import {
  createRepeatingGroupComponents,
  mapFileUploadersWithTag,
  getRepeatingGroups,
  hasRequiredFields,
  removeRepeatingGroupFromUIConfig,
  setMappingForRepeatingGroupComponent,
  findChildren,
} from "./formLayout";

describe("setMappingForRepeatingGroupComponent", () => {
  it("should replace indexed mapping with the current index", () => {
    const mapping: IMapping = {
      "some.group[{0}].field1": "mappedGroupField1",
      "some.group[{0}].field2": "mappedGroupField2",
      "some.regular.field": "mappedRegularField",
    };
    const expectedResult: IMapping = {
      "some.group[2].field1": "mappedGroupField1",
      "some.group[2].field2": "mappedGroupField2",
      "some.regular.field": "mappedRegularField",
    };
    const result = setMappingForRepeatingGroupComponent(mapping, 2);
    expect(result).toEqual(expectedResult);
  });
});

describe("formLayout", () => {
  const testLayout: ILayout = [
    {
      id: "Group1",
      type: "group",
      dataModelBindings: {
        group: "Group1",
      },
      children: ["field1", "Group2"],
      maxCount: 3,
    } as ILayoutGroup,
    {
      id: "Group2",
      type: "Group",
      dataModelBindings: {
        group: "Group1.Group2",
      },
      maxCount: 4,
      children: ["field2"],
    } as ILayoutGroup,
    {
      id: "field1",
      type: "Input",
      dataModelBindings: {
        simple: "Group1.prop1",
      },
      textResourceBindings: {
        title: "Title",
      },
      readOnly: false,
      required: false,
      disabled: false,
    } as ILayoutComponent,
    {
      id: "field2",
      type: "Input",
      dataModelBindings: {
        simple: "Group1.Group2.prop1",
      },
      textResourceBindings: {
        title: "Title",
      },
      readOnly: false,
      required: false,
      disabled: false,
    } as ILayoutComponent,
  ];

  it("getRepeatingGroups should handle nested groups", () => {
    const formData = {
      "Group1[0].prop1": "value-0-1",
      "Group1[0].Group2[0].group2prop": "group2-0-0-value",
      "Group1[1].prop1": "value-1-1",
      "Group1[1].Group2[0].group2prop": "group2-1-0-value",
      "Group1[1].Group2[1].group2prop": "group2-1-1-value",
      "Group1[1].Group2[2].group2prop": "group2-1-2-value",
      "Group1[1].Group2[3].group2prop": "group2-1-3-value",
      "Group1[1].Group2[4].group2prop": "group2-1-3-value",
      "Group1[2].prop1": "value-2-1",
      "Group1[2].Group2[0].group2prop": "group2-2-1-value",
      "Group1[2].Group2[1].group2prop": "group2-2-2-value",
    };
    const expected = {
      Group1: {
        index: 2,
        dataModelBinding: "Group1",
        editIndex: -1,
      },
      "Group2-0": {
        index: 0,
        baseGroupId: "Group2",
        editIndex: -1,
      },
      "Group2-1": {
        index: 4,
        baseGroupId: "Group2",
        editIndex: -1,
      },
      "Group2-2": {
        index: 1,
        baseGroupId: "Group2",
        editIndex: -1,
      },
    };
    const result = getRepeatingGroups(testLayout, formData);
    expect(result).toEqual(expected);
  });

  it("getRepeatingGroups should return correct count", () => {
    const testLayout: ILayout = [
      {
        id: "Group1",
        type: "group",
        dataModelBindings: {
          group: "Group1",
        },
        children: ["field1"],
        maxCount: 3,
      } as ILayoutGroup,
      {
        id: "Group2",
        type: "group",
        dataModelBindings: {
          group: "Group2",
        },
        children: ["field2"],
        maxCount: 3,
      } as ILayoutGroup,
      {
        id: "field1",
        type: "Input",
        dataModelBindings: {
          simple: "Group.prop1",
        },
        textResourceBindings: {
          title: "Title",
        },
        readOnly: false,
        required: false,
        disabled: false,
      } as ILayoutComponent,
      {
        id: "field2",
        type: "Input",
        dataModelBindings: {
          simple: "Group2.prop1",
        },
        textResourceBindings: {
          title: "Title",
        },
        readOnly: false,
        required: false,
        disabled: false,
      } as ILayoutComponent,
    ];
    const formData = {
      "Group1[0].prop1": "value-0-1",
      "Group1[1].prop1": "value-1-1",
      "Group1[2].prop1": "value-2-1",
      "Group1[3].prop1": "value-3-1",
      "Group2[0].prop1": "value-0-1",
      "Group2[1].prop1": "value-1-1",
      "Group2[2].prop1": "value-2-1",
    };
    const expected = {
      Group1: {
        index: 3,
        dataModelBinding: "Group1",
        editIndex: -1,
      },
      Group2: {
        index: 2,
        dataModelBinding: "Group2",
        editIndex: -1,
      },
    };
    const result = getRepeatingGroups(testLayout, formData);
    expect(result).toEqual(expected);
  });

  it("removeRepeatingGroupFromUIConfig should delete given index", () => {
    const repeatingGroups: IRepeatingGroups = {
      Group: {
        index: 1,
      },
      "Group2-0": {
        index: 2,
      },
      "Group2-1": {
        index: 3,
      },
    };
    const result = removeRepeatingGroupFromUIConfig(
      repeatingGroups,
      "Group2",
      1,
      false
    );
    const expected: IRepeatingGroups = {
      Group: {
        index: 1,
      },
      "Group2-0": {
        index: 2,
      },
    };
    expect(result).toEqual(expected);
  });

  it("removeRepeatingGroupFromUIConfig should shift successfully", () => {
    const repeatingGroups: IRepeatingGroups = {
      Group: {
        index: 1,
      },
      "Group2-0": {
        index: 2,
      },
      "Group2-1": {
        index: 3,
      },
    };
    const result = removeRepeatingGroupFromUIConfig(
      repeatingGroups,
      "Group2",
      0,
      true
    );
    const expected: IRepeatingGroups = {
      Group: {
        index: 1,
      },
      "Group2-0": {
        index: 3,
      },
    };
    expect(result).toEqual(expected);
  });

  it("createRepeatingGroupComponents should handle text resources with variables", () => {
    const testLayout: ILayout = [
      {
        id: "Group1",
        type: "group",
        dataModelBindings: {
          group: "Group1",
        },
        children: ["field1"],
        maxCount: 3,
      } as ILayoutGroup,
      {
        id: "field1",
        type: "Input",
        dataModelBindings: {
          simple: "Group1.prop1",
        },
        textResourceBindings: {
          title: "title-w-variable",
        },
        readOnly: false,
        required: false,
        disabled: false,
      } as ILayoutComponent,
    ];
    const mockTextResources = [
      {
        id: "title-w-variable",
        value: "Test 123 {0}",
        unparsedValue: "Test 123 {0}",
        variables: [
          {
            key: "Group1[{0}].prop1",
            dataSource: "dataModel.default",
          },
        ],
      },
    ];

    const container: ILayoutGroup = testLayout[0] as ILayoutGroup;
    const component: ILayoutComponent = testLayout[1] as ILayoutComponent;
    const expected = [
      [
        {
          ...testLayout[1],
          id: `${component.id}-0`,
          hidden: false,
          baseComponentId: "field1",
          dataModelBindings: {
            simple: "Group1[0].prop1",
          },
          textResourceBindings: {
            title: "title-w-variable-0",
          },
        },
      ],
      [
        {
          ...testLayout[1],
          id: `${component.id}-1`,
          hidden: false,
          baseComponentId: "field1",
          dataModelBindings: {
            simple: "Group1[1].prop1",
          },
          textResourceBindings: {
            title: "title-w-variable-1",
          },
        },
      ],
    ];

    const result = createRepeatingGroupComponents(
      container,
      [testLayout[1]],
      1,
      mockTextResources
    );

    expect(result).toEqual(expected);
  });

  it("baseComponentId should never contain group index", () => {
    const groupProps: Pick<
      ILayoutGroup,
      "type" | "dataModelBindings" | "textResourceBindings" | "maxCount"
    > = {
      type: "Group",
      dataModelBindings: {},
      textResourceBindings: { label: "t" },
      maxCount: 3,
    };
    const layout: ((ILayoutGroup | ILayoutComponent) & {
      baseComponentId: string;
    })[] = [
      {
        id: "first-0",
        baseComponentId: "first",
        children: ["second"],
        ...groupProps,
      },
      {
        id: "second-0-1",
        baseComponentId: "second",
        children: ["third"],
        ...groupProps,
      },
      {
        id: "third-0-1-1",
        baseComponentId: "third",
        children: ["fourth"],
        ...groupProps,
      },
      {
        id: "input-0-1-1-2",
        type: "Input",
        baseComponentId: "input",
        dataModelBindings: {},
        textResourceBindings: { label: "t" },
      },
    ];

    const mockTextResources: ITextResource[] = [
      {
        id: "t",
        value: "Text",
      },
    ];

    const result = createRepeatingGroupComponents(
      layout[0] as ILayoutGroup,
      layout,
      1,
      mockTextResources
    );

    const allBaseComponentIds = [];
    const findBaseComponentId = (obj: any) => {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          findBaseComponentId(item);
        }
        return;
      }
      for (const key of Object.keys(obj)) {
        if (key === "baseComponentId") {
          allBaseComponentIds.push(obj[key]);
        }
        if (typeof obj[key] === "object") {
          findBaseComponentId(obj[key]);
        }
      }
    };

    findBaseComponentId(result);
    const numericBaseComponentIds = allBaseComponentIds.filter((id) =>
      id.match(/\d+/)
    );

    expect(numericBaseComponentIds).toEqual([]);
  });

  it("getFileUploadersWithTag should return expected uiConfig", () => {
    const testLayout: ILayout = [
      {
        id: "file-upload-with-tag1",
        type: "FileUploadWithTag",
        textResourceBindings: {
          title: "VedleggTest",
          description: "VedleggsTestBeskrivelse",
          tagTitle: "Datatype",
        },
        dataModelBindings: {},
        maxFileSizeInMB: 25,
        maxNumberOfAttachments: 15,
        minNumberOfAttachments: 1,
        displayMode: "simple",
        required: true,
        optionsId: "dataTypes",
        hasCustomFileEndings: true,
        validFileEndings: [".jpeg", ".jpg", ".pdf"],
      } as ILayoutComponent,
      {
        id: "file-upload-with-tag2",
        type: "FileUploadWithTag",
        textResourceBindings: {
          title: "VedleggTest",
          description: "VedleggsTestBeskrivelse",
          tagTitle: "Datatype",
        },
        dataModelBindings: {},
        maxFileSizeInMB: 25,
        maxNumberOfAttachments: 15,
        minNumberOfAttachments: 1,
        displayMode: "simple",
        required: true,
        optionsId: "dataTypes",
        hasCustomFileEndings: true,
        validFileEndings: [".jpeg", ".jpg", ".pdf"],
      } as ILayoutComponent,
      {
        id: "file-upload-with-tag3",
        type: "FileUploadWithTag",
        textResourceBindings: {
          title: "VedleggTest",
          description: "VedleggsTestBeskrivelse",
          tagTitle: "Datatype",
        },
        dataModelBindings: {},
        maxFileSizeInMB: 25,
        maxNumberOfAttachments: 15,
        minNumberOfAttachments: 1,
        displayMode: "simple",
        required: true,
        optionsId: "dataTypes",
        hasCustomFileEndings: true,
        validFileEndings: [".jpeg", ".jpg", ".pdf"],
      } as ILayoutComponent,
    ];

    const testAttachments: IAttachmentState = {
      attachments: {
        "file-upload-with-tag1": [
          {
            name: "test-1.pdf",
            size: 18302,
            uploaded: true,
            tags: ["TAG-1"],
            id: "id-1",
            deleting: false,
            updating: false,
          },
          {
            name: "test-2.pdf",
            size: 22165,
            uploaded: true,
            tags: ["TAG-2"],
            id: "id-2",
            deleting: false,
            updating: false,
          },
        ],
        "file-upload-with-tag2": [
          {
            name: "test-3.pdf",
            size: 18302,
            uploaded: true,
            tags: ["TAG-3"],
            id: "id-3",
            deleting: false,
            updating: false,
          },
          {
            name: "test-4.pdf",
            size: 22165,
            uploaded: true,
            tags: ["TAG-4"],
            id: "id-4",
            deleting: false,
            updating: false,
          },
        ],
      },
    };
    const expected = {
      "file-upload-with-tag1": {
        editIndex: -1,
        chosenOptions: {
          "id-1": "TAG-1",
          "id-2": "TAG-2",
        },
      },
      "file-upload-with-tag2": {
        editIndex: -1,
        chosenOptions: {
          "id-3": "TAG-3",
          "id-4": "TAG-4",
        },
      },
    };
    const result = mapFileUploadersWithTag(testLayout, testAttachments);
    expect(result).toEqual(expected);
  });

  it("hasRequiredFields should discover required fields", () => {
    const layout: ILayout = [
      {
        id: "field1",
        required: true,
      } as ILayoutComponent,
      {
        id: "field2",
        required: false,
      } as ILayoutComponent,
    ];
    const result = hasRequiredFields(layout);
    expect(result).toBeTruthy();
  });

  it("findChildren should work with simple layouts", () => {
    const result1 = findChildren(testLayout);
    expect(result1).toHaveLength(2);

    const result2 = findChildren(testLayout, { rootGroupId: "Group2" });
    expect(result2).toHaveLength(1);
    expect(result2[0].id).toEqual("field2");

    const result3 = findChildren(testLayout, {
      matching: (c) => c.id === "field1",
    });
    expect(result3).toHaveLength(1);
    expect(result3[0].id).toEqual("field1");

    const result4 = findChildren(testLayout, {
      matching: (c) => c.id === "field1",
      rootGroupId: "Group2",
    });
    expect(result4).toHaveLength(0);
  });

  it("findChildren should work with multi-page groups", () => {
    const layout: ILayout = [
      {
        id: "field1",
        type: "Input",
      } as ILayoutComponent,
      {
        id: "group1",
        type: "Group",
        children: ["0:field2", "1:field3:0"],
        edit: { multiPage: true },
      } as ILayoutGroup,
      {
        id: "field2",
        required: true,
        type: "Input",
      } as ILayoutComponent,
      {
        id: "field3:0",
        required: false,
        type: "Input",
      } as ILayoutComponent,
    ];

    const result1 = findChildren(layout, {
      matching: (c) => c.required,
      rootGroupId: "group1",
    });

    expect(result1).toHaveLength(1);
    expect(result1[0].id).toEqual("field2");

    const result2 = findChildren(layout, {
      rootGroupId: "group1",
    });

    expect(result2).toHaveLength(2);
    expect(result2.map((c) => c.id)).toEqual(["field2", "field3:0"]);
  });

  it("findChildren should work with nested groups out-of-order", () => {
    const layout: ILayout = [
      {
        id: "field1",
        type: "Input",
      } as ILayoutComponent,
      {
        id: "group0",
        type: "Group",
        children: ["field4"],
        maxCount: 3,
      } as ILayoutGroup,
      {
        id: "group1",
        type: "Group",
        children: ["field2", "field3", "group0"],
        maxCount: 3,
      } as ILayoutGroup,
      {
        id: "field2",
        required: true,
        type: "Input",
      } as ILayoutComponent,
      {
        id: "field3",
        required: false,
        type: "Input",
      } as ILayoutComponent,
      {
        id: "field4",
        required: true,
        type: "Input",
      } as ILayoutComponent,
    ];

    const result1 = findChildren(layout, {
      matching: (c) => c.required,
    });

    expect(result1).toHaveLength(2);
    expect(result1.map((c) => c.id)).toEqual(["field2", "field4"]);

    const result2 = findChildren(layout, {
      rootGroupId: "group1",
    });

    expect(result2).toHaveLength(3);
    expect(result2.map((c) => c.id)).toEqual(["field2", "field3", "field4"]);
  });
});
