import { getFormLayoutMock } from 'src/__mocks__/getFormLayoutMock';
import { getHierarchyDataSourcesMock } from 'src/__mocks__/getHierarchyDataSourcesMock';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { getLayoutComponentObject } from 'src/layout';
import { _private } from 'src/utils/layout/hierarchy';
import { generateHierarchy } from 'src/utils/layout/HierarchyGenerator';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { CompGroupExternal } from 'src/layout/Group/config.generated';
import type { CompHeaderExternal } from 'src/layout/Header/config.generated';
import type { CompInputExternal } from 'src/layout/Input/config.generated';
import type { CompInternal, HierarchyDataSources, ILayout, ILayouts } from 'src/layout/layout';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

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
  const mkGroup = (id: string, children: string[]): CompGroupExternal => ({ id, type: 'Group', children });
  const mkRepGroup = (id: string, children: string[], binding: string): CompRepeatingGroupExternal => ({
    id,
    type: 'RepeatingGroup',
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
        [ALTINN_ROW_ID]: 'r1',
        Input: '1',
        Nested: [
          { [ALTINN_ROW_ID]: 'r1n1', Input: '1-1' },
          { [ALTINN_ROW_ID]: 'r1n2', Input: '1-2' },
        ],
      },
      {
        [ALTINN_ROW_ID]: 'r2',
        Input: '2',
        Nested: [{ [ALTINN_ROW_ID]: 'r2n1', Input: '2-1' }],
      },
    ],
  };

  const manyRepeatingGroupsFormData = {
    Group2: [
      {
        [ALTINN_ROW_ID]: 'r1',
        Input: '1',
        Nested: [
          { [ALTINN_ROW_ID]: 'r1n1', Input: '1-1' },
          { [ALTINN_ROW_ID]: 'r1n2', Input: '1-2' },
          { [ALTINN_ROW_ID]: 'r1n3', Input: '1-3' },
          { [ALTINN_ROW_ID]: 'r1n4', Input: '1-4' },
        ],
      },
      {
        [ALTINN_ROW_ID]: 'r2',
        Input: '2',
        Nested: [
          { [ALTINN_ROW_ID]: 'r2n1', Input: '2-1' },
          { [ALTINN_ROW_ID]: 'r2n2', Input: '2-2' },
          { [ALTINN_ROW_ID]: 'r2n3', Input: '2-3' },
          { [ALTINN_ROW_ID]: 'r2n4', Input: '2-4' },
        ],
      },
      {
        [ALTINN_ROW_ID]: 'r3',
        Input: '3',
        Nested: [
          { [ALTINN_ROW_ID]: 'r3n1', Input: '3-1' },
          { [ALTINN_ROW_ID]: 'r3n2', Input: '3-2' },
          { [ALTINN_ROW_ID]: 'r3n3', Input: '3-3' },
          { [ALTINN_ROW_ID]: 'r3n4', Input: '3-4' },
        ],
      },
      {
        [ALTINN_ROW_ID]: 'r4',
        Input: '4',
        Nested: [
          { [ALTINN_ROW_ID]: 'r4n1', Input: '4-1' },
          { [ALTINN_ROW_ID]: 'r4n2', Input: '4-2' },
          { [ALTINN_ROW_ID]: 'r4n3', Input: '4-3' },
          { [ALTINN_ROW_ID]: 'r4n4', Input: '4-4' },
        ],
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
      expect(deepComponent?.parent?.item.type).toEqual(`RepeatingGroup`);
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
      expect(otherDeepComponent?.closest((c) => c.type === 'RepeatingGroup')?.item.id).toEqual(
        `${components.group2n.id}-3`,
      );
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
      expect(group2?.children((n) => n.type === 'Input', { onlyInRowIndex: 1 })?.item.id).toEqual(
        `${components.group2i.id}-1`,
      );

      expect(otherDeepComponent?.closest((c) => c.id === 'not-found')).toBeUndefined();
    });

    it('should support indexes when using start/stop in groups', () => {
      const formData = {
        Group: [
          { [ALTINN_ROW_ID]: 'lr0', Title: 'title0' },
          { [ALTINN_ROW_ID]: 'lr1', Title: 'title1' },
          { [ALTINN_ROW_ID]: 'lr2', Title: 'title2' },
          { [ALTINN_ROW_ID]: 'lr3', Title: 'title3' },
          { [ALTINN_ROW_ID]: 'lr4', Title: 'title4' },
          { [ALTINN_ROW_ID]: 'lr5', Title: 'title5' },
          { [ALTINN_ROW_ID]: 'lr6', Title: 'title6' },
          { [ALTINN_ROW_ID]: 'lr7', Title: 'title7' },
          { [ALTINN_ROW_ID]: 'lr8', Title: 'title8' },
        ],
      };

      const layout: ILayout = [
        {
          id: 'g1',
          type: 'Likert',
          dataModelBindings: { answer: 'Group.Title', questions: 'Group' },
          filter: [
            { key: 'start', value: '0' },
            { key: 'stop', value: '3' },
          ],
        },
        {
          id: 'g2',
          type: 'Likert',
          dataModelBindings: { answer: 'Group.Title', questions: 'Group' },
          filter: [
            { key: 'start', value: '3' },
            { key: 'stop', value: '6' },
          ],
        },
      ];
      const nodes = generateHierarchy(layout, { ...dataSources, formData }, getLayoutComponentObject);

      expect(nodes.findAllById('g1').length).toEqual(4);
      expect(nodes.findAllById('g2').length).toEqual(4);

      expect(nodes.findById('g1')?.children().length).toEqual(3);
      expect(nodes.findById('g2')?.children().length).toEqual(3);

      expect(nodes.findById('g1-0')?.rowIndex).toEqual(0);
      expect(nodes.findById('g2-3')?.rowIndex).toEqual(3);
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

    if (group2?.isType('RepeatingGroup')) {
      expect(group2.item.rows[0]?.items[1].item.hidden).toEqual(true);
      expect(group2.item.rows[0]?.items[2].item.hidden).toEqual(true);
      const group2n = group2.item.rows[0]?.items[2];
      if (group2n?.isType('RepeatingGroup')) {
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

  it('transposeDataModel', () => {
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

  it('find functions', () => {
    const dataSources: HierarchyDataSources = {
      ...getHierarchyDataSourcesMock(),
      formData: manyRepeatingGroupsFormData,
    };

    const layouts: ILayouts = { page2: layout, FormLayout: getFormLayoutMock() };
    const resolved = resolvedNodesInLayouts(layouts, 'FormLayout', dataSources);

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
});
