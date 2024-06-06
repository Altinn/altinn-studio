import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { asExpression } from 'src/features/expressions/validation';
import { useAsRef } from 'src/hooks/useAsRef';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { getKeyWithoutIndexIndicators } from 'src/utils/databindings';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import { useExpressionDataSources } from 'src/utils/layout/hierarchy';
import { useIsHiddenComponent } from 'src/utils/layout/NodesContext';
import { memoize } from 'src/utils/memoize';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IOptionSourceExternal } from 'src/layout/common.generated';
import type { HierarchyDataSources } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface IUseSourceOptionsArgs {
  source: IOptionSourceExternal | undefined;
  node: LayoutNode;
}

export const useSourceOptions = ({ source, node }: IUseSourceOptionsArgs): IOptionInternal[] | undefined => {
  const isHidden = useIsHiddenComponent();
  const dataSources = useExpressionDataSources(isHidden);
  const nodeAsRef = useAsRef(node);

  return useMemoDeepEqual(
    () => getSourceOptions({ source, node: nodeAsRef.current, dataSources }),
    [source, nodeAsRef, dataSources],
  );
};

interface IGetSourceOptionsArgs extends IUseSourceOptionsArgs {
  dataSources: HierarchyDataSources;
}

export function getSourceOptions({ source, node, dataSources }: IGetSourceOptionsArgs): IOptionInternal[] | undefined {
  if (!source) {
    return undefined;
  }

  const { formDataSelector, langToolsSelector } = dataSources;
  const langTools = langToolsSelector(node);
  const { group, value, label, helpText, description } = source;
  const cleanValue = getKeyWithoutIndexIndicators(value);
  const cleanGroup = getKeyWithoutIndexIndicators(group);
  const groupPath = node.transposeDataModel(cleanGroup) || group;
  const output: IOptionInternal[] = [];

  if (groupPath) {
    const groupData = formDataSelector(groupPath);
    if (groupData && Array.isArray(groupData)) {
      for (const idx in groupData) {
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
        const modifiedDataSources: HierarchyDataSources = {
          ...dataSources,
          langToolsSelector: () => ({
            ...langTools,
            langAsString: (key: string) => langTools.langAsStringUsingPathInDataModel(key, path),
            langAsNonProcessedString: (key: string) =>
              langTools.langAsNonProcessedStringUsingPathInDataModel(key, path),
          }),
        };

        const config = {
          defaultValue: '',
          returnType: ExprVal.String,
          resolvePerRow: false,
        };

        const memoizedAsExpression = memoize(asExpression);

        const labelExpression = memoizedAsExpression(label, config);
        const descriptionExpression = memoizedAsExpression(description, config);
        const helpTextExpression = memoizedAsExpression(helpText, config);

        output.push({
          value: String(formDataSelector(valuePath)),
          label:
            label && !Array.isArray(label)
              ? langTools.langAsStringUsingPathInDataModel(label, path)
              : Array.isArray(labelExpression)
                ? evalExpr(labelExpression, node, modifiedDataSources)
                : undefined,
          description:
            description && !Array.isArray(description)
              ? langTools.langAsStringUsingPathInDataModel(description, path)
              : Array.isArray(descriptionExpression)
                ? evalExpr(descriptionExpression, node, modifiedDataSources)
                : undefined,
          helpText:
            helpText && !Array.isArray(helpText)
              ? langTools.langAsStringUsingPathInDataModel(helpText, path)
              : Array.isArray(helpTextExpression)
                ? evalExpr(helpTextExpression, node, modifiedDataSources)
                : undefined,
        });
      }
    }
  }

  return output;
}
