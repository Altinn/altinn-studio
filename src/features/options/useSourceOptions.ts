import { evalExpr } from 'src/features/expressions';
import { ExprValidation } from 'src/features/expressions/validation';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { getKeyWithoutIndexIndicators } from 'src/utils/databindings';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import type { ExprVal, ExprValToActualOrExpr, NodeReference } from 'src/features/expressions/types';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IDataModelReference, IOptionSource } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

interface IUseSourceOptionsArgs {
  source: IOptionSource | undefined;
  node: LayoutNode;
  dataSources: ExpressionDataSources;
  addRowInfo: boolean;
}

export const useSourceOptions = ({
  source,
  node,
  dataSources,
  addRowInfo,
}: IUseSourceOptionsArgs): IOptionInternal[] | undefined =>
  useMemoDeepEqual(() => {
    if (!source) {
      return undefined;
    }

    const nodeReference: NodeReference = { type: 'node', id: node.id };
    const { formDataRowsSelector, formDataSelector, langToolsSelector, nodeTraversal } = dataSources;
    const output: IOptionInternal[] = [];
    const langTools = langToolsSelector(node);
    const { group, value, label, helpText, description, dataType } = source;
    const cleanValue = getKeyWithoutIndexIndicators(value);
    const cleanGroup = getKeyWithoutIndexIndicators(group);
    const groupDataType = dataType ?? dataSources.currentLayoutSet?.dataType;
    if (!groupDataType) {
      return output;
    }
    const rawReference: IDataModelReference = { dataType: groupDataType, field: cleanGroup };
    const groupReference = dataSources.transposeSelector(node, rawReference);
    if (!groupReference) {
      return output;
    }

    const valueReference: IDataModelReference = { dataType: groupDataType, field: cleanValue };
    const groupRows = formDataRowsSelector(groupReference);
    if (!groupRows.length) {
      return output;
    }

    let repGroupNode: LayoutNode<'RepeatingGroup'> | undefined;
    if (addRowInfo) {
      repGroupNode = nodeTraversal(
        (t) =>
          t.allNodes(
            (n) =>
              n.type === 'node' &&
              n.layout.type === 'RepeatingGroup' &&
              n.layout.dataModelBindings &&
              'group' in n.layout.dataModelBindings &&
              n.layout.dataModelBindings.group.field === groupReference.field &&
              n.layout.dataModelBindings.group.dataType === groupReference.dataType,
          )?.[0] as LayoutNode<'RepeatingGroup'> | undefined,
        [groupDataType, groupReference.field, groupReference.dataType],
      );
    }

    for (const idx in groupRows) {
      const index = parseInt(idx, 10);
      const path = `${groupReference.field}[${index}]`;
      const nonTransposed = { dataType: groupDataType, field: path };
      const transposed = transposeDataBinding({
        subject: valueReference,
        currentLocation: nonTransposed,
      });

      /**
       * Running evalExpression is all that is needed to support dynamic expressions in
       * source options. However, since there are multiple rows of content which might
       * contain text variables, evalExpr needs to be able to resolve these values at
       * the correct path in the data model i.e. use langAsStringUsingPathInDataModel.
       *
       * To coerce the text-function in dynamic expressions to use the correct function
       * (langAsStringUsingPathInDataModel), this modified dataSources modifies the
       * langAsString function to actually be langAsStringUsingPathInDataModel partially
       * applied with the correct path in the data model.
       */
      const modifiedDataSources: ExpressionDataSources = {
        ...dataSources,
        langToolsSelector: () => ({
          ...langTools,
          langAsString: (key: string) => langTools.langAsStringUsingPathInDataModel(key, nonTransposed),
          langAsNonProcessedString: (key: string) =>
            langTools.langAsNonProcessedStringUsingPathInDataModel(key, nonTransposed),
        }),
      };

      let rowNode: LayoutNode | undefined;
      if (repGroupNode) {
        rowNode = nodeTraversal((t) => t.with(repGroupNode).children(undefined, index)?.[0], [repGroupNode, index]);
      }

      output.push({
        value: String(formDataSelector(transposed)),
        label: resolveText(label, nodeReference, modifiedDataSources, nonTransposed) as string,
        description: resolveText(description, nodeReference, modifiedDataSources, nonTransposed),
        helpText: resolveText(helpText, nodeReference, modifiedDataSources, nonTransposed),
        rowNode,
        dataModelLocation: addRowInfo ? transposed : undefined,
      });
    }

    return output;
  }, [source, node, dataSources, addRowInfo]);

function resolveText(
  text: ExprValToActualOrExpr<ExprVal.String> | undefined,
  nodeReference: NodeReference,
  dataSources: ExpressionDataSources,
  reference: IDataModelReference,
): string | undefined {
  if (text && ExprValidation.isValid(text)) {
    return evalExpr(text, nodeReference, dataSources);
  }
  if (text) {
    return dataSources.langToolsSelector(nodeReference.id).langAsStringUsingPathInDataModel(text as string, reference);
  }
  return undefined;
}
