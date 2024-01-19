import dot from 'dot-object';

import { getRepeatingGroupStartStopIndex } from 'src/utils/formLayout';
import { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { CompLikertExternal, HLikertRows, ILikertFilter } from 'src/layout/Likert/config.generated';
import type { CompLikertItemInternal } from 'src/layout/LikertItem/config.generated';
import type {
  ChildFactory,
  ChildFactoryProps,
  ChildMutator,
  HierarchyContext,
  UnprocessedItem,
} from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class LikertHierarchyGenerator extends ComponentHierarchyGenerator<'Likert'> {
  stage1(): void {}

  stage2(ctx: HierarchyContext): ChildFactory<'Likert'> {
    return this.processLikertQuestions(ctx);
  }

  childrenFromNode(node: LayoutNode<'Likert'>, onlyInRowIndex?: number): LayoutNode[] {
    const list: LayoutNode[] = [];

    const maybeNodes =
      typeof onlyInRowIndex === 'number'
        ? node.item.rows.find((r) => r && r.index === onlyInRowIndex)?.items || []
        : // Beware: In most cases this will just match the first row.
          Object.values(node.item.rows)
            .map((r) => r?.items)
            .flat();

    for (const node of maybeNodes) {
      if (node) {
        list.push(node);
      }
    }
    return list;
  }

  /**
   * For each likert question we need to generate a node based on the questions in the datamodel and rewrite their data
   * model bindings, mapping, etc based on which row they belong to.
   */
  private processLikertQuestions(ctx: HierarchyContext): ChildFactory<'Likert'> {
    return (props) => {
      const item = props.item as CompLikertExternal;
      const me = ctx.generator.makeNode(props);
      const rows: HLikertRows = [];
      const formData = item.dataModelBindings?.questions
        ? dot.pick(item.dataModelBindings.questions, ctx.generator.dataSources.formData)
        : undefined;
      const lastIndex = formData && Array.isArray(formData) ? formData.length - 1 : -1;

      const { startIndex, stopIndex } = getRepeatingGroupStartStopIndex(lastIndex, props.item.filter as ILikertFilter);

      const prototype = ctx.generator.prototype(ctx.id) as UnprocessedItem<'LikertItem'>;

      for (let rowIndex = startIndex; rowIndex <= stopIndex; rowIndex++) {
        const rowChildren: LayoutNode[] = [];

        const itemProps = structuredClone(prototype);

        const childItem = {
          ...itemProps,
          dataModelBindings: {
            simpleBinding: item?.dataModelBindings?.simpleBinding,
          },
          type: 'LikertItem',
        } as unknown as CompLikertItemInternal;

        mutateComponentId(rowIndex)(childItem);
        mutateTextResourceBindings(props)(childItem);
        mutateDataModelBindings(props, rowIndex)(childItem);
        mutateMapping(ctx, rowIndex)(childItem);

        const child = ctx.generator.makeNode({ item: childItem, parent: me, rowIndex });

        child && rowChildren.push(child as LayoutNode);

        rows.push({
          index: rowIndex,
          items: rowChildren,
        });
      }
      me.item.rows = rows;
      return me;
    };
  }
}

const mutateComponentId: (rowIndex: number) => ChildMutator<'LikertItem'> = (rowIndex) => (item) => {
  item.baseComponentId = item.baseComponentId || item.id;
  item.id += `-${rowIndex}`;
};

const mutateTextResourceBindings: (props: ChildFactoryProps<'Likert'>) => ChildMutator<'LikertItem'> =
  (props) => (item) => {
    if ('textResourceBindings' in props.item) {
      const question = (props.item.textResourceBindings?.questions as string) ?? undefined;
      const description = (props.item.textResourceBindings?.questionDescriptions as string) ?? undefined;
      const helpText = (props.item.textResourceBindings?.questionHelpTexts as string) ?? undefined;
      const textResourceBindings = item.textResourceBindings || {};
      delete textResourceBindings.title;
      delete textResourceBindings.description;
      delete textResourceBindings.help;
      if (question && textResourceBindings) {
        textResourceBindings.title = question;
      }
      if (description && textResourceBindings) {
        textResourceBindings.description = description;
      }
      if (helpText && textResourceBindings) {
        textResourceBindings.help = helpText;
      }
    }
  };

const mutateDataModelBindings: (props: ChildFactoryProps<'Likert'>, rowIndex: number) => ChildMutator<'LikertItem'> =
  (props, rowIndex) => (item) => {
    const questionsBinding = 'dataModelBindings' in props.item ? props.item.dataModelBindings?.questions : undefined;
    const bindings = item.dataModelBindings || {};
    for (const key of Object.keys(bindings)) {
      if (questionsBinding && bindings[key]) {
        bindings[key] = bindings[key].replace(questionsBinding, `${questionsBinding}[${rowIndex}]`);
      }
    }
  };

const mutateMapping: (ctx: HierarchyContext, rowIndex: number) => ChildMutator<'LikertItem'> =
  (ctx, rowIndex) => (item) => {
    if ('mapping' in item && item.mapping) {
      const depthMarker = ctx.depth - 1;
      for (const [key, value] of Object.keys(item.mapping)) {
        const newKey = key.replace(`[{${depthMarker}}]`, `[${rowIndex}]`);
        delete item.mapping[key];
        item.mapping[newKey] = value;
      }
    }
  };
