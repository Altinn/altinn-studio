import { useContext, useMemo } from 'react';

import { useAppSelector } from 'src/common/hooks';
import { FormComponentContext } from 'src/components';
import { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import {
  evalExprInObj,
  ExprDefaultsForComponent,
  ExprDefaultsForGroup,
} from 'src/features/expressions/index';
import { useLayoutsAsNodes } from 'src/utils/layout/useLayoutsAsNodes';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { EvalExprInObjArgs } from 'src/features/expressions/index';
import type {
  ExprDefaultValues,
  ExprResolved,
} from 'src/features/expressions/types';
import type { ILayoutComponentOrGroup } from 'src/features/form/layout';

import { buildInstanceContext } from 'altinn-shared/utils/instanceContext';

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
}

/**
 * React hook used to resolve expressions from a component (usually in layout definitions). This
 * should be used inside a form component context.
 *
 * @param input Any input, object, value from the layout definitions, possibly containing expressions somewhere.
 *  This hook will look through the input (and recurse through objects), looking for expressions and resolve
 *  them to provide you with the base out value for the current component context.
 * @param options Optional options (see their own docs)
 */
export function useExpressions<T>(
  input: T,
  options?: UseExpressionsOptions<T>,
): ExprResolved<T> {
  const component = useContext(FormComponentContext);
  const nodes = useLayoutsAsNodes();
  const formData = useAppSelector((state) => state.formData?.formData);
  const applicationSettings = useAppSelector(
    (state) => state.applicationSettings?.applicationSettings,
  );
  const instance = useAppSelector((state) => state.instanceData?.instance);
  const instanceContext = buildInstanceContext(instance);
  const id = (options && options.forComponentId) || component.id;

  const node = useMemo(() => {
    const foundNode = nodes.findComponentById(id);
    if (foundNode) {
      return foundNode;
    }

    return new NodeNotFoundWithoutContext(id);
  }, [nodes, id]);

  const dataSources = useMemo(
    (): ContextDataSources => ({
      instanceContext,
      applicationSettings,
      formData,
    }),
    [instanceContext, applicationSettings, formData],
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

const componentDefaults: any = {
  ...ExprDefaultsForComponent,
  ...ExprDefaultsForGroup,
};

export function useExpressionsForComponent<T extends ILayoutComponentOrGroup>(
  input: T,
  options?: Omit<UseExpressionsOptions<T>, 'defaults'>,
): ExprResolved<T> {
  const newOptions = useMemo(
    () => ({
      ...options,
      defaults: componentDefaults,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    Object.values(options),
  );

  return useExpressions(input, newOptions);
}
