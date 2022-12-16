import { useContext, useMemo } from 'react';

import { useAppSelector } from 'src/common/hooks';
import { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { evalExprInObj, ExprDefaultsForComponent, ExprDefaultsForGroup } from 'src/features/expressions/index';
import { FormComponentContext } from 'src/layout';
import { getInstanceContextSelector } from 'src/utils/instanceContext';
import { useLayoutsAsNodes } from 'src/utils/layout/useLayoutsAsNodes';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { EvalExprInObjArgs } from 'src/features/expressions/index';
import type { ExprDefaultValues, ExprResolved } from 'src/features/expressions/types';
import type { ILayoutComponentOrGroup } from 'src/layout/layout';
import type { IInstanceContext } from 'src/types/shared';

export interface UseExpressionsOptions<T> {
  /**
   * The component ID for the current component context. Usually optional, as it will be fetched from
   * the FormComponentContext if not given.
   */
  forComponentId?: string;

  /**
   * Default values in case the expression evaluation fails. If this is not given, a failing expression will throw
   * an exception and fail hard. If you provide default values for your expressions, a failing expression will instead
   * print out a pretty error message to the console explaining what went wrong - and continue by using the default
   * value instead.
   */
  defaults?: ExprDefaultValues<T>;

  /**
   * The index of a repeating group row that the expression should run for. Only applicable when the component
   * running expression for is a group-component.
   */
  rowIndex?: number;
}

/**
 * React hook used to resolve expressions from a component (usually in layout definitions). This
 * should be used inside a form component context.
 *
 * @param input Any input, object, value from the layout definitions, possibly containing expressions somewhere.
 *  This hook will look through the input (and recurse through objects), looking for expressions and resolve
 *  them to provide you with the base out value for the current component context.
 * @param _options Optional options (see their own docs)
 */
export function useExpressions<T>(input: T, _options?: UseExpressionsOptions<T>): ExprResolved<T> {
  // The options argument is an object, so it's natural to create a new one each time this function is called. As
  // the equality function in React will assume a new object reference is an entirely new object, we'll memoize this
  // argument as to prevent infinite looping when given a new (but identical) options argument.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => _options, [JSON.stringify(_options)]);

  const component = useContext(FormComponentContext);
  const nodes = useLayoutsAsNodes();
  const formData = useAppSelector((state) => state.formData?.formData);
  const applicationSettings = useAppSelector((state) => state.applicationSettings?.applicationSettings);
  const hiddenFields = useAppSelector((state) => state.formLayout.uiConfig.hiddenFields);
  const instanceContextSelector = getInstanceContextSelector();
  const instanceContext: IInstanceContext = useAppSelector(instanceContextSelector);
  const id = (options && options.forComponentId) || component.id;
  const rowIndex: number | undefined = options && options.rowIndex;

  const node = useMemo(() => {
    if (id) {
      const foundNode = nodes.findById(id);
      if (typeof rowIndex == 'number' && foundNode && foundNode.item.type == 'Group') {
        return foundNode.children(undefined, rowIndex)[0];
      }
      if (foundNode) {
        return foundNode;
      }
    }

    return new NodeNotFoundWithoutContext(id);
  }, [nodes, id, rowIndex]);

  const dataSources = useMemo(
    (): ContextDataSources => ({
      instanceContext,
      applicationSettings,
      formData,
      hiddenFields: new Set(hiddenFields),
    }),
    [instanceContext, applicationSettings, formData, hiddenFields],
  );

  return useMemo(() => {
    return evalExprInObj({
      ...(options as Pick<UseExpressionsOptions<T>, 'defaults'>),
      input,
      node,
      dataSources,
    } as EvalExprInObjArgs<T>) as ExprResolved<T>;
  }, [dataSources, input, node, options]);
}

let componentDefaults: any = undefined;
function getComponentDefaults(): any {
  // The default values can be stored in the variable above, but it cannot be constructed as soon as this
  // file is imported, as that relies on the global import order (and may start to fail if files are moved around).
  if (componentDefaults === undefined) {
    componentDefaults = {
      ...ExprDefaultsForComponent,
      ...ExprDefaultsForGroup,
    };
  }

  return componentDefaults;
}

export function useExpressionsForComponent<T extends ILayoutComponentOrGroup | undefined | null>(
  input: T,
): ExprResolved<T> {
  const defaults = getComponentDefaults();
  return useExpressions(input, {
    forComponentId: (typeof input === 'object' && input !== null && input.id) || undefined,
    defaults,
  });
}
