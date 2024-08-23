import { evalExpr } from 'src/features/expressions';
import { ExprValidation } from 'src/features/expressions/validation';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { getKeyWithoutIndexIndicators } from 'src/utils/databindings';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IOptionSource } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

interface IUseSourceOptionsArgs {
  source: IOptionSource | undefined;
  node: LayoutNode;
}

export const useSourceOptions = ({ source, node }: IUseSourceOptionsArgs): IOptionInternal[] | undefined => {
  const dataSources = useExpressionDataSources();

  return useMemoDeepEqual(() => {
    if (!source) {
      return undefined;
    }

    const { formDataRowsSelector, formDataSelector, langToolsSelector } = dataSources;
    const langTools = langToolsSelector(node);
    const { group, value, label, helpText, description } = source;
    const cleanValue = getKeyWithoutIndexIndicators(value);
    const cleanGroup = getKeyWithoutIndexIndicators(group);
    const groupPath = dataSources.transposeSelector(node, cleanGroup) || group;
    const output: IOptionInternal[] = [];

    if (!groupPath) {
      return output;
    }
    const groupRows = formDataRowsSelector(groupPath);
    if (!groupRows.length) {
      return output;
    }

    for (const idx in groupRows) {
      const path = `${groupPath}[${idx}]`;
      const valuePath = transposeDataBinding({ subject: cleanValue, currentLocation: path });

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
          langAsString: (key: string) => langTools.langAsStringUsingPathInDataModel(key, path),
          langAsNonProcessedString: (key: string) => langTools.langAsNonProcessedStringUsingPathInDataModel(key, path),
        }),
      };

      output.push({
        value: String(formDataSelector(valuePath)),
        label: resolveText(label, node, modifiedDataSources, path) as string,
        description: resolveText(description, node, modifiedDataSources, path),
        helpText: resolveText(helpText, node, modifiedDataSources, path),
      });
    }

    return output;
  }, [source, node, dataSources]);
};

function resolveText(
  text: ExprValToActualOrExpr<ExprVal.String> | undefined,
  node: LayoutNode,
  dataSources: ExpressionDataSources,
  path: string,
): string | undefined {
  if (text && ExprValidation.isValid(text)) {
    return evalExpr(text, node, dataSources);
  }
  if (text) {
    return dataSources.langToolsSelector(node).langAsStringUsingPathInDataModel(text as string, path);
  }
  return undefined;
}
