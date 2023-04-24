import React, { useEffect } from 'react';

import cn from 'classnames';

import classes from 'src/features/devtools/components/ExpressionPlayground/ExpressionPlayground.module.css';
import { SplitView } from 'src/features/devtools/components/SplitView/SplitView';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { asExpression } from 'src/features/expressions/validation';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { dataSourcesFromState, resolvedLayoutsFromState } from 'src/utils/layout/hierarchy';
import type { ExprConfig, Expression } from 'src/features/expressions/types';
import type { IAltinnWindow } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';
export const ExpressionPlayground = () => {
  const [input, setInput] = React.useState('');
  const [output, setOutput] = React.useState('');
  const [isError, setIsError] = React.useState(false);

  const formData = useAppSelector((state) => state.formData.formData);

  useEffect(() => {
    if (input.length <= 0) {
      setOutput('');
      setIsError(false);
      return;
    }

    try {
      let maybeExpression: string;
      try {
        maybeExpression = JSON.parse(input);
      } catch (e) {
        if (e instanceof Error) {
          throw new Error(`Ugyldig JSON: ${e.message}`);
        } else {
          throw new Error('Ugyldig JSON');
        }
      }
      const forComponentId = null;

      const config: ExprConfig<ExprVal.Any> = {
        returnType: ExprVal.Any,
        defaultValue: null,
        resolvePerRow: false,
        errorAsException: true,
      };

      const expr = asExpression(maybeExpression, config);
      if (!expr) {
        throw new Error('Ugyldig uttrykk');
      }

      const state = (window as unknown as IAltinnWindow).reduxStore.getState();
      const nodes = resolvedLayoutsFromState(state);
      let layout: LayoutPage | LayoutNode | undefined = nodes?.current();
      if (!layout) {
        throw new Error('Fant ikke nåværende side/layout');
      }

      if (forComponentId) {
        const foundNode = nodes?.findById(forComponentId);
        if (!foundNode) {
          throw new Error(`
              Fant ingen komponent med id:
              ${forComponentId}\n
              Tilgjengelige komponenter på nåværende side:
             ${layout?.flat(true).map((c) => c.item.id)}
            `);
        }
        layout = foundNode;
      }

      const dataSources = dataSourcesFromState(state);
      const out = evalExpr(expr as Expression, layout, dataSources, { config });
      setOutput(out);
      setIsError(false);
    } catch (e) {
      setOutput(e.message);
      setIsError(true);
    }
  }, [input, formData]);

  return (
    <div className={classes.container}>
      <SplitView direction='column'>
        <textarea
          className={cn(classes.textbox, classes.input)}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <textarea
          style={{ color: isError ? 'red' : 'black' }}
          className={cn(classes.textbox, classes.output)}
          readOnly={true}
          value={output}
        />
      </SplitView>
    </div>
  );
};
