import dot from 'dot-object';

import { evalExpr } from 'src/features/expressions';
import { ExprValidation } from 'src/features/expressions/validation';
import { useCurrentLayoutSet } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLanguage } from 'src/features/language/useLanguage';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { getKeyWithoutIndexIndicators } from 'src/utils/databindings';
import { useDataModelBindingTranspose } from 'src/utils/layout/useDataModelBindingTranspose';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { ExprVal, ExprValToActualOrExpr, NodeReference } from 'src/features/expressions/types';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IDataModelReference, IOptionSource } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

interface IUseSourceOptionsArgs {
  source: IOptionSource | undefined;
  node: LayoutNode;
}

export const useSourceOptions = ({ source, node }: IUseSourceOptionsArgs): IOptionInternal[] | undefined => {
  const langTools = useLanguage(node);
  const groupReference = useGroupReference(source, node);
  const valueSubPath = getValueSubPath(source);
  const rawValues = FD.useDebouncedSelect((pick) => {
    if (!groupReference || !valueSubPath) {
      return [];
    }
    const groupRows = pick(groupReference);
    if (!Array.isArray(groupRows)) {
      return [];
    }

    const output: { value: string; dataModelLocation: IDataModelReference }[] = [];
    for (const idx in groupRows) {
      const index = parseInt(idx, 10);
      const rowReference = { dataType: groupReference.dataType, field: `${groupReference.field}[${index}]` };
      const value = dot.pick(valueSubPath, groupRows[index]) ?? '';

      output.push({
        value: String(value),
        dataModelLocation: rowReference,
      });
    }

    return output;
  });

  const dataSources = useExpressionDataSources(source);
  return useMemoDeepEqual(() => {
    if (!source) {
      // Returning undefined here allows us to fall back to use other options sources if `source` is not configured.
      return undefined;
    }

    if (!rawValues || rawValues.length === 0) {
      return [];
    }

    const { label, helpText, description } = source;
    const nodeReference: NodeReference = { type: 'node', id: node.id };
    const output: IOptionInternal[] = [];
    for (const { value, dataModelLocation } of rawValues) {
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
          langAsString: (key: string) => langTools.langAsStringUsingPathInDataModel(key, dataModelLocation),
          langAsNonProcessedString: (key: string) =>
            langTools.langAsNonProcessedStringUsingPathInDataModel(key, dataModelLocation),
        }),
      };

      output.push({
        value,
        dataModelLocation,
        label: resolveText(label, nodeReference, modifiedDataSources, dataModelLocation) as string,
        description: resolveText(description, nodeReference, modifiedDataSources, dataModelLocation),
        helpText: resolveText(helpText, nodeReference, modifiedDataSources, dataModelLocation),
      });
    }

    return output;
  }, [dataSources, langTools, node.id, rawValues, source]);
};

/**
 * Get the group reference for the source options. This should be transposed to match the current data model location.
 */
function useGroupReference(source: IOptionSource | undefined, node: LayoutNode): IDataModelReference | undefined {
  const currentLayoutSet = useCurrentLayoutSet();
  const transposeSelector = useDataModelBindingTranspose();
  if (!source) {
    return undefined;
  }

  const { group, dataType } = source;
  const cleanGroup = getKeyWithoutIndexIndicators(group);
  const groupDataType = dataType ?? currentLayoutSet?.dataType;
  if (!groupDataType) {
    return undefined;
  }
  const rawReference: IDataModelReference = { dataType: groupDataType, field: cleanGroup };
  const groupReference = transposeSelector(node, rawReference);
  if (!groupReference) {
    return undefined;
  }

  return groupReference;
}

/**
 * This finds the sub-path within the group binding that is used to pick the value for source options. Let's say
 * you have this setup:
 *   "source": {
 *     "group": "Person",
 *     "value": "Person[{0}].Info.ID",
 *     ...
 *   }
 *
 * The value sub-path would be "Info.ID".
 */
function getValueSubPath(source: IOptionSource | undefined): string | undefined {
  if (!source) {
    return undefined;
  }

  const cleanValue = getKeyWithoutIndexIndicators(source.value);
  const cleanGroup = getKeyWithoutIndexIndicators(source.group);
  return cleanValue.startsWith(`${cleanGroup}.`) ? cleanValue.substring(cleanGroup.length + 1) : undefined;
}

/**
 * Resolve text expressions in source options (potentially running expressions).
 */
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
