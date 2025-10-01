import dot from 'dot-object';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { useCurrentLayoutSet } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLanguage } from 'src/features/language/useLanguage';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { getKeyWithoutIndexIndicators } from 'src/utils/databindings';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import { useCurrentDataModelLocation } from 'src/utils/layout/DataModelLocation';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IDataModelReference, IOptionSource } from 'src/layout/common.generated';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

export const useSourceOptions = (source: IOptionSource): IOptionInternal[] => {
  const langTools = useLanguage();
  const groupReference = useGroupReference(source);
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
    if (!rawValues || rawValues.length === 0) {
      return [];
    }

    const { label, helpText, description } = source;
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
        label: resolveText(label, modifiedDataSources, dataModelLocation) as string,
        description: resolveText(description, modifiedDataSources, dataModelLocation),
        helpText: resolveText(helpText, modifiedDataSources, dataModelLocation),
      });
    }

    return output;
  }, [dataSources, langTools, rawValues, source]);
};

/**
 * Get the group reference for the source options. This should be transposed to match the current data model location.
 */
function useGroupReference(source: IOptionSource | undefined): IDataModelReference | undefined {
  const currentLocation = useCurrentDataModelLocation();
  const currentLayoutSet = useCurrentLayoutSet();
  if (!source) {
    return undefined;
  }

  const { group, dataType } = source;
  const cleanGroup = getKeyWithoutIndexIndicators(group);
  const groupDataType = dataType ?? currentLayoutSet?.dataType;
  if (!groupDataType) {
    return undefined;
  }
  const untransposed: IDataModelReference = { dataType: groupDataType, field: cleanGroup };
  if (!currentLocation) {
    return untransposed;
  }

  return transposeDataBinding({ subject: untransposed, currentLocation });
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
  dataSources: ExpressionDataSources,
  reference: IDataModelReference,
): string | undefined {
  if (text && ExprValidation.isValid(text)) {
    return evalExpr(
      text as ExprValToActualOrExpr<ExprVal.String>,
      { ...dataSources, currentDataModelPath: reference },
      { returnType: ExprVal.String, defaultValue: '' },
    );
  }
  if (text) {
    return dataSources.langToolsSelector(reference).langAsStringUsingPathInDataModel(text as string, reference);
  }
  return undefined;
}
