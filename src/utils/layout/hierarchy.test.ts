import { getHierarchyDataSourcesMock } from 'src/__mocks__/getHierarchyDataSourcesMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { getLayoutComponentObject } from 'src/layout';
import { flattenObject } from 'src/utils/databindings';
import { _private, resolvedLayoutsFromState } from 'src/utils/layout/hierarchy';
import { generateHierarchy } from 'src/utils/layout/HierarchyGenerator';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { CompGroupNonRepeatingExternal, CompGroupRepeatingExternal } from 'src/layout/Group/config.generated';
import type { CompHeaderExternal } from 'src/layout/Header/config.generated';
import type { CompInputExternal } from 'src/layout/Input/config.generated';
import type { CompInternal, HierarchyDataSources, ILayout, ILayouts } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { IValidations } from 'src/utils/validation/types';

const { resolvedNodesInLayouts } = _private;

describe('Hierarchical layout tools', () => {
  const mkHeader = (id: string): CompHeaderExternal => ({ id, type: 'Header', size: 'L' });
  const mkInput = (id: string, binding: string): CompInputExternal => ({
    id,
    type: 'Input',
    hidden: ['equals', ['dataModel', 'ExprBase.ShouldBeTrue'], 'true'],
    dataModelBindings: {
      simpleBinding: binding,
    },
  });
  const mkGroup = (id: string, children: string[]): CompGroupNonRepeatingExternal => ({ id, type: 'Group', children });
  const mkRepGroup = (id: string, children: string[], binding: string): CompGroupRepeatingExternal => ({
    id,
    type: 'Group',
    maxCount: 3,
    hidden: ['equals', ['dataModel', 'ExprBase.ShouldBeFalse'], 'false'],
    dataModelBindings: {
      group: binding,
    },
    children,
  });
  const components = {
    top1: mkHeader('top1'),
    top2: mkInput('top2', 'Top2'),
    group1: mkGroup('group1', ['group1h', 'group1i']),
    group1h: mkHeader('group1h'),
    group1i: mkInput('group1i', 'Group1Input'),
    group2: mkRepGroup('group2', ['group2h', 'group2i', 'group2n'], 'Group2'),
    group2h: mkHeader('group2h'),
    group2i: mkInput('group2i', 'Group2.Input'),
    group2n: mkRepGroup('group2n', ['group2nh', 'group2ni'], 'Group2.Nested'),
    group2nh: mkHeader('group2nh'),
    group2ni: mkInput('group2ni', 'Group2.Nested.Input'),
  };

  const layout: ILayout = [];
  for (const comp of Object.values(components)) {
    layout.push(comp);
  }
  const layouts = { FormLayout: layout };

  const dataSources: HierarchyDataSources = {
    ...getHierarchyDataSourcesMock(),
    instanceDataSources: {
      instanceId: 'abc-123',
      appId: 'org/app',
      instanceOwnerPartyId: 'test',
      instanceOwnerPartyType: 'person',
    },
  };

  const repeatingGroupsFormData = {
    Group2: [
      {
        Input: '1',
        Nested: [{ Input: '1-1' }, { Input: '1-2' }],
      },
      {
        Input: '2',
        Nested: [{ Input: '2-1' }],
      },
    ],
  };

  const manyRepeatingGroupsFormData = {
    Group2: [
      {
        Input: '1',
        Nested: [{ Input: '1-1' }, { Input: '1-2' }, { Input: '1-3' }, { Input: '1-4' }],
      },
      {
        Input: '2',
        Nested: [{ Input: '2-1' }, { Input: '2-2' }, { Input: '2-3' }, { Input: '2-4' }],
      },
      {
        Input: '3',
        Nested: [{ Input: '3-1' }, { Input: '3-2' }, { Input: '3-3' }, { Input: '3-4' }],
      },
      {
        Input: '4',
        Nested: [{ Input: '4-1' }, { Input: '4-2' }, { Input: '4-3' }, { Input: '4-4' }],
      },
    ],
  };

  describe('generateHierarchy', () => {
    it('should resolve a very simple layout', () => {
      const root = new LayoutPage();
      const top1 = new BaseLayoutNode(components.top1 as CompInternal, root, root, dataSources) as LayoutNode;
      const top2 = new BaseLayoutNode(components.top2 as CompInternal, root, root, dataSources) as LayoutNode;
      root._addChild(top1);
      root._addChild(top2);

      const result = generateHierarchy([components.top1, components.top2], dataSources, getLayoutComponentObject);
      expect(result).toEqual(root);
    });

    it('should resolve a complex layout without groups', () => {
      const nodes = generateHierarchy(
        layout,
        { ...dataSources, formData: repeatingGroupsFormData },
        getLayoutComponentObject,
      );
      const flatNoGroups = nodes.flat(false);
      expect(flatNoGroups.map((n) => n.item.id)).toEqual([
        // Top-level nodes:
        components.top1.id,
        components.top2.id,
        components.group1h.id,
        components.group1i.id,

        // First row in group2
        `${components.group2h.id}-0`,
        `${components.group2i.id}-0`,
        `${components.group2nh.id}-0-0`,
        `${components.group2ni.id}-0-0`,
        `${components.group2nh.id}-0-1`,
        `${components.group2ni.id}-0-1`,

        // Second row in group2
        `${components.group2h.id}-1`,
        `${components.group2i.id}-1`,
        `${components.group2nh.id}-1-0`,
        `${components.group2ni.id}-1-0`,

        // Note: No group components
      ]);
    });

    it('should resolve a complex layout with groups', () => {
      const nodes = generateHierarchy(
        layout,
        { ...dataSources, formData: repeatingGroupsFormData },
        getLayoutComponentObject,
      );
      const flatWithGroups = nodes.flat(true);
      expect(flatWithGroups.map((n) => n.item.id).sort()).toEqual(
        [
          // Top-level nodes:
          components.top1.id,
          components.top2.id,
          components.group1h.id,
          components.group1i.id,
          components.group1.id,

          // First row in group2
          `${components.group2h.id}-0`,
          `${components.group2i.id}-0`,
          `${components.group2nh.id}-0-0`,
          `${components.group2ni.id}-0-0`,
          `${components.group2nh.id}-0-1`,
          `${components.group2ni.id}-0-1`,
          `${components.group2n.id}-0`,

          // Second row in group2
          `${components.group2h.id}-1`,
          `${components.group2i.id}-1`,
          `${components.group2nh.id}-1-0`,
          `${components.group2ni.id}-1-0`,
          `${components.group2n.id}-1`,

          components.group2.id,
        ].sort(),
      );
    });

    it('should enable traversal of layout', () => {
      const nodes = generateHierarchy(
        layout,
        { ...dataSources, formData: manyRepeatingGroupsFormData },
        getLayoutComponentObject,
      );
      const flatWithGroups = nodes.flat(true);
      const deepComponent = flatWithGroups.find((node) => node.item.id === `${components.group2nh.id}-2-2`);
      expect(deepComponent?.item.id).toEqual(`${components.group2nh.id}-2-2`);
      expect(deepComponent?.parent?.item?.id).toEqual(`${components.group2n.id}-2`);
      expect(deepComponent?.parent?.item.type).toEqual(`Group`);
      expect(deepComponent?.closest((c) => c.type === 'Input')?.item.id).toEqual(`${components.group2ni.id}-2-2`);

      expect(nodes.findAllById(components.group2ni.id).map((c) => c.item.id)).toEqual([
        `${components.group2ni.id}-0-0`,
        `${components.group2ni.id}-0-1`,
        `${components.group2ni.id}-0-2`,
        `${components.group2ni.id}-0-3`,
        `${components.group2ni.id}-1-0`,
        `${components.group2ni.id}-1-1`,
        `${components.group2ni.id}-1-2`,
        `${components.group2ni.id}-1-3`,
        `${components.group2ni.id}-2-0`,
        `${components.group2ni.id}-2-1`,
        `${components.group2ni.id}-2-2`,
        `${components.group2ni.id}-2-3`,
        `${components.group2ni.id}-3-0`,
        `${components.group2ni.id}-3-1`,
        `${components.group2ni.id}-3-2`,
        `${components.group2ni.id}-3-3`,
      ]);

      expect(nodes.findById(components.group2ni.id)?.item.id).toEqual(`${components.group2ni.id}-0-0`);
      expect(nodes.findById(`${components.group2ni.id}-1-1`)?.item.id).toEqual(`${components.group2ni.id}-1-1`);

      const otherDeepComponent = nodes.findById(`${components.group2nh.id}-3-3`);
      expect(otherDeepComponent?.closest((c) => c.type === 'Input')?.item.id).toEqual(`${components.group2ni.id}-3-3`);
      expect(otherDeepComponent?.closest((c) => c.type === 'Group')?.item.id).toEqual(`${components.group2n.id}-3`);
      expect(otherDeepComponent?.closest((c) => c.baseComponentId === components.group2i.id)?.item.id).toEqual(
        `${components.group2i.id}-3`,
      );
      expect(otherDeepComponent?.closest((c) => c.id === components.top1.id)?.item.id).toEqual(components.top1.id);

      const insideNonRepeatingGroup = nodes.findById(components.group1i.id);
      expect(insideNonRepeatingGroup?.closest((n) => n.id === components.group1h.id)?.item.id).toEqual(
        components.group1h.id,
      );

      const group2 = flatWithGroups.find((node) => node.item.id === components.group2.id);
      expect(group2?.children((n) => n.type === 'Input')?.item.id).toEqual(`${components.group2i.id}-0`);
      expect(group2?.children((n) => n.type === 'Input', 1)?.item.id).toEqual(`${components.group2i.id}-1`);

      expect(otherDeepComponent?.closest((c) => c.id === 'not-found')).toBeUndefined();
    });

    it('should support indexes when using start/stop in groups', () => {
      const formData = {
        Group: [
          { Title: 'title0' },
          { Title: 'title1' },
          { Title: 'title2' },
          { Title: 'title3' },
          { Title: 'title4' },
          { Title: 'title5' },
          { Title: 'title6' },
          { Title: 'title7' },
          { Title: 'title8' },
        ],
      };

      const layout: ILayout = [
        {
          id: 'g1',
          type: 'Group',
          maxCount: 99,
          children: ['g1c'],
          dataModelBindings: { group: 'Group' },
          edit: {
            mode: 'likert',
            filter: [
              { key: 'start', value: '0' },
              { key: 'stop', value: '3' },
            ],
          },
        },
        {
          id: 'g1c',
          type: 'Input',
          dataModelBindings: { simpleBinding: 'Group.Title' },
        },
        {
          id: 'g2',
          type: 'Group',
          maxCount: 99,
          children: ['g2c'],
          dataModelBindings: { group: 'Group' },
          edit: {
            mode: 'likert',
            filter: [
              { key: 'start', value: '3' },
              { key: 'stop', value: '6' },
            ],
          },
        },
        {
          id: 'g2c',
          type: 'Input',
          dataModelBindings: { simpleBinding: 'Group.Title' },
        },
      ];
      const nodes = generateHierarchy(layout, { ...dataSources, formData }, getLayoutComponentObject);

      expect(nodes.findAllById('g1c').length).toEqual(3);
      expect(nodes.findAllById('g2c').length).toEqual(3);

      expect(nodes.findById('g1c-0')?.rowIndex).toEqual(0);
      expect(nodes.findById('g2c-3')?.rowIndex).toEqual(3);
    });
  });

  describe('resolvedNodesInLayout', () => {
    const dataSources: HierarchyDataSources = {
      ...getHierarchyDataSourcesMock(),
      formData: {
        ...repeatingGroupsFormData,
        ExprBase: {
          ShouldBeTrue: 'true',
          ShouldBeFalse: 'false',
        },
      },
      instanceDataSources: {
        instanceId: 'test',
        instanceOwnerPartyId: 'test',
        appId: 'test',
        instanceOwnerPartyType: 'unknown',
      },
    };

    const nodes = resolvedNodesInLayouts(layouts, 'FormLayout', dataSources);
    const topInput = nodes.findById(components.top2.id);
    const group2 = nodes.findById(components.group2.id);
    const group2i = nodes.findById(`${components.group2i.id}-0`);
    const group2ni = nodes.findById(`${components.group2ni.id}-0-1`);

    function uniqueHidden(nodes: LayoutNode[] | undefined): any[] | undefined {
      if (!nodes) {
        return undefined;
      }

      return [...new Set(nodes.map((n) => n.item.hidden))].sort();
    }
    const plain = [true, undefined];

    // Tests to make sure all children also have their expressions resolved
    expect(topInput?.item.hidden).toEqual(true);
    expect(group2i?.item.hidden).toEqual(true);
    expect(group2ni?.item.hidden).toEqual(true);
    expect(group2i?.parent.item.hidden).toEqual(true);
    expect(group2ni?.parent.parent.item.hidden).toEqual(true);
    expect(uniqueHidden(group2?.children())).toEqual(plain);
    expect(uniqueHidden(group2i?.parent.children())).toEqual(plain);
    expect(uniqueHidden(group2ni?.parent.children())).toEqual(plain);
    expect(uniqueHidden(group2ni?.parent.parent.children())).toEqual(plain);
    expect(uniqueHidden(group2?.flat(true))).toEqual(plain);
    expect(uniqueHidden(group2?.flat(false))).toEqual(plain);
    expect(uniqueHidden(nodes.current()?.flat(true))).toEqual(plain);
    expect(uniqueHidden(nodes.current()?.children())).toEqual(plain);

    if (group2?.isType('Group') && group2.isRepGroup()) {
      expect(group2.item.rows[0]?.items[1].item.hidden).toEqual(true);
      expect(group2.item.rows[0]?.items[2].item.hidden).toEqual(true);
      const group2n = group2.item.rows[0]?.items[2];
      if (group2n?.isType('Group') && group2n.isRepGroup()) {
        expect(group2n.item.rows[0]?.items[1].item.hidden).toEqual(true);
      } else {
        expect(false).toEqual(true);
      }
    } else {
      expect(false).toEqual(true);
    }
  });

  describe('LayoutPages', () => {
    const layout1: ILayout = [components.top1, components.top2];

    const layout2: ILayout = [{ ...components.top1 }, { ...components.top2, readOnly: true }];

    const layouts = {
      l1: generateHierarchy(layout1, dataSources, getLayoutComponentObject),
      l2: generateHierarchy(layout2, dataSources, getLayoutComponentObject),
    };

    const collection1 = new LayoutPages('l1', layouts);
    const collection2 = new LayoutPages('l2', layouts);

    it('should find the component in the current layout first', () => {
      function expectReadOnly(
        collection: LayoutPages<{ l1: LayoutPage; l2: LayoutPage }> | undefined,
        id: string,
        expected: true | undefined,
      ) {
        const item = collection?.findById(id)?.item;
        const readOnly = item && 'readOnly' in item ? item.readOnly : undefined;
        expect(readOnly).toEqual(expected);
      }

      expectReadOnly(collection1, components.top1.id, undefined);
      expectReadOnly(collection1, components.top2.id, undefined);
      expectReadOnly(collection2, components.top1.id, undefined);
      expectReadOnly(collection2, components.top2.id, true);
    });

    it('should find the current layout', () => {
      expect(collection1.current()).toEqual(layouts['l1']);
      expect(collection2.current()).toEqual(layouts['l2']);
    });

    it('should find a named layout', () => {
      expect(collection1.findLayout('l1')).toEqual(layouts['l1']);
      expect(collection1.findLayout('l2')).toEqual(layouts['l2']);
    });

    it('should find all components in multiple layouts', () => {
      expect(collection1.findAllById(components.top1.id).map((c) => c.item.id)).toEqual([
        components.top1.id,
        components.top1.id,
      ]);
    });
  });

  describe('transposeDataModel', () => {
    const nodes = generateHierarchy(
      layout,
      { ...dataSources, formData: manyRepeatingGroupsFormData },
      getLayoutComponentObject,
    );
    const inputNode = nodes.findById(`${components.group2ni.id}-2-2`);
    const topHeaderNode = nodes.findById(components.top1.id);

    expect(inputNode?.transposeDataModel('Group2.Nested.Age')).toEqual('Group2[2].Nested[2].Age');
    expect(inputNode?.transposeDataModel('Group2.Other.Parents')).toEqual('Group2[2].Other.Parents');

    const headerNode = nodes.findById(`${components.group2nh.id}-2-2`);

    // Header component does not have any data binding, but its parent does
    expect(headerNode?.transposeDataModel('Group2.Nested.Age')).toEqual('Group2[2].Nested[2].Age');

    // Existing indexes are not removed:
    expect(headerNode?.transposeDataModel('Group2[1].Nested[1].Age')).toEqual('Group2[1].Nested[1].Age');
    expect(headerNode?.transposeDataModel('Group2.Nested[1].Age')).toEqual('Group2[2].Nested[1].Age');

    // This is a broken reference: We cannot know exactly which row in the nested
    // group you want to refer to, as you never specified:
    expect(headerNode?.transposeDataModel('Group2[3].Nested.Age')).toEqual('Group2[3].Nested.Age');

    // This still doesn't make sense. Even though we're on the same row now, we should behave the same all the time
    // and fail to resolve the nested row.
    expect(headerNode?.transposeDataModel('Group2[2].Nested.Age')).toEqual('Group2[2].Nested.Age');

    // Tricks to make sure we don't just compare using startsWith()
    expect(inputNode?.transposeDataModel('Group22.NestedOtherValue.Key')).toEqual('Group22.NestedOtherValue.Key');
    expect(inputNode?.transposeDataModel('Gro.Nes[1].Key')).toEqual('Gro.Nes[1].Key');
    expect(inputNode?.transposeDataModel('Gro[0].Nes.Key')).toEqual('Gro[0].Nes.Key');

    // This component doesn't have any repeating group reference point, so it cannot
    // provide any insights (but it should not fail)
    expect(topHeaderNode?.transposeDataModel('Group2.Nested.Age')).toEqual('Group2.Nested.Age');
  });

  describe('validation functions', () => {
    const nestedId = `${components.group2ni.id}-1-2`;
    const validations: IValidations = {
      formLayout: {
        [components.top1.id]: {
          simpleBinding: {
            errors: ['Some error'],
            warnings: ['Some warning'],
          },
        },
        [nestedId]: {
          simpleBinding: {
            errors: ['Some nested error'],
            warnings: ['Some nested warning 1', 'Nested warning 2'],
          },
          otherBinding: {
            warnings: ['Nested warning 3'],
          },
        },
      },
    };
    const page = generateHierarchy(
      layout,
      { ...dataSources, validations, formData: manyRepeatingGroupsFormData },
      getLayoutComponentObject,
    );
    page.registerCollection('formLayout', new LayoutPages<any>());
    const nestedNode = page.findById(nestedId);
    const topHeaderNode = page.findById(components.top1.id);

    expect(topHeaderNode?.getValidations()).toEqual(validations.formLayout[components.top1.id]);
    expect(topHeaderNode?.getUnifiedValidations()).toEqual(validations.formLayout[components.top1.id].simpleBinding);
    expect(topHeaderNode?.getValidationMessages('warnings')).toEqual(['Some warning']);

    expect(nestedNode?.getValidations()).toEqual(validations.formLayout[nestedId]);
    expect(nestedNode?.getUnifiedValidations()).toEqual({
      errors: ['Some nested error'],
      warnings: ['Some nested warning 1', 'Nested warning 2', 'Nested warning 3'],
    });
    expect(nestedNode?.getValidationMessages('warnings')).toEqual([
      'Some nested warning 1',
      'Nested warning 2',
      'Nested warning 3',
    ]);
    expect(nestedNode?.getValidationMessages('warnings', 'simpleBinding')).toEqual([
      'Some nested warning 1',
      'Nested warning 2',
    ]);

    expect(nestedNode?.hasDeepValidationMessages()).toEqual(true);
    expect(page.findById(`${components.group2n.id}-1`)?.hasDeepValidationMessages()).toEqual(true);
    expect(page.findById(components.group2.id)?.hasDeepValidationMessages()).toEqual(true);
    expect(page.findById(components.group2.id)?.hasDeepValidationMessages('info')).toEqual(false);
    expect(page.findById(`${components.group2n.id}-1`)?.hasValidationMessages('errors')).toEqual(false);
    expect(page.findById(components.group2.id)?.hasValidationMessages('errors')).toEqual(false);
  });

  describe('find functions', () => {
    const state = getInitialStateMock();
    (state.formLayout.layouts as any)['page2'] = layout;
    state.deprecated.formData = flattenObject(manyRepeatingGroupsFormData);
    const resolved = resolvedLayoutsFromState(state);

    const field3 = resolved?.findById('field3');
    expect(field3?.item.id).toEqual('field3');

    const nested = resolved?.findById(components.group2ni.id);
    expect(nested?.item.id).toEqual('group2ni-0-0');
    expect(nested?.closest((i) => i.id === components.top1.id)?.item.id).toEqual(components.top1.id);

    // Using 'closest' across pages
    expect(nested?.closest((i) => i.id === 'field3')?.item.id).toEqual('field3');

    // Using 'findById' on the wrong page
    expect(resolved?.findLayout('page2')?.findById('field3')?.item.id).toEqual('field3');
    expect(field3?.top.findAllById(components.group2i.id).map((i) => i.item.id)).toEqual([
      'group2i-0',
      'group2i-1',
      'group2i-2',
      'group2i-3',
    ]);
  });

  describe('panel with group reference', () => {
    const pageWithMainGroup: ILayout = [
      {
        id: 'mainGroup',
        type: 'Group',
        children: ['child'],
        maxCount: 3,
        dataModelBindings: { group: 'MyModel.MainGroup' },
      },
      {
        id: 'child',
        type: 'Input',
        dataModelBindings: { simpleBinding: 'MyModel.MainGroup.Child' },
      },
    ];

    const pageWithPanelRef: ILayout = [
      {
        id: 'groupWithPanel',
        type: 'Group',
        children: ['panelChild'],
        panel: {
          groupReference: { group: 'mainGroup' },
        },
      },
      {
        id: 'panelChild',
        type: 'Input',
        dataModelBindings: { simpleBinding: 'MyModel.MainGroup.Child' },
      },
    ];

    it.each([
      {
        name: 'group with panel reference defined on the page before the referenced group',
        layouts: {
          page1: pageWithPanelRef,
          page2: pageWithMainGroup,
        },
      },
      {
        name: 'group with panel reference defined on the page after the referenced group',
        layouts: {
          page1: pageWithMainGroup,
          page2: pageWithPanelRef,
        },
      },
      {
        name: 'group with panel reference defined after, on the same page as the referenced group',
        layouts: {
          page1: [...pageWithMainGroup, ...pageWithPanelRef],
        },
      },
      {
        name: 'group with panel reference defined before, on the same page as the referenced group',
        layouts: {
          page1: [...pageWithPanelRef, ...pageWithMainGroup],
        },
      },
      {
        name: 'group with panel reference defined after, on the page before the referenced group, in reverse order',
        layouts: {
          page1: [...pageWithMainGroup.reverse(), ...pageWithPanelRef.reverse()],
        },
      },
    ])('$name', ({ layouts }) => {
      const state = getInitialStateMock();
      state.formLayout.layouts = layouts as ILayouts;
      state.deprecated.formData = flattenObject({
        MyModel: {
          MainGroup: [{ Child: '1' }, { Child: '2' }, { Child: '3' }],
        },
      });
      state.formLayout.uiConfig.currentView = 'page1';
      const resolved = resolvedLayoutsFromState(state);
      const dataBindingFor = (id: string) => {
        const item = resolved?.findById(id)?.item || undefined;
        const dmBindings = item && 'dataModelBindings' in item ? item?.dataModelBindings : undefined;
        return dmBindings && 'simpleBinding' in dmBindings ? dmBindings.simpleBinding : undefined;
      };

      expect(dataBindingFor('child-2')).toEqual('MyModel.MainGroup[2].Child');
      expect(resolved?.findById('child-3')).toBeUndefined();
      expect(resolved?.findById('panelChild-2')).toBeUndefined();
      expect(dataBindingFor('panelChild-3')).toEqual('MyModel.MainGroup[3].Child');
    });
  });
});
