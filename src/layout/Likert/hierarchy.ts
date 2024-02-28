import dot from 'dot-object';

import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { getLikertStartStopIndex } from 'src/utils/formLayout';
import { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { CompLikertExternal, HLikertRows } from 'src/layout/Likert/config.generated';
import type { CompLikertItemInternal } from 'src/layout/LikertItem/config.generated';
import type {
  ChildFactory,
  ChildFactoryProps,
  ChildLookupRestriction,
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

  childrenFromNode(node: LayoutNode<'Likert'>, restriction?: ChildLookupRestriction): LayoutNode[] {
    const list: LayoutNode[] = [];

    const maybeNodes =
      restriction && 'onlyInRowUuid' in restriction
        ? node.item.rows.find((r) => r && r.uuid === restriction.onlyInRowUuid)?.items || []
        : restriction && 'onlyInRowIndex' in restriction
          ? node.item.rows.find((r) => r && r.index === restriction.onlyInRowIndex)?.items || []
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

      const { startIndex, stopIndex } = getLikertStartStopIndex(lastIndex, props.item.filter);

      const prototype = ctx.generator.prototype(ctx.id) as UnprocessedItem<'LikertItem'>;

      for (let rowIndex = startIndex; rowIndex <= stopIndex; rowIndex++) {
        const rowChildren: LayoutNode[] = [];

        const itemProps = structuredClone(prototype);

        const uuid = formData[rowIndex][ALTINN_ROW_ID];
        if (typeof uuid !== 'string' || !uuid.length) {
          const path = `${item.dataModelBindings.questions}[${rowIndex}]`;
          throw new MissingRowIdException(path);
        }

        const childItem = {
          ...itemProps,
          type: 'LikertItem',
          dataModelBindings: {
            simpleBinding: item?.dataModelBindings?.answer,
          },
        } as unknown as CompLikertItemInternal;

        mutateComponentId(rowIndex)(childItem);
        mutateTextResourceBindings(props)(childItem);
        mutateDataModelBindings(props, rowIndex)(childItem);
        mutateMapping(ctx, rowIndex)(childItem);

        const child = ctx.generator.makeNode({ item: childItem, parent: me, rowIndex, rowId: uuid });

        child && rowChildren.push(child as LayoutNode);

        rows.push({
          uuid,
          index: rowIndex,
          items: rowChildren,
        });
      }
      me.item.rows = rows;

      // At this point we no longer need the 'answer' data model binding, so we remove it. Leaving it here would confuse
      // later validation, because strictly speaking the binding is not valid when it does not point to indexes in the
      // questions group.
      if (me.item.dataModelBindings) {
        delete me.item.dataModelBindings.answer;
      }

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
