import { useMemo } from 'react';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import type { SimpleEval } from 'src/features/expressions';
import type { ExprResolved, ExprValToActual, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { FormComponentProps, SummarizableComponentProps } from 'src/layout/common.generated';
import type { CompIntermediate, CompIntermediateExact, CompTypes, ITextResourceBindings } from 'src/layout/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

/**
 * Creates props for the expression resolver that can be used to evaluate expressions in a component configuration.
 * These props are passed on to your component's `evalExpressions` method.
 */
export function useExpressionResolverProps<T extends CompTypes>(
  errorIntroText: string,
  rawItem: CompIntermediateExact<T> | undefined,
  allDataSources: ExpressionDataSources,
): ExprResolver<T> {
  // The hidden property is handled elsewhere, and should never be passed to the item (and resolved as an
  // expression) which could be read. Try useIsHidden() or useIsHiddenSelector() if you need to know if a
  // component is hidden.
  const item = useMemo(() => {
    const { hidden: _hidden, ...rest } = rawItem ?? {};
    return rest;
  }, [rawItem]) as CompIntermediate<T>;

  const evalProto = <T extends ExprVal>(
    type: T,
    expr: ExprValToActualOrExpr<T> | undefined,
    defaultValue: ExprValToActual<T>,
    dataSources?: Partial<ExpressionDataSources>,
  ) => {
    if (!ExprValidation.isValidOrScalar(expr, type, errorIntroText)) {
      return defaultValue;
    }

    return evalExpr(expr, { ...allDataSources, ...dataSources }, { returnType: type, defaultValue, errorIntroText });
  };

  const evalBool: SimpleEval<ExprVal.Boolean> = (expr, defaultValue, dataSources) =>
    evalProto(ExprVal.Boolean, expr, defaultValue, dataSources);
  const evalStr: SimpleEval<ExprVal.String> = (expr, defaultValue, dataSources) =>
    evalProto(ExprVal.String, expr, defaultValue, dataSources);
  const evalNum: SimpleEval<ExprVal.Number> = (expr, defaultValue, dataSources) =>
    evalProto(ExprVal.Number, expr, defaultValue, dataSources);
  const evalAny: SimpleEval<ExprVal.Any> = (expr, defaultValue, dataSources) =>
    evalProto(ExprVal.Any, expr, defaultValue, dataSources);

  const evalBase = () => {
    const { hidden: _hidden, ...rest } = item;
    return {
      ...rest,
      ...(rest.pageBreak
        ? {
            pageBreak: {
              breakBefore: evalStr(rest.pageBreak.breakBefore, 'auto'),
              breakAfter: evalStr(rest.pageBreak.breakAfter, 'auto'),
            },
          }
        : {}),
    };
  };

  const evalFormProps = () => {
    const out: ExprResolved<FormComponentProps> = {};
    if (isFormItem(item)) {
      if (Array.isArray(item.required)) {
        out.required = evalBool(item.required, false);
      }
      if (Array.isArray(item.readOnly)) {
        out.readOnly = evalBool(item.readOnly, false);
      }
    }

    return out;
  };

  const evalSummarizable = () => {
    const out: ExprResolved<SummarizableComponentProps> = {};
    if (isSummarizableItem(item) && Array.isArray(item.forceShowInSummary)) {
      out.forceShowInSummary = evalBool(item.forceShowInSummary, false);
    }

    return out;
  };

  const evalTrb = () => {
    const trb: Record<string, string> = {};
    if (item.textResourceBindings) {
      for (const [key, value] of Object.entries(item.textResourceBindings)) {
        trb[key] = evalStr(value, '');
      }
    }

    return {
      textResourceBindings: (item.textResourceBindings ? trb : undefined) as ExprResolved<ITextResourceBindings<T>>,
    };
  };

  return { item, evalBool, evalNum, evalStr, evalAny, evalBase, evalFormProps, evalSummarizable, evalTrb };
}

function isFormItem(item: CompIntermediate): item is CompIntermediate & FormComponentProps {
  return 'readOnly' in item || 'required' in item || 'showValidations' in item;
}

function isSummarizableItem(item: CompIntermediate): item is CompIntermediate & SummarizableComponentProps {
  return 'renderAsSummary' in item;
}
